/**
 * E2E Tests for Migration State Management
 *
 * Tests the file-based state manager, progress tracking,
 * and migration workflow without requiring database connections.
 *
 * For full integration tests with real databases, see the integration
 * test suite or run the migration with --dry-run against test databases.
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

describe('File State Manager', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('Basic Operations', () => {
    it('creates state manager instance', () => {
      expect(manager).toBeDefined()
      expect(typeof manager.getState).toBe('function')
      expect(typeof manager.saveState).toBe('function')
      expect(typeof manager.getAllStates).toBe('function')
      expect(typeof manager.clearAllStates).toBe('function')
    })

    it('saves and retrieves state', async () => {
      const state: TableMigrationState = {
        tableName: 'customers',
        status: 'in_progress',
        offset: 500,
        totalRows: 1000,
        migratedRows: 500,
        errors: 0,
        startedAt: new Date().toISOString(),
      }

      await manager.saveState(state)
      const retrieved = await manager.getState('customers')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.tableName).toBe('customers')
      expect(retrieved?.offset).toBe(500)
      expect(retrieved?.status).toBe('in_progress')
    })

    it('returns null for non-existent state', async () => {
      const state = await manager.getState('nonexistent')
      expect(state).toBeNull()
    })

    it('gets all states', async () => {
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
        status: 'in_progress',
        offset: 50,
        totalRows: 200,
        migratedRows: 50,
        errors: 1,
      })

      const allStates = await manager.getAllStates()

      expect(allStates).toHaveLength(2)
      expect(allStates.map((s) => s.tableName)).toContain('customers')
      expect(allStates.map((s) => s.tableName)).toContain('orders')
    })

    it('clears all states', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.clearAllStates()

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })
  })

  describe('Persistence', () => {
    it('persists state to file', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      expect(fs.existsSync(stateFilePath)).toBe(true)

      const manager2 = createFileStateManager(stateFilePath)
      const state = await manager2.getState('customers')

      expect(state).not.toBeNull()
      expect(state?.status).toBe('completed')
    })

    it('handles corrupted state file', async () => {
      fs.writeFileSync(stateFilePath, 'not valid json')

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })

    it('creates parent directories if needed', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', '.state.json')
      const nestedManager = createFileStateManager(nestedPath)

      await nestedManager.saveState({
        tableName: 'test',
        status: 'pending',
        offset: 0,
        totalRows: 0,
        migratedRows: 0,
        errors: 0,
      })

      expect(fs.existsSync(nestedPath)).toBe(true)
    })
  })

  describe('State Updates', () => {
    it('updates existing state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 50,
        totalRows: 100,
        migratedRows: 50,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
        completedAt: new Date().toISOString(),
      })

      const state = await manager.getState('customers')
      expect(state?.status).toBe('completed')
      expect(state?.offset).toBe(100)
      expect(state?.completedAt).toBeDefined()
    })

    it('preserves other tables when updating one', async () => {
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
        status: 'in_progress',
        offset: 50,
        totalRows: 200,
        migratedRows: 50,
        errors: 0,
      })

      const customersState = await manager.getState('customers')
      const ordersState = await manager.getState('orders')

      expect(customersState?.status).toBe('completed')
      expect(ordersState?.status).toBe('in_progress')
    })
  })

  describe('Resume Logic', () => {
    it('identifies tables needing resume', async () => {
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
        status: 'in_progress',
        offset: 50,
        totalRows: 200,
        migratedRows: 50,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'products',
        status: 'pending',
        offset: 0,
        totalRows: 0,
        migratedRows: 0,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const needsResume = allStates.filter(
        (s) => s.status === 'in_progress' || s.status === 'pending'
      )

      expect(needsResume).toHaveLength(2)
      expect(needsResume.map((s) => s.tableName)).toContain('orders')
      expect(needsResume.map((s) => s.tableName)).toContain('products')
    })

    it('identifies completed tables to skip', async () => {
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

      const allStates = await manager.getAllStates()
      const completed = allStates.filter((s) => s.status === 'completed')

      expect(completed).toHaveLength(2)
    })

    it('calculates remaining work', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 250,
        totalRows: 1000,
        migratedRows: 250,
        errors: 5,
      })

      const state = await manager.getState('customers')
      const remainingRows = (state?.totalRows ?? 0) - (state?.migratedRows ?? 0)

      expect(remainingRows).toBe(750)
    })
  })

  describe('Error Tracking', () => {
    it('tracks error count and last error', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 50,
        totalRows: 100,
        migratedRows: 45,
        errors: 5,
        lastError: 'Constraint violation on row 47',
      })

      const state = await manager.getState('customers')

      expect(state?.errors).toBe(5)
      expect(state?.lastError).toBe('Constraint violation on row 47')
    })

    it('tracks failed status', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'failed',
        offset: 50,
        totalRows: 100,
        migratedRows: 50,
        errors: 10,
        lastError: 'Too many errors, migration aborted',
      })

      const state = await manager.getState('customers')

      expect(state?.status).toBe('failed')
    })
  })
})

describe('Migration Workflow', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('Fresh Migration', () => {
    it('starts with empty state', async () => {
      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })

    it('can clear state for fresh start', async () => {
      await manager.saveState({
        tableName: 'old_table',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.clearAllStates()

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })
  })

  describe('Migration Progress', () => {
    it('tracks progress through tables', async () => {
      const tables = ['customers', 'products', 'orders']

      // Simulate migration progress
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i]

        // Start table
        await manager.saveState({
          tableName: table,
          status: 'in_progress',
          offset: 0,
          totalRows: 100,
          migratedRows: 0,
          errors: 0,
          startedAt: new Date().toISOString(),
        })

        // Update progress
        await manager.saveState({
          tableName: table,
          status: 'in_progress',
          offset: 50,
          totalRows: 100,
          migratedRows: 50,
          errors: 0,
        })

        // Complete table
        await manager.saveState({
          tableName: table,
          status: 'completed',
          offset: 100,
          totalRows: 100,
          migratedRows: 100,
          errors: 0,
          completedAt: new Date().toISOString(),
        })
      }

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(3)
      expect(allStates.every((s) => s.status === 'completed')).toBe(true)
    })

    it('calculates overall progress', async () => {
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
        status: 'in_progress',
        offset: 50,
        totalRows: 200,
        migratedRows: 50,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const totalRows = allStates.reduce((sum, s) => sum + s.totalRows, 0)
      const migratedRows = allStates.reduce((sum, s) => sum + s.migratedRows, 0)
      const overallProgress = (migratedRows / totalRows) * 100

      expect(totalRows).toBe(300)
      expect(migratedRows).toBe(150)
      expect(overallProgress).toBe(50)
    })
  })

  describe('Multi-Table Dependencies', () => {
    it('determines migration order from completed tables', async () => {
      const migrationOrder = ['customers', 'products', 'orders', 'line_items']

      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      await manager.saveState({
        tableName: 'products',
        status: 'completed',
        offset: 50,
        totalRows: 50,
        migratedRows: 50,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const completedTables = new Set(
        allStates.filter((s) => s.status === 'completed').map((s) => s.tableName)
      )

      const nextTable = migrationOrder.find((t) => !completedTables.has(t))

      expect(nextTable).toBe('orders')
    })
  })
})
