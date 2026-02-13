/**
 * Table Migration Utilities
 *
 * Handles batch migration of tables from source to destination
 * with progress logging, error handling, and resumability.
 */

import { querySource, sourceTableExists, destinationTableExists } from './db-client.js'
import { transformBatch, type DatabaseRow, type TransformContext } from './transform-row.js'
import { insertBatch, type BatchInsertResult, type BatchInsertOptions } from './insert-row.js'
import { BATCH_SIZE } from '../config.js'

/**
 * Migration state for a single table
 */
export interface TableMigrationState {
  tableName: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  offset: number
  totalRows: number
  migratedRows: number
  errors: number
  startedAt?: string
  completedAt?: string
  lastError?: string
}

/**
 * Options for table migration
 */
export interface MigrateTableOptions {
  /** Source table name */
  sourceTable: string
  /** Target table name (defaults to sourceTable) */
  targetTable?: string | undefined
  /** Tenant slug for destination */
  tenantSlug: string
  /** Primary key column(s) */
  primaryKey: string | string[]
  /** Starting offset for resumption */
  startOffset?: number | undefined
  /** Batch size (defaults to BATCH_SIZE from config) */
  batchSize?: number | undefined
  /** Continue on individual row errors */
  continueOnError?: boolean | undefined
  /** Encrypt sensitive columns */
  encryptSensitive?: boolean | undefined
  /** Specific columns to encrypt */
  sensitiveColumns?: string[] | undefined
  /** Columns that need tenant_id added */
  addTenantId?: boolean | undefined
  /** Progress callback */
  onProgress?: ((state: TableMigrationState) => void) | undefined
  /** Batch completion callback */
  onBatchComplete?: ((batchNumber: number, result: BatchInsertResult) => void) | undefined
}

/**
 * Result of table migration
 */
export interface MigrateTableResult {
  tableName: string
  success: boolean
  totalSourceRows: number
  migratedRows: number
  insertedRows: number
  updatedRows: number
  skippedRows: number
  errors: number
  errorDetails: Array<{ rowId: string; error: string }>
  durationMs: number
  startOffset: number
  finalOffset: number
}

/**
 * Get total row count from source table
 */
