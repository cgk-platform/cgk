/**
 * Row Count Validation
 *
 * Compares row counts between the source (RAWDOG) and destination (CGK)
 * databases to ensure all records were migrated.
 */

import type { MigratableTable } from '../config.js'
import {
  querySource,
  queryDestination,
  sourceTableExists,
  destinationTableExists,
} from './db-client.js'
import type { ValidationResult, CountValidationDetails } from './types.js'

/**
 * Validate row count for a single table
 */
export async function validateTableCount(
  table: MigratableTable,
  tenantSlug: string
): Promise<ValidationResult> {
  // Check if source table exists
  const sourceExists = await sourceTableExists(table)
  if (!sourceExists) {
    return {
      type: 'count',
      table,
      passed: true,
      message: `Table "${table}" does not exist in source database (skipped)`,
      details: {
        sourceCount: 0,
        destinationCount: 0,
        difference: 0,
        skipped: true,
        reason: 'source_table_missing',
      },
    }
  }

  // Check if destination table exists
  const destExists = await destinationTableExists(tenantSlug, table)
  if (!destExists) {
    const sourceResult = await querySource<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table}`
    )
    const sourceCount = parseInt(sourceResult.rows[0]?.count ?? '0', 10)

    // If source has no rows, it's fine that destination is missing
    if (sourceCount === 0) {
      return {
        type: 'count',
        table,
        passed: true,
        message: `Table "${table}" has 0 rows in source, destination table not created (OK)`,
        details: {
          sourceCount: 0,
          destinationCount: 0,
          difference: 0,
        } satisfies CountValidationDetails,
      }
    }

    return {
      type: 'count',
      table,
      passed: false,
      message: `Table "${table}" does not exist in destination schema but has ${sourceCount} rows in source`,
      details: {
        sourceCount,
        destinationCount: 0,
        difference: sourceCount,
        error: 'destination_table_missing',
      },
    }
  }

  // Get counts from both databases
  const [sourceResult, destResult] = await Promise.all([
    querySource<{ count: string }>(`SELECT COUNT(*) as count FROM ${table}`),
    queryDestination<{ count: string }>(
      tenantSlug,
      `SELECT COUNT(*) as count FROM ${table}`
    ),
  ])

  const sourceCount = parseInt(sourceResult.rows[0]?.count ?? '0', 10)
  const destinationCount = parseInt(destResult.rows[0]?.count ?? '0', 10)
  const difference = sourceCount - destinationCount
  const passed = sourceCount === destinationCount

  const details: CountValidationDetails = {
    sourceCount,
    destinationCount,
    difference,
  }

  return {
    type: 'count',
    table,
    passed,
    message: passed
      ? `Row count matches: ${sourceCount} rows`
      : `Row count mismatch: source=${sourceCount}, destination=${destinationCount} (diff=${difference})`,
    details,
  }
}

/**
 * Validate row counts for all tables
 */
export async function validateAllCounts(
  tables: readonly MigratableTable[],
  tenantSlug: string,
  onProgress?: (table: string) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const table of tables) {
    if (onProgress) {
      onProgress(table)
    }
    const result = await validateTableCount(table, tenantSlug)
    results.push(result)
  }

  return results
}

/**
 * Generate a summary of count validation results
 */
export function summarizeCountResults(results: ValidationResult[]): {
  totalTables: number
  passedTables: number
  failedTables: number
  skippedTables: number
  totalSourceRows: number
  totalDestinationRows: number
  totalMissing: number
} {
  let totalSourceRows = 0
  let totalDestinationRows = 0
  let passedTables = 0
  let failedTables = 0
  let skippedTables = 0

  for (const result of results) {
    const details = result.details as CountValidationDetails & {
      skipped?: boolean
    }

    if (details.skipped) {
      skippedTables++
    } else if (result.passed) {
      passedTables++
      totalSourceRows += details.sourceCount
      totalDestinationRows += details.destinationCount
    } else {
      failedTables++
      totalSourceRows += details.sourceCount
      totalDestinationRows += details.destinationCount
    }
  }

  return {
    totalTables: results.length,
    passedTables,
    failedTables,
    skippedTables,
    totalSourceRows,
    totalDestinationRows,
    totalMissing: totalSourceRows - totalDestinationRows,
  }
}
