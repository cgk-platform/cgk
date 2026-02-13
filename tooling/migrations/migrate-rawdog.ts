#!/usr/bin/env tsx
/**
 * RAWDOG Data Migration Orchestrator
 *
 * Migrates all data from the RAWDOG production database to the new
 * CGK multi-tenant platform under the tenant_rawdog schema.
 *
 * Usage:
 *   pnpm migrate              # Run full migration
 *   pnpm migrate --dry-run    # Validate without migrating
 *   pnpm migrate --resume     # Resume from last checkpoint
 *   pnpm migrate --table=orders  # Migrate specific table
 */

import 'dotenv/config'

import {
  TABLE_MIGRATION_ORDER,
  validateEnvironment,
  BATCH_SIZE,
  type MigratableTable,
} from './config.js'
import {
  checkSourceConnection,
  checkDestinationConnection,
  tenantSchemaExists,
  closeConnections,
  getDestinationPool,
} from './lib/db-client.js'
import {
  migrateTable,
  createFileStateManager,
  type MigrateTableResult,
} from './lib/migrate-table.js'

/**
 * CLI arguments
 */
interface MigrationArgs {
  dryRun: boolean
  resume: boolean
  specificTable?: string
  verbose: boolean
  help: boolean
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationArgs {
  const args: MigrationArgs = {
    dryRun: false,
    resume: false,
    verbose: false,
    help: false,
  }

  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run' || arg === '-d') {
      args.dryRun = true
    } else if (arg === '--resume' || arg === '-r') {
      args.resume = true
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg.startsWith('--table=')) {
      args.specificTable = arg.replace('--table=', '')
    }
  }

  return args
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
RAWDOG Data Migration Tool
==========================

Migrates data from RAWDOG production to CGK multi-tenant platform.

Usage:
  pnpm migrate [options]

Options:
  --dry-run, -d     Validate connections and show migration plan without executing
  --resume, -r      Resume from last checkpoint (uses .migration-state.json)
  --table=NAME      Migrate only the specified table
  --verbose, -v     Show detailed progress information
  --help, -h        Show this help message

Environment Variables:
  RAWDOG_POSTGRES_URL    Source database connection string (required)
  POSTGRES_URL           Destination database connection string (required)
  MIGRATION_ENCRYPTION_KEY   Key for encrypting sensitive data (recommended)

Tables (in migration order):
${TABLE_MIGRATION_ORDER.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

Examples:
  pnpm migrate              # Run full migration
  pnpm migrate --dry-run    # Preview migration plan
  pnpm migrate --resume     # Continue interrupted migration
  pnpm migrate --table=orders  # Migrate only orders table
`)
}

/**
 * Primary key configuration for each table
 */
const TABLE_PRIMARY_KEYS: Record<MigratableTable, string | string[]> = {
  customers: 'id',
  products: 'id',
  orders: 'id',
  line_items: 'id',
  reviews: 'id',
  creators: 'id',
  creator_projects: 'id',
  balance_transactions: 'id',
  withdrawal_requests: 'id',
  landing_pages: 'id',
  blog_posts: 'id',
  ab_tests: 'id',
  attribution_touchpoints: 'id',
  esign_documents: 'id',
}

/**
 * Target table name mappings (if different from source)
 */
const TABLE_TARGET_NAMES: Partial<Record<MigratableTable, string>> = {
  withdrawal_requests: 'payouts',
}

/**
 * Tables that need tenant_id added
 */
const TABLES_WITH_TENANT_ID: MigratableTable[] = [
  'attribution_touchpoints',
]

/**
 * Sensitive columns per table
 */
const SENSITIVE_COLUMNS: Partial<Record<MigratableTable, string[]>> = {
  creators: ['payout_details'],
  esign_documents: ['access_token'],
}

/**
 * Create the tenant schema if it doesn't exist
 */
async function createTenantSchema(tenantSlug: string): Promise<void> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenantSlug}`

  console.log(`[SCHEMA] Creating schema "${schemaName}" if not exists...`)

  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

  // Run tenant migrations to create tables
  // Note: This would typically use @cgk-platform/db/migrations but we're in tooling
  // For now, we assume the schema and tables are already created by the main app

  console.log(`[SCHEMA] Schema "${schemaName}" is ready`)
}

/**
 * Insert organization record for the tenant
 */
async function ensureOrganizationRecord(tenantSlug: string, name: string): Promise<void> {
  const pool = getDestinationPool()

  console.log(`[ORG] Ensuring organization record for "${tenantSlug}"...`)

  // Check if organization already exists
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM public.organizations WHERE slug = $1`,
    [tenantSlug]
  )

  if (existing.rows.length > 0) {
    console.log(`[ORG] Organization "${tenantSlug}" already exists (id: ${existing.rows[0]?.id})`)
    return
  }

  // Insert new organization
  const result = await pool.query<{ id: string }>(
    `INSERT INTO public.organizations (slug, name, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [tenantSlug, name]
  )

  console.log(`[ORG] Created organization "${tenantSlug}" (id: ${result.rows[0]?.id})`)
}

