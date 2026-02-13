/**
 * Financial Sum Validation
 *
 * Compares financial column sums between the source (RAWDOG) and
 * destination (CGK) databases to ensure no monetary data was lost.
 */

import { FINANCIAL_TABLES, type MigratableTable } from '../config.js'
import {
  querySource,
  queryDestination,
  sourceTableExists,
  destinationTableExists,
} from './db-client.js'
import type { ValidationResult, SumValidationDetails } from './types.js'

/**
 * Format cents as currency string for display
 */
function formatCents(cents: bigint | number): string {
  const dollars = Number(cents) / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

/**
 * Validate sum of a financial column
 */
export async function validateColumnSum(
  table: MigratableTable,
  column: string,
  tenantSlug: string
): Promise<ValidationResult> {
  // Check if tables exist
  const sourceExists = await sourceTableExists(table)
  const destExists = await destinationTableExists(tenantSlug, table)

  if (!sourceExists || !destExists) {
    return {
      type: 'sum',
      table,
      passed: sourceExists === destExists,
      message: !sourceExists
        ? `Table "${table}" does not exist in source (skipped)`
        : `Table "${table}" does not exist in destination`,
      details: {
        column,
        sourceSum: 0,
        destinationSum: 0,
        difference: 0,
        sourceSumFormatted: formatCents(0),
        destinationSumFormatted: formatCents(0),
        skipped: !sourceExists,
      },
    }
  }

  // Get sums from both databases
  // Use COALESCE to handle NULL values and tables with no rows
  const [sourceResult, destResult] = await Promise.all([
    querySource<{ sum: string | null }>(
      `SELECT COALESCE(SUM(${column}), 0)::text as sum FROM ${table}`
    ),
    queryDestination<{ sum: string | null }>(
      tenantSlug,
      `SELECT COALESCE(SUM(${column}), 0)::text as sum FROM ${table}`
    ),
  ])

  const sourceSum = BigInt(sourceResult.rows[0]?.sum ?? '0')
  const destinationSum = BigInt(destResult.rows[0]?.sum ?? '0')
  const difference = sourceSum - destinationSum
  const passed = sourceSum === destinationSum

  const details: SumValidationDetails = {
    column,
    sourceSum,
    destinationSum,
    difference,
    sourceSumFormatted: formatCents(sourceSum),
    destinationSumFormatted: formatCents(destinationSum),
  }

  return {
    type: 'sum',
    table,
    passed,
    message: passed
      ? `Sum of ${table}.${column} matches: ${formatCents(sourceSum)}`
      : `Sum mismatch for ${table}.${column}: source=${formatCents(sourceSum)}, destination=${formatCents(destinationSum)} (diff=${formatCents(difference)})`,
    details,
  }
}

/**
 * Validate all financial columns
 */
export async function validateAllSums(
  tenantSlug: string,
  onProgress?: (table: string, column: string) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  for (const { table, column } of FINANCIAL_TABLES) {
    if (onProgress) {
      onProgress(table, column)
    }
    const result = await validateColumnSum(table, column, tenantSlug)
    results.push(result)
  }

  return results
}

/**
 * Generate a summary of sum validation results
 */
export function summarizeSumResults(results: ValidationResult[]): {
  totalChecks: number
  passedChecks: number
  failedChecks: number
  totalSourceAmount: bigint
  totalDestinationAmount: bigint
  totalDifference: bigint
  totalSourceFormatted: string
  totalDestinationFormatted: string
  totalDifferenceFormatted: string
} {
  let passedChecks = 0
  let failedChecks = 0
  let totalSourceAmount = BigInt(0)
  let totalDestinationAmount = BigInt(0)

  for (const result of results) {
    const details = result.details as SumValidationDetails & {
      skipped?: boolean
    }

    if (details.skipped) {
      continue
    }

    if (result.passed) {
      passedChecks++
    } else {
      failedChecks++
    }

    totalSourceAmount += BigInt(details.sourceSum)
    totalDestinationAmount += BigInt(details.destinationSum)
  }

  const totalDifference = totalSourceAmount - totalDestinationAmount

  return {
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    totalSourceAmount,
    totalDestinationAmount,
    totalDifference,
    totalSourceFormatted: formatCents(totalSourceAmount),
    totalDestinationFormatted: formatCents(totalDestinationAmount),
    totalDifferenceFormatted: formatCents(totalDifference),
  }
}
