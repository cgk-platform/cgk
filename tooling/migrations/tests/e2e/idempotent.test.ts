/**
 * E2E Tests for Idempotent State Management
 *
 * Tests that the migration state management supports idempotent
 * operations, allowing safe re-runs without data issues.
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

describe('Idempotent State Operations', () => {
  let tempDir: string
  let stateFilePath: string
  let manager: MigrationStateManager

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idempotent-test-'))
    stateFilePath = path.join(tempDir, '.migration-state.json')
    manager = createFileStateManager(stateFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('State Update Idempotency', () => {
    it('updating same state multiple times is idempotent', async () => {
      const state: TableMigrationState = {
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      }

      // Save the same state multiple times
      await manager.saveState(state)
      await manager.saveState(state)
      await manager.saveState(state)

      const retrieved = await manager.getState('customers')

      expect(retrieved?.status).toBe('completed')
      expect(retrieved?.offset).toBe(100)
    })

    it('preserves completed status on re-save', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
        completedAt: '2024-01-01T00:00:00.000Z',
      })

      // Re-save with same status
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
        completedAt: '2024-01-01T00:00:00.000Z',
      })

      const retrieved = await manager.getState('customers')
      expect(retrieved?.status).toBe('completed')
    })
  })

  describe('Completed Table Skip Logic', () => {
    it('identifies completed tables for skipping', async () => {
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
      const completedTables = allStates
        .filter((s) => s.status === 'completed')
        .map((s) => s.tableName)

      expect(completedTables).toContain('customers')
      expect(completedTables).toContain('orders')
      expect(completedTables).toHaveLength(2)
    })

    it('allows re-migration by clearing state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 0,
      })

      // Clear for fresh migration
      await manager.clearAllStates()

      // Should now be able to "migrate" again
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 0,
        totalRows: 100,
        migratedRows: 0,
        errors: 0,
      })

      const state = await manager.getState('customers')
      expect(state?.status).toBe('in_progress')
      expect(state?.offset).toBe(0)
    })
  })

  describe('Multi-Run Safety', () => {
    it('second run detects completed tables', async () => {
      // First run completes tables
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

      // Second run - simulate checking what to migrate
      const allStates = await manager.getAllStates()
      const completedTables = new Set(
        allStates.filter((s) => s.status === 'completed').map((s) => s.tableName)
      )

      const tablesToMigrate = ['customers', 'products', 'orders']
      const remaining = tablesToMigrate.filter((t) => !completedTables.has(t))

      expect(remaining).toEqual(['orders'])
    })

    it('handles partial completion between runs', async () => {
      // First run - partial completion
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

      // Second run - check status
      const ordersState = await manager.getState('orders')
      const shouldResume = ordersState?.status === 'in_progress'
      const resumeOffset = shouldResume ? ordersState?.offset : 0

      expect(shouldResume).toBe(true)
      expect(resumeOffset).toBe(50)
    })

    it('counts remain consistent after multiple state reads', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'completed',
        offset: 100,
        totalRows: 100,
        migratedRows: 100,
        errors: 2,
      })

      // Multiple reads
      const read1 = await manager.getState('customers')
      const read2 = await manager.getState('customers')
      const read3 = await manager.getState('customers')

      expect(read1?.migratedRows).toBe(100)
      expect(read2?.migratedRows).toBe(100)
      expect(read3?.migratedRows).toBe(100)
      expect(read1?.errors).toBe(2)
      expect(read2?.errors).toBe(2)
      expect(read3?.errors).toBe(2)
    })
  })

  describe('Error State Idempotency', () => {
    it('preserves error details across reads', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'failed',
        offset: 50,
        totalRows: 100,
        migratedRows: 45,
        errors: 5,
        lastError: 'Connection timeout on row 46',
      })

      // Multiple reads
      const read1 = await manager.getState('customers')
      const read2 = await manager.getState('customers')

      expect(read1?.lastError).toBe('Connection timeout on row 46')
      expect(read2?.lastError).toBe('Connection timeout on row 46')
      expect(read1?.errors).toBe(5)
      expect(read2?.errors).toBe(5)
    })

    it('allows retry from failed state', async () => {
      await manager.saveState({
        tableName: 'customers',
        status: 'failed',
        offset: 50,
        totalRows: 100,
        migratedRows: 50,
        errors: 10,
        lastError: 'Too many errors',
      })

      // Retry - update state back to in_progress
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 50,
        totalRows: 100,
        migratedRows: 50,
        errors: 0, // Reset errors for retry
      })

      const state = await manager.getState('customers')
      expect(state?.status).toBe('in_progress')
      expect(state?.errors).toBe(0)
    })
  })

  describe('Concurrent State Safety', () => {
    it('handles rapid state updates', async () => {
      // Simulate rapid progress updates
      for (let i = 0; i <= 100; i += 10) {
        await manager.saveState({
          tableName: 'customers',
          status: i < 100 ? 'in_progress' : 'completed',
          offset: i,
          totalRows: 100,
          migratedRows: i,
          errors: 0,
        })
      }

      const finalState = await manager.getState('customers')
      expect(finalState?.status).toBe('completed')
      expect(finalState?.migratedRows).toBe(100)
    })

    it('preserves data integrity under updates', async () => {
      // Initial state
      await manager.saveState({
        tableName: 'customers',
        status: 'in_progress',
        offset: 0,
        totalRows: 100,
        migratedRows: 0,
        errors: 0,
        startedAt: '2024-01-01T00:00:00.000Z',
      })

      // Multiple intermediate updates
      for (let i = 1; i <= 10; i++) {
        await manager.saveState({
          tableName: 'customers',
          status: 'in_progress',
          offset: i * 10,
          totalRows: 100,
          migratedRows: i * 10,
          errors: 0,
          startedAt: '2024-01-01T00:00:00.000Z',
        })
      }

      const state = await manager.getState('customers')
      expect(state?.startedAt).toBe('2024-01-01T00:00:00.000Z')
      expect(state?.totalRows).toBe(100)
    })
  })
})
