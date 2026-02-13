/**
 * Row Insertion Utilities
 *
 * Handles inserting transformed rows into the tenant schema
 * with proper conflict handling for idempotent migrations.
 */

import { getDestinationPool } from './db-client.js'
import type { DatabaseRow } from './transform-row.js'

/**
 * Result of an insert operation
 */
export interface InsertResult {
  success: boolean
  rowId: string | null
  action: 'inserted' | 'updated' | 'skipped' | 'error'
  error?: string
}

/**
 * Options for row insertion
 */
export interface InsertOptions {
  /** Primary key column(s) */
  primaryKey: string | string[]
  /** Columns to exclude from UPDATE on conflict */
  excludeFromUpdate?: string[]
  /** Whether to add tenant_id to the row */
  addTenantId?: boolean
}

/**
 * Escape a SQL identifier (table or column name)
 */
function escapeIdentifier(identifier: string): string {
  // Simple escape - wrap in quotes and escape any internal quotes
  return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Build INSERT ... ON CONFLICT DO UPDATE statement
 */
function buildUpsertQuery(
  tableName: string,
  row: DatabaseRow,
  options: InsertOptions
): { text: string; values: unknown[] } {
  const columns = Object.keys(row)
  const primaryKeys = Array.isArray(options.primaryKey)
    ? options.primaryKey
    : [options.primaryKey]

  // Columns for INSERT
  const insertColumns = columns.map(escapeIdentifier).join(', ')

  // Parameter placeholders ($1, $2, ...)
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

  // Values array
  const values = columns.map((col) => {
    const value = row[col]
    // Handle JSONB columns - stringify objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return JSON.stringify(value)
    }
    // Handle arrays - they need to be in PostgreSQL array format for some columns
    // but JSONB arrays should be stringified
    return value
  })

  // Build ON CONFLICT clause
  const conflictColumns = primaryKeys.map(escapeIdentifier).join(', ')

  // Columns to update on conflict (exclude primary keys and specified exclusions)
  const excludeColumns = new Set([
    ...primaryKeys,
    ...(options.excludeFromUpdate ?? []),
    'created_at', // Never update created_at
  ])

  const updateColumns = columns.filter((col) => !excludeColumns.has(col))

  let onConflictClause: string
  if (updateColumns.length > 0) {
    const updateSet = updateColumns
      .map((col) => `${escapeIdentifier(col)} = EXCLUDED.${escapeIdentifier(col)}`)
      .join(', ')
    onConflictClause = `ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateSet}`
  } else {
    onConflictClause = `ON CONFLICT (${conflictColumns}) DO NOTHING`
  }

  const query = `
    INSERT INTO ${escapeIdentifier(tableName)} (${insertColumns})
    VALUES (${placeholders})
    ${onConflictClause}
    RETURNING ${escapeIdentifier(primaryKeys[0])} as id
  `

  return { text: query.trim(), values }
}

/**
 * Insert a single row into a tenant table
 */
export async function insertRow(
  tenantSlug: string,
  tableName: string,
  row: DatabaseRow,
  options: InsertOptions
): Promise<InsertResult> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  // Add tenant_id if requested
  const finalRow = options.addTenantId
    ? { ...row, tenant_id: tenantSlug }
    : row

  const { text, values } = buildUpsertQuery(tableName, finalRow, options)

  const client = await pool.connect()
  try {
    // Set search path to tenant schema
    await client.query(`SET search_path TO ${schemaName}, public`)

    const result = await client.query<{ id: string }>(text, values)

    const rowId = result.rows[0]?.id ?? null
    const action = result.rowCount === 1 ? 'inserted' : 'updated'

    return {
      success: true,
      rowId,
      action: rowId ? action : 'skipped',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      rowId: null,
      action: 'error',
      error: errorMessage,
    }
  } finally {
    // Reset search path and release connection
    await client.query('SET search_path TO public')
    client.release()
  }
}

/**
 * Batch insert configuration
 */
export interface BatchInsertOptions extends InsertOptions {
  /** Continue on individual row errors */
  continueOnError?: boolean
  /** Progress callback */
  onProgress?: (processed: number, total: number) => void
}

