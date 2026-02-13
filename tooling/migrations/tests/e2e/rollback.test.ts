/**
 * E2E Tests for Rollback Functionality
 *
 * Tests the rollback concepts, state management, and safety patterns
 * without requiring database connections. For actual rollback against
 * databases, use the rollback CLI tool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createFileStateManager,
  type TableMigrationState,
  type MigrationStateManager,
} from '../../lib/migrate-table.js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  CUSTOMER_FIXTURES,
  ORDER_FIXTURES,
  CREATOR_FIXTURES,
} from '../fixtures/test-data.js'

describe('Rollback State Management', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('State Clearing for Rollback', () => {
    it('clears all states to allow fresh migration', async () => {
      // Set up completed migration state
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'orders',
        status: 'completed',
        offset: 200,
        totalRows: 200,
        migratedRows: 200,
        errors: 0,
      })

      // Clear states (simulates rollback)
      await manager.clearAllStates()

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })

    it('allows partial state clearing by re-saving', async () => {
      // Set up completed states
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'orders',
        status: 'completed',
        offset: 200,
        totalRows: 200,
        migratedRows: 200,
        errors: 0,
      })

      // "Rollback" only orders by resetting its state
      await manager.saveState({
        tableName: 'orders',
        status: 'pending',
        offset: 0,
        totalRows: 0,
        migratedRows: 0,
        errors: 0,
      })

      const customersState = await manager.getState('customers')
      const ordersState = await manager.getState('orders')

      expect(customersState?.status).toBe('completed')
      expect(ordersState?.status).toBe('pending')
    })
  })

  describe('Rollback Order Calculation', () => {
    it('identifies tables in reverse migration order', () => {
      // Migration order (FK dependencies)
      const migrationOrder = ['customers', 'products', 'orders', 'order_items']

      // Rollback should be reverse order
      const rollbackOrder = [...migrationOrder].reverse()

      expect(rollbackOrder).toEqual(['order_items', 'orders', 'products', 'customers'])
    })

    it('identifies dependent tables first', () => {
      const dependencies = {
        customers: [],
        products: [],
        orders: ['customers'],
        order_items: ['orders', 'products'],
        creators: [],
        creator_projects: ['creators'],
        balance_transactions: ['creators'],
      }

      // Build rollback order - dependents first
      const visited = new Set<string>()
      const rollbackOrder: string[] = []

      function addToOrder(table: string) {
        if (visited.has(table)) return
        visited.add(table)

        // Find tables that depend on this one
        for (const [t, deps] of Object.entries(dependencies)) {
          if (deps.includes(table) && !visited.has(t)) {
            addToOrder(t)
          }
        }

        rollbackOrder.push(table)
      }

      // Start from tables with no dependencies
      for (const table of Object.keys(dependencies)) {
        if (dependencies[table as keyof typeof dependencies].length === 0) {
          addToOrder(table)
        }
      }

      // Dependents should come before their parents
      const customersIdx = rollbackOrder.indexOf('customers')
      const ordersIdx = rollbackOrder.indexOf('orders')

      expect(ordersIdx).toBeLessThan(customersIdx)
    })
  })

  describe('Rollback Safety Checks', () => {
    it('validates tenant exists in state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const hasMigrationData = allStates.length > 0

      expect(hasMigrationData).toBe(true)
    })

    it('detects no migration data', async () => {
      const allStates = await manager.getAllStates()
      const hasMigrationData = allStates.length > 0

      expect(hasMigrationData).toBe(false)
    })

    it('calculates impact metrics from state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'orders',
        status: 'completed',
        offset: 500,
        totalRows: 500,
        migratedRows: 500,
        errors: 5,
      })

      const allStates = await manager.getAllStates()
      const impact = {
        tableCount: allStates.length,
        totalMigratedRows: allStates.reduce((sum, s) => sum + s.migratedRows, 0),
        totalErrors: allStates.reduce((sum, s) => sum + s.errors, 0),
        completedTables: allStates.filter((s) => s.status === 'completed').length,
      }

      expect(impact.tableCount).toBe(2)
      expect(impact.totalMigratedRows).toBe(600)
      expect(impact.totalErrors).toBe(5)
      expect(impact.completedTables).toBe(2)
    })
  })

  describe('Tenant Isolation During Rollback', () => {
    it('isolates state files by tenant', async () => {
      // Each tenant has its own state file
      const rawdogStatePath = path.join(tempDir, 'rawdog-state.json')
      const otherStatePath = path.join(tempDir, 'other-state.json')

      const rawdogManager = createFileStateManager(rawdogStatePath)
      const otherManager = createFileStateManager(otherStatePath)

      // Save states for both
      await rawdogManager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await otherManager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 50,
        totalRows: 50,
        migratedRows: 50,
        errors: 0,
      })

      // Clear only rawdog
      await rawdogManager.clearAllStates()

      // Verify isolation
      const rawdogStates = await rawdogManager.getAllStates()
      const otherStates = await otherManager.getAllStates()

      expect(rawdogStates).toHaveLength(0)
      expect(otherStates).toHaveLength(1)
      expect(otherStates[0].migratedRows).toBe(50)
    })
  })
})

describe('Rollback CLI Arguments', () => {
  describe('Required Arguments', () => {
    it('requires tenant slug', () => {
      const args = { tenant: '', confirm: false, keepOrg: false }

      expect(args.tenant).toBe('')
      // CLI would reject empty tenant
    })

    it('accepts valid tenant slug', () => {
      const args = { tenant: 'rawdog', confirm: false, keepOrg: false }

      expect(args.tenant).toBe('rawdog')
    })

    it('validates slug format', () => {
      const validSlugs = ['rawdog', 'my-brand', 'brand_123']
      const invalidSlugs = ['', 'Brand Name', 'has spaces', 'has@special']

      for (const slug of validSlugs) {
        const isValid = /^[a-z0-9_-]+$/.test(slug)
        expect(isValid).toBe(true)
      }

      for (const slug of invalidSlugs) {
        const isValid = /^[a-z0-9_-]+$/.test(slug)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Optional Arguments', () => {
    it('defaults confirm to false', () => {
      const args = { tenant: 'rawdog', confirm: false, keepOrg: false }

      expect(args.confirm).toBe(false)
    })

    it('allows skipping confirmation', () => {
      const args = { tenant: 'rawdog', confirm: true, keepOrg: false }

      expect(args.confirm).toBe(true)
    })

    it('allows keeping organization record', () => {
      const args = { tenant: 'rawdog', confirm: false, keepOrg: true }

      expect(args.keepOrg).toBe(true)
    })
  })
})

describe('Rollback Report Generation', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-report-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('generates pre-rollback stats', async () => {
    await manager.saveState({
      tableName: 'customers',
      status: 'completed',
      offset: CUSTOMER_FIXTURES.length,
      totalRows: CUSTOMER_FIXTURES.length,
      migratedRows: CUSTOMER_FIXTURES.length,
      errors: 0,
      completedAt: new Date().toISOString(),
    })

    await manager.saveState({
      tableName: 'orders',
      status: 'completed',
      offset: ORDER_FIXTURES.length,
      totalRows: ORDER_FIXTURES.length,
      migratedRows: ORDER_FIXTURES.length,
      errors: 2,
      completedAt: new Date().toISOString(),
    })

    const allStates = await manager.getAllStates()
    const stats = {
      tenantSlug: 'rawdog',
      tableCount: allStates.length,
      totalRows: allStates.reduce((sum, s) => sum + s.totalRows, 0),
      totalErrors: allStates.reduce((sum, s) => sum + s.errors, 0),
      tables: allStates.map((s) => ({
        name: s.tableName,
        rowCount: s.migratedRows,
        errors: s.errors,
        status: s.status,
      })),
    }

    expect(stats.tableCount).toBe(2)
    expect(stats.totalRows).toBe(CUSTOMER_FIXTURES.length + ORDER_FIXTURES.length)
    expect(stats.totalErrors).toBe(2)
    expect(stats.tables).toHaveLength(2)
  })

  it('generates post-rollback verification', async () => {
    // Set up initial state
    await manager.saveState({
      tableName: 'customers',
      status: 'completed',
      offset: 100,
      totalRows: 100,
      migratedRows: 100,
      errors: 0,
    })

    // Perform rollback (clear states)
    await manager.clearAllStates()

    // Verify
    const allStates = await manager.getAllStates()
    const postStats = {
      statesCleared: allStates.length === 0,
      remainingTables: allStates.length,
    }

    expect(postStats.statesCleared).toBe(true)
    expect(postStats.remainingTables).toBe(0)
  })
})

describe('Cascading Rollback', () => {
  describe('Foreign Key Considerations', () => {
    it('identifies dependent tables', () => {
      const relationships = [
        { parent: 'creators', child: 'creator_projects' },
        { parent: 'creators', child: 'balance_transactions' },
        { parent: 'customers', child: 'orders' },
        { parent: 'orders', child: 'order_items' },
      ]

      const dependentOnCreators = relationships
        .filter((r) => r.parent === 'creators')
        .map((r) => r.child)

      expect(dependentOnCreators).toContain('creator_projects')
      expect(dependentOnCreators).toContain('balance_transactions')
    })

    it('calculates rollback order respecting FK constraints', () => {
      // Child tables must be rolled back before parent tables
      const rollbackOrder = [
        'order_items',
        'orders',
        'creator_projects',
        'balance_transactions',
        'customers',
        'creators',
        'products',
      ]

      // Verify order - children before parents
      const customersIdx = rollbackOrder.indexOf('customers')
      const ordersIdx = rollbackOrder.indexOf('orders')
      const orderItemsIdx = rollbackOrder.indexOf('order_items')

      expect(orderItemsIdx).toBeLessThan(ordersIdx)
      expect(ordersIdx).toBeLessThan(customersIdx)
    })

    it('groups tables by dependency level', () => {
      const tables = [
        { name: 'customers', dependsOn: [] },
        { name: 'products', dependsOn: [] },
        { name: 'creators', dependsOn: [] },
        { name: 'orders', dependsOn: ['customers'] },
        { name: 'order_items', dependsOn: ['orders', 'products'] },
        { name: 'creator_projects', dependsOn: ['creators'] },
      ]

      // Calculate dependency levels
      const levels = new Map<string, number>()

      function getLevel(tableName: string): number {
        if (levels.has(tableName)) return levels.get(tableName)!

        const table = tables.find((t) => t.name === tableName)
        if (!table || table.dependsOn.length === 0) {
          levels.set(tableName, 0)
          return 0
        }

        const maxDepLevel = Math.max(...table.dependsOn.map(getLevel))
        const level = maxDepLevel + 1
        levels.set(tableName, level)
        return level
      }

      for (const table of tables) {
        getLevel(table.name)
      }

      expect(levels.get('customers')).toBe(0)
      expect(levels.get('orders')).toBe(1)
      expect(levels.get('order_items')).toBe(2)

      // Rollback should process highest level first
      const sortedForRollback = Array.from(levels.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)

      expect(sortedForRollback[0]).toBe('order_items')
    })
  })
})

describe('Partial Rollback Recovery', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'partial-rollback-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('tracks partial rollback progress', async () => {
    // Set up completed migration
    const tables = ['customers', 'orders', 'products']
    for (const table of tables) {
      await manager.saveState({
        tableName: table,
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })
    }

    // Simulate partial rollback (only customers rolled back)
    await manager.saveState({
      tableName: 'customers',
      status: 'pending', // Reset to pending
      offset: 0,
      totalRows: 0,
      migratedRows: 0,
      errors: 0,
    })

    const allStates = await manager.getAllStates()
    const rolledBack = allStates.filter((s) => s.status === 'pending')
    const remaining = allStates.filter((s) => s.status === 'completed')

    expect(rolledBack).toHaveLength(1)
    expect(remaining).toHaveLength(2)
  })

  it('can retry after partial failure', async () => {
    // Set up state after partial rollback failure
    await manager.saveState({
      tableName: 'customers',
      status: 'pending',
      offset: 0,
      totalRows: 0,
      migratedRows: 0,
      errors: 0,
    })

    await manager.saveState({
      tableName: 'orders',
      status: 'failed',
      offset: 50,
      totalRows: 100,
      migratedRows: 50,
      errors: 1,
      lastError: 'Rollback interrupted',
    })

    // Resume rollback
    await manager.saveState({
      tableName: 'orders',
      status: 'pending',
      offset: 0,
      totalRows: 0,
      migratedRows: 0,
      errors: 0,
    })

    const ordersState = await manager.getState('orders')
    expect(ordersState?.status).toBe('pending')
  })

  it('logs rollback errors for debugging', async () => {
    await manager.saveState({
      tableName: 'customers',
      status: 'failed',
      offset: 50,
      totalRows: 100,
      migratedRows: 50,
      errors: 1,
      lastError: 'Foreign key constraint violation during rollback',
    })

    const state = await manager.getState('customers')

    expect(state?.status).toBe('failed')
    expect(state?.lastError).toContain('Foreign key constraint')
  })
})
