/**
 * E2E Tests for Resumable Migration State
 *
 * Tests the resumability features of the migration state manager,
 * including interrupt recovery, checkpoint calculations, and
 * multi-session resume scenarios.
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

describe('Resumable Migration State', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resumable-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('State Persistence for Resume', () => {
    it('persists in_progress state with offset', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 500,
        totalRows: 1000,
        migratedRows: 500,
        errors: 0,
        startedAt: new Date().toISOString(),
      })

      // Simulate process restart by creating new manager
      const newManager = createFileStateManager(stateFilePath)
      const state = await newManager.getState('customers')

      expect(state).not.toBeNull()
      expect(state?.status).toBe('in_progress')
      expect(state?.offset).toBe(500)
    })

    it('tracks startedAt timestamp', async () => {
      const startTime = new Date().toISOString()

      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 0,
        totalRows: 1000,
        migratedRows: 0,
        errors: 0,
        startedAt: startTime,
      })

      const state = await manager.getState('customers')
      expect(state?.startedAt).toBe(startTime)
    })
  })

  describe('Resume Offset Calculation', () => {
    it('calculates resume offset from in_progress state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 250,
        totalRows: 1000,
        migratedRows: 250,
        errors: 0,
      })

      const state = await manager.getState('customers')
      const resumeOffset = state?.status === 'in_progress' ? state.offset : 0

      expect(resumeOffset).toBe(250)
    })

    it('returns 0 for completed tables', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 1000,
        totalRows: 1000,
        migratedRows: 1000,
        errors: 0,
      })

      const state = await manager.getState('customers')
      const resumeOffset = state?.status === 'in_progress' ? state.offset : 0

      expect(resumeOffset).toBe(0)
    })

    it('returns 0 for pending tables', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'pending',
        offset: 0,
        totalRows: 0,
        migratedRows: 0,
        errors: 0,
      })

      const state = await manager.getState('customers')
      const resumeOffset = state?.status === 'in_progress' ? state.offset : 0

      expect(resumeOffset).toBe(0)
    })
  })

  describe('Multiple Resume Cycles', () => {
    it('handles multiple state updates', async () => {
      const updateOffsets = [100, 200, 300, 400, 500]

      for (const offset of updateOffsets) {
        await manager.saveState({
          tableName: 'customers',
          status: 'in_progress',
          offset,
          totalRows: 1000,
          migratedRows: offset,
          errors: 0,
        })
      }

      const state = await manager.getState('customers')
      expect(state?.offset).toBe(500)
      expect(state?.migratedRows).toBe(500)
    })

    it('preserves error count across updates', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 100,
        totalRows: 1000,
        migratedRows: 98,
        errors: 2,
        lastError: 'Row 50: constraint violation',
      })

      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 200,
        totalRows: 1000,
        migratedRows: 195,
        errors: 5,
        lastError: 'Row 180: null value error',
      })

      const state = await manager.getState('customers')
      expect(state?.errors).toBe(5)
      expect(state?.lastError).toBe('Row 180: null value error')
    })
  })

  describe('Fresh vs Resume Detection', () => {
    it('detects fresh migration (no state)', async () => {
      const allStates = await manager.getAllStates()
      const isFreshMigration = allStates.length === 0

      expect(isFreshMigration).toBe(true)
    })

    it('detects resume scenario (existing state)', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const isFreshMigration = allStates.length === 0

      expect(isFreshMigration).toBe(false)
    })

    it('clears state for forced fresh migration', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 50,
        totalRows: 100,
        migratedRows: 50,
        errors: 0,
      })

      // Force fresh start
      await manager.clearAllStates()

      const allStates = await manager.getAllStates()
      expect(allStates).toHaveLength(0)
    })
  })

  describe('Checkpoint Recovery', () => {
    it('calculates remaining work accurately', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 333,
        totalRows: 1000,
        migratedRows: 333,
        errors: 0,
      })

      const state = await manager.getState('customers')
      const remaining = (state?.totalRows ?? 0) - (state?.migratedRows ?? 0)

      expect(remaining).toBe(667)
    })

    it('calculates progress percentage', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 250,
        totalRows: 1000,
        migratedRows: 250,
        errors: 0,
      })

      const state = await manager.getState('customers')
      const progress = ((state?.migratedRows ?? 0) / (state?.totalRows ?? 1)) * 100

      expect(progress).toBe(25)
    })

    it('estimates completion time from start', async () => {
      const startedAt = new Date(Date.now() - 60000) // 1 minute ago

      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 250,
        totalRows: 1000,
        migratedRows: 250,
        errors: 0,
        startedAt: startedAt.toISOString(),
      })

      const state = await manager.getState('customers')
      const elapsedMs = Date.now() - new Date(state?.startedAt ?? Date.now()).getTime()
      const rowsPerMs = (state?.migratedRows ?? 0) / elapsedMs
      const remaining = (state?.totalRows ?? 0) - (state?.migratedRows ?? 0)
      const estimatedRemainingMs = rowsPerMs > 0 ? remaining / rowsPerMs : 0

      // With 250 rows in 60s, 750 remaining = ~180s estimated
      expect(estimatedRemainingMs).toBeGreaterThan(150000)
      expect(estimatedRemainingMs).toBeLessThan(210000)
    })
  })

  describe('Multi-Table Resume', () => {
    it('identifies next table to resume', async () => {
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
        status: 'in_progress',
        offset: 25,
        totalRows: 50,
        migratedRows: 25,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const inProgress = allStates.find((s) => s.status === 'in_progress')

      expect(inProgress?.tableName).toBe('products')
      expect(inProgress?.offset).toBe(25)
    })

    it('identifies tables not yet started', async () => {
      const migrationOrder = ['customers', 'products', 'orders']

      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const processedTables = new Set(allStates.map((s) => s.tableName))
      const notStarted = migrationOrder.filter((t) => !processedTables.has(t))

      expect(notStarted).toEqual(['products', 'orders'])
    })

    it('calculates overall migration progress', async () => {
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

      await manager.saveState({
        tableName: 'orders',
        status: 'in_progress',
        offset: 100,
        totalRows: 200,
        migratedRows: 100,
        errors: 0,
      })

      const allStates = await manager.getAllStates()
      const totalRows = allStates.reduce((sum, s) => sum + s.totalRows, 0)
      const migratedRows = allStates.reduce((sum, s) => sum + s.migratedRows, 0)

      expect(totalRows).toBe(350)
      expect(migratedRows).toBe(250)
      expect((migratedRows / totalRows) * 100).toBeCloseTo(71.43, 1)
    })
  })
})

describe('State Validation', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('handles corrupted state file gracefully', async () => {
    fs.writeFileSync(stateFilePath, '{corrupted json')

    const state = await manager.getState('customers')
    expect(state).toBeNull()

    const allStates = await manager.getAllStates()
    expect(allStates).toHaveLength(0)
  })

  it('handles empty state file', async () => {
    fs.writeFileSync(stateFilePath, '')

    const allStates = await manager.getAllStates()
    expect(allStates).toHaveLength(0)
  })

  it('handles missing state file', async () => {
    // Don't create the file
    const allStates = await manager.getAllStates()
    expect(allStates).toHaveLength(0)
  })

  it('overwrites state atomically', async () => {
    // Rapid state updates
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        manager.saveState({
          tableName: 'customers',
          status: 'in_progress',
          offset: i * 10,
          totalRows: 100,
          migratedRows: i * 10,
          errors: 0,
        })
      )
    }

    await Promise.all(promises)

    // Final state should be one of the updates (last write wins)
    const state = await manager.getState('customers')
    expect(state).not.toBeNull()
    expect(state?.offset).toBeGreaterThanOrEqual(0)
    expect(state?.offset).toBeLessThanOrEqual(90)
  })
})
