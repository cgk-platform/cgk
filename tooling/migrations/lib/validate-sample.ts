/**
 * Sample Data Validation
 *
 * Compares random samples of rows between the source (RAWDOG) and
 * destination (CGK) databases to ensure data integrity.
 */

import { VALIDATION_SAMPLE_SIZE, type MigratableTable } from '../config.js'
import {
  querySource,
  queryDestination,
  sourceTableExists,
  destinationTableExists,
} from './db-client.js'
import type {
  ValidationResult,
  SampleValidationDetails,
  SampleMismatch,
  DatabaseRow,
} from './types.js'

/**
 * Get column names for a table from the source database
 */
async function getTableColumns(table: string): Promise<string[]> {
  const result = await querySource<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  )
  return result.rows.map((row: { column_name: string }) => row.column_name)
}

/**
 * Get random sample of IDs from source table
 */
async function getSampleIds(
  table: string,
  sampleSize: number
): Promise<string[]> {
  // First check if table has 'id' column
  const columns = await getTableColumns(table)
  if (!columns.includes('id')) {
    // Try to find a primary key column
    const pkResult = await querySource<{ column_name: string }>(
      `SELECT a.attname as column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisprimary
       LIMIT 1`,
      [table]
    )

    if (pkResult.rows.length === 0) {
      return []
    }

    const pkColumn = pkResult.rows[0]?.column_name ?? 'id'
    const result = await querySource<{ pk: string }>(
      `SELECT ${pkColumn}::text as pk FROM ${table} ORDER BY RANDOM() LIMIT $1`,
      [sampleSize]
    )
    return result.rows.map((row: { pk: string }) => row.pk)
  }

  const result = await querySource<{ id: string }>(
    `SELECT id::text FROM ${table} ORDER BY RANDOM() LIMIT $1`,
    [sampleSize]
  )
  return result.rows.map((row: { id: string }) => row.id)
}

/**
 * Compare two values, handling type differences
 */
function valuesMatch(sourceValue: unknown, destValue: unknown): boolean {
  // Both null/undefined
  if (sourceValue == null && destValue == null) {
    return true
  }

  // One null, one not
  if (sourceValue == null || destValue == null) {
    return false
  }

  // Both dates
  if (sourceValue instanceof Date && destValue instanceof Date) {
    return sourceValue.getTime() === destValue.getTime()
  }

  // Date string comparison
  if (sourceValue instanceof Date || destValue instanceof Date) {
    const sourceDate =
      sourceValue instanceof Date
        ? sourceValue
        : new Date(String(sourceValue))
    const destDate =
      destValue instanceof Date ? destValue : new Date(String(destValue))

    if (!isNaN(sourceDate.getTime()) && !isNaN(destDate.getTime())) {
      // Compare with 1 second tolerance for timestamp precision differences
      return Math.abs(sourceDate.getTime() - destDate.getTime()) < 1000
    }
  }

  // Both objects (JSONB)
  if (typeof sourceValue === 'object' && typeof destValue === 'object') {
    return JSON.stringify(sourceValue) === JSON.stringify(destValue)
  }

  // BigInt comparison
  if (typeof sourceValue === 'bigint' || typeof destValue === 'bigint') {
    return BigInt(sourceValue as bigint | number) === BigInt(destValue as bigint | number)
  }

  // String comparison (handles numeric strings)
  return String(sourceValue) === String(destValue)
}

/**
 * Compare a single row between source and destination
 */
function compareRows(
  id: string,
  sourceRow: DatabaseRow,
  destRow: DatabaseRow,
  columnsToCompare: string[]
): SampleMismatch[] {
  const mismatches: SampleMismatch[] = []

  for (const column of columnsToCompare) {
    // Skip columns that may have been added during migration
    if (column === 'migrated_at' || column === 'created_at_utc') {
      continue
    }

    const sourceValue = sourceRow[column]
    const destValue = destRow[column]

    if (!valuesMatch(sourceValue, destValue)) {
      mismatches.push({
        id,
        column,
        sourceValue,
        destinationValue: destValue,
      })
    }
  }

  return mismatches
}

/**
 * Validate sample data for a single table
 */
