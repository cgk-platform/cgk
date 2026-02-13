#!/usr/bin/env node
/**
 * Migration Validation Script
 *
 * Runs all validation checks to verify the RAWDOG data migration
 * was successful. Generates a comprehensive report.
 *
 * Usage:
 *   npx tsx tooling/migrations/validate-migration.ts [options]
 *
 * Options:
 *   --tenant <slug>     Tenant slug to validate (default: rawdog)
 *   --skip-count        Skip row count validation
 *   --skip-sum          Skip financial sum validation
 *   --skip-sample       Skip sample data validation
 *   --skip-fk           Skip foreign key validation
 *   --sample-size <n>   Number of rows to sample (default: 100)
 *   --verbose           Show detailed progress
 *   --json              Output results as JSON
 */

import 'dotenv/config'
import {
  TABLE_MIGRATION_ORDER,
  VALIDATION_SAMPLE_SIZE,
  validateEnvironment,
} from './config.js'
import {
  checkSourceConnection,
  checkDestinationConnection,
  tenantSchemaExists,
  closeConnections,
} from './lib/db-client.js'
import {
  validateAllCounts,
  summarizeCountResults,
} from './lib/validate-count.js'
import { validateAllSums, summarizeSumResults } from './lib/validate-sum.js'
import {
  validateAllSamples,
  summarizeSampleResults,
} from './lib/validate-sample.js'
import {
  validateAllForeignKeys,
  summarizeForeignKeyResults,
} from './lib/validate-fk.js'
import type { ValidationResult, ValidationReport } from './lib/types.js'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

interface CLIOptions {
  tenant: string
  skipCount: boolean
  skipSum: boolean
  skipSample: boolean
  skipFk: boolean
  sampleSize: number
  verbose: boolean
  json: boolean
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  const options: CLIOptions = {
    tenant: 'rawdog',
    skipCount: false,
    skipSum: false,
    skipSample: false,
    skipFk: false,
    sampleSize: VALIDATION_SAMPLE_SIZE,
    verbose: false,
    json: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--tenant':
        options.tenant = args[++i] ?? 'rawdog'
        break
      case '--skip-count':
        options.skipCount = true
        break
      case '--skip-sum':
        options.skipSum = true
        break
      case '--skip-sample':
        options.skipSample = true
        break
      case '--skip-fk':
        options.skipFk = true
        break
      case '--sample-size':
        options.sampleSize = parseInt(args[++i] ?? '100', 10)
        break
      case '--verbose':
        options.verbose = true
        break
      case '--json':
        options.json = true
        break
      case '--help':
      case '-h':
        console.log(`
Migration Validation Script

Usage:
  npx tsx tooling/migrations/validate-migration.ts [options]

Options:
  --tenant <slug>     Tenant slug to validate (default: rawdog)
  --skip-count        Skip row count validation
  --skip-sum          Skip financial sum validation
  --skip-sample       Skip sample data validation
  --skip-fk           Skip foreign key validation
  --sample-size <n>   Number of rows to sample (default: 100)
  --verbose           Show detailed progress
  --json              Output results as JSON
  --help, -h          Show this help message
`)
        process.exit(0)
    }
  }

  return options
}

/**
 * Print a section header
 */
function printHeader(title: string): void {
  console.log()
  console.log(`${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`)
  console.log()
}

/**
 * Print a result line with pass/fail indicator
 */
function printResult(result: ValidationResult, verbose: boolean): void {
  const icon = result.passed
    ? `${colors.green}[PASS]${colors.reset}`
    : `${colors.red}[FAIL]${colors.reset}`

  console.log(`  ${icon} ${result.message}`)

  if (verbose && !result.passed) {
    console.log(
      `        ${colors.dim}${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n        ')}${colors.reset}`
    )
  }
}

/**
 * Print a summary box
 */
function printSummary(
  title: string,
  passed: number,
  failed: number,
  extra?: string[]
): void {
  const total = passed + failed
  const status =
    failed === 0
      ? `${colors.green}ALL PASSED${colors.reset}`
      : `${colors.red}${failed} FAILED${colors.reset}`

  console.log()
  console.log(`  ${title}: ${passed}/${total} ${status}`)

  if (extra) {
    for (const line of extra) {
      console.log(`    ${colors.dim}${line}${colors.reset}`)
    }
  }
}

/**
 * Run all validations
 */