/**
 * Result of batch insert
 */
export interface BatchInsertResult {
  totalRows: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  errorDetails: Array<{ rowId: string; error: string }>
}

/**
 * Insert multiple rows into a tenant table
 */
export async function insertBatch(
  tenantSlug: string,
  tableName: string,
  rows: DatabaseRow[],
  options: BatchInsertOptions
): Promise<BatchInsertResult> {
  const result: BatchInsertResult = {
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  }

  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const client = await pool.connect()
  try {
    // Set search path once for the entire batch
    await client.query(`SET search_path TO ${schemaName}, public`)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue

      // Add tenant_id if requested
      const finalRow = options.addTenantId
        ? { ...row, tenant_id: tenantSlug }
        : row

      const { text, values } = buildUpsertQuery(tableName, finalRow, options)

      try {
        const queryResult = await client.query<{ id: string }>(text, values)

        if (queryResult.rowCount === 1) {
          // Check if it was an insert or update based on RETURNING
          result.inserted++
        } else {
          result.skipped++
        }
      } catch (error) {
        result.errors++
        const errorMessage = error instanceof Error ? error.message : String(error)
        const primaryKeys = Array.isArray(options.primaryKey)
          ? options.primaryKey
          : [options.primaryKey]
        const rowId = primaryKeys.map((pk) => String(row[pk] ?? 'unknown')).join(':')

        result.errorDetails.push({ rowId, error: errorMessage })

        if (!options.continueOnError) {
          throw error
        }
      }

      // Report progress
      if (options.onProgress) {
        options.onProgress(i + 1, rows.length)
      }
    }
  } finally {
    await client.query('SET search_path TO public')
    client.release()
  }

  return result
}

/**
 * Bulk insert using COPY for very large datasets
 * Note: This requires special permissions and is more complex
 */
export async function bulkInsertWithCopy(
  tenantSlug: string,
  tableName: string,
  rows: DatabaseRow[],
  columns: string[]
): Promise<BatchInsertResult> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const result: BatchInsertResult = {
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  }

  if (rows.length === 0) {
    return result
  }

  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schemaName}, public`)

    // Create a temporary table
    const tempTable = `_migration_temp_${Date.now()}`
    const columnDefs = columns.map((col) => `${escapeIdentifier(col)} TEXT`).join(', ')

    await client.query(`CREATE TEMP TABLE ${tempTable} (${columnDefs})`)

    // Insert data into temp table
    for (const row of rows) {
      const values = columns.map((col) => {
        const value = row[col]
        if (value === null || value === undefined) return null
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      })

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
      await client.query(
        `INSERT INTO ${tempTable} VALUES (${placeholders})`,
        values
      )
    }

    // Upsert from temp table to target table
    const insertCols = columns.map(escapeIdentifier).join(', ')
    const selectCols = columns.map((col) => escapeIdentifier(col)).join(', ')

    const upsertQuery = `
      INSERT INTO ${escapeIdentifier(tableName)} (${insertCols})
      SELECT ${selectCols} FROM ${tempTable}
      ON CONFLICT DO NOTHING
    `

    const insertResult = await client.query(upsertQuery)
    result.inserted = insertResult.rowCount ?? 0
    result.skipped = rows.length - result.inserted

    // Clean up temp table
    await client.query(`DROP TABLE IF EXISTS ${tempTable}`)

  } finally {
    await client.query('SET search_path TO public')
    client.release()
  }

  return result
}

/**
 * Delete all rows from a tenant table (for rollback)
 */
export async function truncateTable(
  tenantSlug: string,
  tableName: string
): Promise<void> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schemaName}, public`)
    await client.query(`TRUNCATE TABLE ${escapeIdentifier(tableName)} CASCADE`)
  } finally {
    await client.query('SET search_path TO public')
    client.release()
  }
}

/**
 * Get the row count for a tenant table
 */
export async function getTableRowCount(
  tenantSlug: string,
  tableName: string
): Promise<number> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schemaName}, public`)
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${escapeIdentifier(tableName)}`
    )
    return parseInt(result.rows[0]?.count ?? '0', 10)
  } finally {
    await client.query('SET search_path TO public')
    client.release()
  }
}