export async function validateTableSample(
  table: MigratableTable,
  tenantSlug: string,
  sampleSize: number = VALIDATION_SAMPLE_SIZE
): Promise<ValidationResult> {
  // Check if tables exist
  const sourceExists = await sourceTableExists(table)
  const destExists = await destinationTableExists(tenantSlug, table)

  if (!sourceExists) {
    return {
      type: 'sample',
      table,
      passed: true,
      message: `Table "${table}" does not exist in source (skipped)`,
      details: {
        sampleSize: 0,
        matchedCount: 0,
        mismatchedCount: 0,
        mismatches: [],
        skipped: true,
      },
    }
  }

  if (!destExists) {
    return {
      type: 'sample',
      table,
      passed: false,
      message: `Table "${table}" does not exist in destination`,
      details: {
        sampleSize: 0,
        matchedCount: 0,
        mismatchedCount: 0,
        mismatches: [],
        error: 'destination_table_missing',
      },
    }
  }

  // Get columns to compare
  const columns = await getTableColumns(table)
  if (columns.length === 0) {
    return {
      type: 'sample',
      table,
      passed: true,
      message: `Table "${table}" has no columns (skipped)`,
      details: {
        sampleSize: 0,
        matchedCount: 0,
        mismatchedCount: 0,
        mismatches: [],
        skipped: true,
      },
    }
  }

  // Get sample IDs
  const sampleIds = await getSampleIds(table, sampleSize)
  if (sampleIds.length === 0) {
    return {
      type: 'sample',
      table,
      passed: true,
      message: `Table "${table}" has no rows to sample`,
      details: {
        sampleSize: 0,
        matchedCount: 0,
        mismatchedCount: 0,
        mismatches: [],
      } satisfies SampleValidationDetails,
    }
  }

  // Determine ID column
  const idColumn = columns.includes('id') ? 'id' : columns[0]

  // Build ID list for query
  const idPlaceholders = sampleIds.map((_, i) => `$${i + 1}`).join(', ')

  // Fetch source rows
  const sourceResult = await querySource<DatabaseRow>(
    `SELECT * FROM ${table} WHERE ${idColumn}::text IN (${idPlaceholders})`,
    sampleIds
  )

  // Fetch destination rows
  const destResult = await queryDestination<DatabaseRow>(
    tenantSlug,
    `SELECT * FROM ${table} WHERE ${idColumn}::text IN (${idPlaceholders})`,
    sampleIds
  )

  // Index rows by ID
  const sourceById = new Map<string, DatabaseRow>()
  const destById = new Map<string, DatabaseRow>()

  for (const row of sourceResult.rows) {
    sourceById.set(String(row[idColumn]), row)
  }

  for (const row of destResult.rows) {
    destById.set(String(row[idColumn]), row)
  }

  // Compare rows
  const allMismatches: SampleMismatch[] = []
  let matchedCount = 0
  let mismatchedCount = 0

  for (const id of sampleIds) {
    const sourceRow = sourceById.get(id)
    const destRow = destById.get(id)

    if (!sourceRow) {
      // This shouldn't happen since we got IDs from source
      continue
    }

    if (!destRow) {
      mismatchedCount++
      allMismatches.push({
        id,
        column: '__missing__',
        sourceValue: 'exists',
        destinationValue: 'missing',
      })
      continue
    }

    const rowMismatches = compareRows(id, sourceRow, destRow, columns)
    if (rowMismatches.length === 0) {
      matchedCount++
    } else {
      mismatchedCount++
      // Limit mismatches per row to avoid huge reports
      allMismatches.push(...rowMismatches.slice(0, 5))
    }
  }

  const passed = mismatchedCount === 0

  const details: SampleValidationDetails = {
    sampleSize: sampleIds.length,
    matchedCount,
    mismatchedCount,
    // Limit total mismatches to keep report readable
    mismatches: allMismatches.slice(0, 20),
  }

  return {
    type: 'sample',
    table,
    passed,
    message: passed
      ? `All ${matchedCount} sampled rows match`
      : `${mismatchedCount} of ${sampleIds.length} sampled rows have mismatches`,
    details,
  }
}

/**
 * Validate sample data for all tables
 */
export async function validateAllSamples(
  tables: readonly MigratableTable[],
  tenantSlug: string,
  sampleSize: number = VALIDATION_SAMPLE_SIZE,
  onProgress?: (table: string) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const table of tables) {
    if (onProgress) {
      onProgress(table)
    }
    const result = await validateTableSample(table, tenantSlug, sampleSize)
    results.push(result)
  }

  return results
}

/**
 * Generate a summary of sample validation results
 */
export function summarizeSampleResults(results: ValidationResult[]): {
  totalTables: number
  passedTables: number
  failedTables: number
  totalRowsCompared: number
  totalMismatches: number
} {
  let passedTables = 0
  let failedTables = 0
  let totalRowsCompared = 0
  let totalMismatches = 0

  for (const result of results) {
    const details = result.details as SampleValidationDetails & {
      skipped?: boolean
    }

    if (details.skipped) {
      continue
    }

    if (result.passed) {
      passedTables++
    } else {
      failedTables++
    }

    totalRowsCompared += details.sampleSize
    totalMismatches += details.mismatchedCount
  }

  return {
    totalTables: results.length,
    passedTables,
    failedTables,
    totalRowsCompared,
    totalMismatches,
  }
}