async function runValidation(options: CLIOptions): Promise<ValidationReport> {
  const startedAt = new Date()
  const results: ValidationResult[] = []

  // Validate environment
  const envCheck = validateEnvironment()
  if (!envCheck.valid) {
    throw new Error(
      `Missing required environment variables: ${envCheck.missing.join(', ')}`
    )
  }

  // Check connections
  if (!options.json) {
    console.log(`${colors.dim}Checking database connections...${colors.reset}`)
  }

  const [sourceOk, destOk] = await Promise.all([
    checkSourceConnection(),
    checkDestinationConnection(),
  ])

  if (!sourceOk) {
    throw new Error('Cannot connect to source database (RAWDOG_POSTGRES_URL)')
  }
  if (!destOk) {
    throw new Error('Cannot connect to destination database (POSTGRES_URL)')
  }

  // Check tenant schema exists
  const schemaExists = await tenantSchemaExists(options.tenant)
  if (!schemaExists) {
    throw new Error(
      `Tenant schema "tenant_${options.tenant}" does not exist in destination database`
    )
  }

  if (!options.json) {
    console.log(
      `${colors.green}Connected to both databases.${colors.reset}`
    )
    console.log(
      `${colors.dim}Validating tenant: ${options.tenant}${colors.reset}`
    )
  }

  // Count validation
  if (!options.skipCount) {
    if (!options.json) {
      printHeader('Row Count Validation')
    }

    const countResults = await validateAllCounts(
      TABLE_MIGRATION_ORDER,
      options.tenant,
      options.verbose && !options.json
        ? (table) => process.stdout.write(`  Checking ${table}...\r`)
        : undefined
    )

    results.push(...countResults)

    if (!options.json) {
      for (const result of countResults) {
        printResult(result, options.verbose)
      }

      const summary = summarizeCountResults(countResults)
      printSummary('Count validation', summary.passedTables, summary.failedTables, [
        `Total rows: source=${summary.totalSourceRows}, destination=${summary.totalDestinationRows}`,
        summary.totalMissing > 0
          ? `Missing: ${summary.totalMissing} rows`
          : '',
      ].filter(Boolean))
    }
  }

  // Sum validation
  if (!options.skipSum) {
    if (!options.json) {
      printHeader('Financial Sum Validation')
    }

    const sumResults = await validateAllSums(
      options.tenant,
      options.verbose && !options.json
        ? (table, column) =>
            process.stdout.write(`  Checking ${table}.${column}...\r`)
        : undefined
    )

    results.push(...sumResults)

    if (!options.json) {
      for (const result of sumResults) {
        printResult(result, options.verbose)
      }

      const summary = summarizeSumResults(sumResults)
      printSummary('Sum validation', summary.passedChecks, summary.failedChecks, [
        `Total: source=${summary.totalSourceFormatted}, destination=${summary.totalDestinationFormatted}`,
      ])
    }
  }

  // Sample validation
  if (!options.skipSample) {
    if (!options.json) {
      printHeader('Sample Data Validation')
    }

    const sampleResults = await validateAllSamples(
      TABLE_MIGRATION_ORDER,
      options.tenant,
      options.sampleSize,
      options.verbose && !options.json
        ? (table) => process.stdout.write(`  Sampling ${table}...\r`)
        : undefined
    )

    results.push(...sampleResults)

    if (!options.json) {
      for (const result of sampleResults) {
        printResult(result, options.verbose)
      }

      const summary = summarizeSampleResults(sampleResults)
      printSummary('Sample validation', summary.passedTables, summary.failedTables, [
        `Rows compared: ${summary.totalRowsCompared}`,
        `Mismatches: ${summary.totalMismatches}`,
      ])
    }
  }

  // Foreign key validation
  if (!options.skipFk) {
    if (!options.json) {
      printHeader('Foreign Key Integrity Validation')
    }

    const fkResults = await validateAllForeignKeys(
      options.tenant,
      options.verbose && !options.json
        ? (rel) => process.stdout.write(`  Checking ${rel}...\r`)
        : undefined
    )

    results.push(...fkResults)

    if (!options.json) {
      for (const result of fkResults) {
        printResult(result, options.verbose)
      }

      const summary = summarizeForeignKeyResults(fkResults)
      printSummary('FK validation', summary.passedChecks, summary.failedChecks, [
        summary.totalOrphanedRecords > 0
          ? `Orphaned records: ${summary.totalOrphanedRecords}`
          : 'No orphaned records',
      ])
    }
  }

  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()

  const passed = results.every((r) => r.passed)
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length

  const report: ValidationReport = {
    startedAt,
    completedAt,
    durationMs,
    tenantSlug: options.tenant,
    results,
    passed,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
    },
  }

  return report
}

/**
 * Print final report
 */
function printFinalReport(report: ValidationReport, options: CLIOptions): void {
  if (options.json) {
    console.log(
      JSON.stringify(
        report,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    )
    return
  }

  console.log()
  console.log(
    `${colors.bold}===============================================${colors.reset}`
  )
  console.log(`${colors.bold}           VALIDATION REPORT${colors.reset}`)
  console.log(
    `${colors.bold}===============================================${colors.reset}`
  )
  console.log()

  console.log(`  Tenant:     ${report.tenantSlug}`)
  console.log(`  Started:    ${report.startedAt.toISOString()}`)
  console.log(`  Duration:   ${(report.durationMs / 1000).toFixed(2)}s`)
  console.log()

  const statusColor = report.passed ? colors.green : colors.red
  const statusText = report.passed ? 'PASSED' : 'FAILED'

  console.log(
    `  ${colors.bold}Overall Status: ${statusColor}${statusText}${colors.reset}`
  )
  console.log()
  console.log(
    `  Checks: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.total} total`
  )
  console.log()

  if (!report.passed) {
    console.log(`${colors.red}Failed checks:${colors.reset}`)
    for (const result of report.results.filter((r) => !r.passed)) {
      console.log(`  - [${result.type}] ${result.table}: ${result.message}`)
    }
    console.log()
  }

  console.log(
    `${colors.bold}===============================================${colors.reset}`
  )
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs()

  try {
    const report = await runValidation(options)
    printFinalReport(report, options)

    // Exit with appropriate code
    process.exit(report.passed ? 0 : 1)
  } catch (error) {
    if (!options.json) {
      console.error(
        `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
      )
    } else {
      console.log(
        JSON.stringify({
          error: true,
          message: error instanceof Error ? error.message : String(error),
        })
      )
    }
    process.exit(1)
  } finally {
    await closeConnections()
  }
}

// Run if executed directly
main()