async function getSourceRowCount(tableName: string): Promise<number> {
  const result = await querySource<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${tableName}`
  )
  return parseInt(result.rows[0]?.count ?? '0', 10)
}

/**
 * Fetch a batch of rows from source table
 */
async function fetchSourceBatch(
  tableName: string,
  offset: number,
  limit: number,
  orderByColumn: string = 'id'
): Promise<DatabaseRow[]> {
  const result = await querySource<DatabaseRow>(
    `SELECT * FROM ${tableName} ORDER BY ${orderByColumn} OFFSET $1 LIMIT $2`,
    [offset, limit]
  )
  return result.rows
}

/**
 * Get column names from source table
 * Reserved for future use in column validation
 */
export async function getSourceColumns(tableName: string): Promise<string[]> {
  const result = await querySource<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  )
  return result.rows.map((row: { column_name: string }) => row.column_name)
}

/**
 * Migrate a single table from source to destination
 */
export async function migrateTable(
  options: MigrateTableOptions
): Promise<MigrateTableResult> {
  const {
    sourceTable,
    targetTable = sourceTable,
    tenantSlug,
    primaryKey,
    startOffset = 0,
    batchSize = BATCH_SIZE,
    continueOnError = true,
    encryptSensitive = true,
    sensitiveColumns,
    addTenantId = false,
    onProgress,
    onBatchComplete,
  } = options

  const startTime = Date.now()
  const result: MigrateTableResult = {
    tableName: sourceTable,
    success: false,
    totalSourceRows: 0,
    migratedRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    errors: 0,
    errorDetails: [],
    durationMs: 0,
    startOffset,
    finalOffset: startOffset,
  }

  // Check if source table exists
  const sourceExists = await sourceTableExists(sourceTable)
  if (!sourceExists) {
    console.log(`  [SKIP] Source table "${sourceTable}" does not exist`)
    result.success = true
    result.durationMs = Date.now() - startTime
    return result
  }

  // Check if destination table exists
  const destExists = await destinationTableExists(tenantSlug, targetTable)
  if (!destExists) {
    console.log(`  [SKIP] Destination table "${targetTable}" does not exist in tenant_${tenantSlug}`)
    result.success = true
    result.durationMs = Date.now() - startTime
    return result
  }

  // Get total row count
  result.totalSourceRows = await getSourceRowCount(sourceTable)

  if (result.totalSourceRows === 0) {
    console.log(`  [SKIP] Source table "${sourceTable}" is empty`)
    result.success = true
    result.durationMs = Date.now() - startTime
    return result
  }

  // Create transform context
  const transformContext: TransformContext = {
    sourceTable,
    targetTable,
    tenantSlug,
    encryptSensitive,
    ...(sensitiveColumns !== undefined ? { sensitiveColumns } : {}),
  }

  // Create insert options
  const insertOptions: BatchInsertOptions = {
    primaryKey,
    continueOnError,
    addTenantId,
  }

  // Migrate in batches
  let offset = startOffset
  let batchNumber = 0

  const state: TableMigrationState = {
    tableName: sourceTable,
    status: 'in_progress',
    offset,
    totalRows: result.totalSourceRows,
    migratedRows: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
  }

  console.log(`  [START] Migrating "${sourceTable}" (${result.totalSourceRows} rows)`)

  while (offset < result.totalSourceRows) {
    batchNumber++

    // Fetch batch from source
    const sourceBatch = await fetchSourceBatch(sourceTable, offset, batchSize)

    if (sourceBatch.length === 0) {
      break
    }

    // Transform batch
    const transformedBatch = transformBatch(sourceBatch, transformContext)

    // Insert batch
    const batchResult = await insertBatch(
      tenantSlug,
      targetTable,
      transformedBatch,
      insertOptions
    )

    // Update results
    result.migratedRows += sourceBatch.length
    result.insertedRows += batchResult.inserted
    result.updatedRows += batchResult.updated
    result.skippedRows += batchResult.skipped
    result.errors += batchResult.errors
    result.errorDetails.push(...batchResult.errorDetails)

    // Update state
    state.offset = offset + sourceBatch.length
    state.migratedRows = result.migratedRows
    state.errors = result.errors

    // Log progress
    const progress = Math.round((state.migratedRows / result.totalSourceRows) * 100)
    console.log(
      `    [BATCH ${batchNumber}] ${state.migratedRows}/${result.totalSourceRows} (${progress}%) - ` +
      `inserted: ${batchResult.inserted}, errors: ${batchResult.errors}`
    )

    // Callbacks
    if (onProgress) {
      onProgress(state)
    }
    if (onBatchComplete) {
      onBatchComplete(batchNumber, batchResult)
    }

    // Update offset for next batch
    offset += sourceBatch.length
    result.finalOffset = offset

    // If we had errors and continueOnError is false, we would have thrown
  }

  // Final status
  state.status = result.errors > 0 && !continueOnError ? 'failed' : 'completed'
  state.completedAt = new Date().toISOString()

  result.success = state.status === 'completed'
  result.durationMs = Date.now() - startTime

  const status = result.success ? 'DONE' : 'FAILED'
  console.log(
    `  [${status}] "${sourceTable}": ${result.migratedRows} rows in ${result.durationMs}ms ` +
    `(inserted: ${result.insertedRows}, updated: ${result.updatedRows}, errors: ${result.errors})`
  )

  return result
}

/**
 * Migration state manager for resumability
 */
export interface MigrationStateManager {
  /** Get current state for a table */
  getState(tableName: string): Promise<TableMigrationState | null>
  /** Save state for a table */
  saveState(state: TableMigrationState): Promise<void>
  /** Get all table states */
  getAllStates(): Promise<TableMigrationState[]>
  /** Clear all states (for fresh migration) */
  clearAllStates(): Promise<void>
}

/**
 * File-based migration state manager
 */
export function createFileStateManager(filePath: string): MigrationStateManager {
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')

  // Ensure directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  function readState(): Record<string, TableMigrationState> {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content) as Record<string, TableMigrationState>
      }
    } catch {
      // Ignore parse errors, start fresh
    }
    return {}
  }

  function writeState(states: Record<string, TableMigrationState>): void {
    fs.writeFileSync(filePath, JSON.stringify(states, null, 2))
  }

  return {
    async getState(tableName: string): Promise<TableMigrationState | null> {
      const states = readState()
      return states[tableName] ?? null
    },

    async saveState(state: TableMigrationState): Promise<void> {
      const states = readState()
      states[state.tableName] = state
      writeState(states)
    },

    async getAllStates(): Promise<TableMigrationState[]> {
      const states = readState()
      return Object.values(states)
    },

    async clearAllStates(): Promise<void> {
      writeState({})
    },
  }
}

/**
 * Migrate multiple tables with state management
 */
export async function migrateTablesWithState(
  tables: Array<{
    sourceTable: string
    targetTable?: string
    primaryKey: string | string[]
    sensitiveColumns?: string[]
    addTenantId?: boolean
  }>,
  tenantSlug: string,
  stateManager: MigrationStateManager,
  options?: {
    continueOnError?: boolean
    encryptSensitive?: boolean
    onTableStart?: (tableName: string) => void
    onTableComplete?: (result: MigrateTableResult) => void
  }
): Promise<MigrateTableResult[]> {
  const results: MigrateTableResult[] = []

  for (const table of tables) {
    const tableName = table.sourceTable

    // Check existing state for resumption
    const existingState = await stateManager.getState(tableName)
    const startOffset = existingState?.status === 'in_progress'
      ? existingState.offset
      : 0

    if (existingState?.status === 'completed') {
      console.log(`[SKIP] Table "${tableName}" already completed`)
      continue
    }

    if (options?.onTableStart) {
      options.onTableStart(tableName)
    }

    const result = await migrateTable({
      ...table,
      tenantSlug,
      startOffset,
      continueOnError: options?.continueOnError ?? true,
      encryptSensitive: options?.encryptSensitive ?? true,
      onProgress: async (state) => {
        await stateManager.saveState(state)
      },
    })

    results.push(result)

    // Save final state
    await stateManager.saveState({
      tableName,
      status: result.success ? 'completed' : 'failed',
      offset: result.finalOffset,
      totalRows: result.totalSourceRows,
      migratedRows: result.migratedRows,
      errors: result.errors,
      completedAt: new Date().toISOString(),
      lastError: result.errorDetails[0]?.error,
    })

    if (options?.onTableComplete) {
      options.onTableComplete(result)
    }
  }

  return results
}