/**
 * Generate migration report
 */
function generateReport(results: MigrateTableResult[], totalDurationMs: number): void {
  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION REPORT')
  console.log('='.repeat(60))

  let totalSourceRows = 0
  let totalMigratedRows = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalErrors = 0
  let tablesSucceeded = 0
  let tablesFailed = 0

  console.log('\nTable Results:')
  console.log('-'.repeat(60))

  for (const result of results) {
    const status = result.success ? '\x1b[32mOK\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
    console.log(
      `  ${result.tableName.padEnd(25)} [${status}] ` +
      `${result.migratedRows}/${result.totalSourceRows} rows ` +
      `(${result.insertedRows} new, ${result.updatedRows} updated, ${result.errors} errors)`
    )

    totalSourceRows += result.totalSourceRows
    totalMigratedRows += result.migratedRows
    totalInserted += result.insertedRows
    totalUpdated += result.updatedRows
    totalErrors += result.errors

    if (result.success) {
      tablesSucceeded++
    } else {
      tablesFailed++
    }
  }

  console.log('-'.repeat(60))
  console.log('\nSummary:')
  console.log(`  Total Tables:      ${results.length}`)
  console.log(`  Succeeded:         ${tablesSucceeded}`)
  console.log(`  Failed:            ${tablesFailed}`)
  console.log(`  Total Source Rows: ${totalSourceRows.toLocaleString()}`)
  console.log(`  Total Migrated:    ${totalMigratedRows.toLocaleString()}`)
  console.log(`  Inserted:          ${totalInserted.toLocaleString()}`)
  console.log(`  Updated:           ${totalUpdated.toLocaleString()}`)
  console.log(`  Errors:            ${totalErrors.toLocaleString()}`)
  console.log(`  Duration:          ${(totalDurationMs / 1000).toFixed(2)}s`)

  if (totalErrors > 0) {
    console.log('\nError Details:')
    for (const result of results) {
      if (result.errorDetails.length > 0) {
        console.log(`\n  ${result.tableName}:`)
        for (const error of result.errorDetails.slice(0, 5)) {
          console.log(`    - Row ${error.rowId}: ${error.error}`)
        }
        if (result.errorDetails.length > 5) {
          console.log(`    ... and ${result.errorDetails.length - 5} more errors`)
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60))

  // Final status
  if (tablesFailed === 0 && totalErrors === 0) {
    console.log('\x1b[32mMIGRATION COMPLETED SUCCESSFULLY\x1b[0m')
  } else if (tablesFailed === 0) {
    console.log('\x1b[33mMIGRATION COMPLETED WITH WARNINGS\x1b[0m')
  } else {
    console.log('\x1b[31mMIGRATION FAILED\x1b[0m')
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  console.log('='.repeat(60))
  console.log('RAWDOG Data Migration')
  console.log('='.repeat(60))
  console.log('')

  // Validate environment
  const envValidation = validateEnvironment()
  if (!envValidation.valid) {
    console.error('\x1b[31m[ERROR] Missing required environment variables:\x1b[0m')
    for (const missing of envValidation.missing) {
      console.error(`  - ${missing}`)
    }
    process.exit(1)
  }

  console.log('[ENV] Environment variables validated')

  // Check database connections
  console.log('[DB] Checking database connections...')

  const sourceOk = await checkSourceConnection()
  if (!sourceOk) {
    console.error('\x1b[31m[ERROR] Cannot connect to source database (RAWDOG)\x1b[0m')
    process.exit(1)
  }
  console.log('  Source (RAWDOG): \x1b[32mConnected\x1b[0m')

  const destOk = await checkDestinationConnection()
  if (!destOk) {
    console.error('\x1b[31m[ERROR] Cannot connect to destination database (CGK)\x1b[0m')
    process.exit(1)
  }
  console.log('  Destination (CGK): \x1b[32mConnected\x1b[0m')

  const tenantSlug = 'rawdog'

  // Check/create tenant schema
  const schemaExists = await tenantSchemaExists(tenantSlug)
  if (!schemaExists) {
    if (args.dryRun) {
      console.log(`[DRY-RUN] Would create schema "tenant_${tenantSlug}"`)
    } else {
      await createTenantSchema(tenantSlug)
    }
  } else {
    console.log(`[SCHEMA] Schema "tenant_${tenantSlug}" exists`)
  }

  // Ensure organization record
  if (!args.dryRun) {
    await ensureOrganizationRecord(tenantSlug, 'RAWDOG')
  } else {
    console.log('[DRY-RUN] Would ensure organization record for "rawdog"')
  }

  // Determine which tables to migrate
  let tablesToMigrate: MigratableTable[]
  if (args.specificTable) {
    if (!TABLE_MIGRATION_ORDER.includes(args.specificTable as MigratableTable)) {
      console.error(`\x1b[31m[ERROR] Unknown table: ${args.specificTable}\x1b[0m`)
      console.error('Available tables:', TABLE_MIGRATION_ORDER.join(', '))
      process.exit(1)
    }
    tablesToMigrate = [args.specificTable as MigratableTable]
  } else {
    tablesToMigrate = [...TABLE_MIGRATION_ORDER]
  }

  console.log(`\n[PLAN] Tables to migrate: ${tablesToMigrate.length}`)
  console.log(`[PLAN] Batch size: ${BATCH_SIZE}`)

  if (args.dryRun) {
    console.log('\n[DRY-RUN] Migration plan:')
    for (let i = 0; i < tablesToMigrate.length; i++) {
      const table = tablesToMigrate[i]
      if (!table) continue
      const target = TABLE_TARGET_NAMES[table] ?? table
      console.log(`  ${i + 1}. ${table}${target !== table ? ` -> ${target}` : ''}`)
    }
    console.log('\n[DRY-RUN] No data was modified.')
    await closeConnections()
    process.exit(0)
  }

  // Create state manager for resumability
  const stateManager = createFileStateManager('.migration-state.json')

  // Check for existing state if resuming
  if (args.resume) {
    const existingStates = await stateManager.getAllStates()
    const completedTables = existingStates
      .filter((s) => s.status === 'completed')
      .map((s) => s.tableName)

    if (completedTables.length > 0) {
      console.log(`\n[RESUME] Skipping ${completedTables.length} completed tables:`)
      for (const table of completedTables) {
        console.log(`  - ${table}`)
      }
      tablesToMigrate = tablesToMigrate.filter(
        (t) => !completedTables.includes(t)
      )
    }
  } else {
    // Clear state for fresh migration
    await stateManager.clearAllStates()
  }

  if (tablesToMigrate.length === 0) {
    console.log('\n[DONE] All tables already migrated!')
    await closeConnections()
    process.exit(0)
  }

  // Run migration
  console.log('\n[START] Beginning migration...\n')
  const startTime = Date.now()
  const results: MigrateTableResult[] = []

  for (let i = 0; i < tablesToMigrate.length; i++) {
    const sourceTable = tablesToMigrate[i]
    if (!sourceTable) continue

    const targetTable = TABLE_TARGET_NAMES[sourceTable] ?? sourceTable
    const primaryKey = TABLE_PRIMARY_KEYS[sourceTable]
    const sensitiveColumns = SENSITIVE_COLUMNS[sourceTable]
    const addTenantId = TABLES_WITH_TENANT_ID.includes(sourceTable)

    console.log(`[${i + 1}/${tablesToMigrate.length}] ${sourceTable}${targetTable !== sourceTable ? ` -> ${targetTable}` : ''}`)

    // Check for existing state for resumption
    const existingState = await stateManager.getState(sourceTable)
    const startOffset = existingState?.status === 'in_progress'
      ? existingState.offset
      : 0

    if (startOffset > 0) {
      console.log(`  [RESUME] Continuing from offset ${startOffset}`)
    }

    const result = await migrateTable({
      sourceTable,
      targetTable,
      tenantSlug,
      primaryKey,
      startOffset,
      continueOnError: true,
      encryptSensitive: true,
      sensitiveColumns,
      addTenantId,
      onProgress: async (state) => {
        await stateManager.saveState(state)
      },
    })

    results.push(result)

    // Save final state
    await stateManager.saveState({
      tableName: sourceTable,
      status: result.success ? 'completed' : 'failed',
      offset: result.finalOffset,
      totalRows: result.totalSourceRows,
      migratedRows: result.migratedRows,
      errors: result.errors,
      completedAt: new Date().toISOString(),
      lastError: result.errorDetails[0]?.error,
    })

    console.log('')
  }

  const totalDurationMs = Date.now() - startTime

  // Generate report
  generateReport(results, totalDurationMs)

  // Cleanup
  await closeConnections()

  // Exit with appropriate code
  const anyFailed = results.some((r) => !r.success)
  process.exit(anyFailed ? 1 : 0)
}

// Run migration
main().catch((error) => {
  console.error('\x1b[31m[FATAL ERROR]\x1b[0m', error)
  closeConnections().finally(() => process.exit(1))
})
