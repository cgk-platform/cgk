#!/usr/bin/env node
/**
 * Migration Rollback Script
 *
 * Removes a tenant schema and organization record from the destination database.
 * USE WITH CAUTION - this permanently deletes all migrated data.
 *
 * Usage:
 *   npx tsx tooling/migrations/rollback.ts [options]
 *
 * Options:
 *   --tenant <slug>     Tenant slug to rollback (required)
 *   --confirm           Skip confirmation prompt (dangerous!)
 *   --keep-org          Keep organization record, only drop schema
 */

import 'dotenv/config'
import * as readline from 'readline'
import { validateEnvironment, getConnectionUrl } from './config.js'
import {
  getDestinationPool,
  tenantSchemaExists,
  closeConnections,
} from './lib/db-client.js'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

interface RollbackOptions {
  tenant: string
  confirm: boolean
  keepOrg: boolean
}

/**
 * Parse CLI arguments
 */
function parseArgs(): RollbackOptions {
  const args = process.argv.slice(2)
  const options: RollbackOptions = {
    tenant: '',
    confirm: false,
    keepOrg: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--tenant':
        options.tenant = args[++i] ?? ''
        break
      case '--confirm':
        options.confirm = true
        break
      case '--keep-org':
        options.keepOrg = true
        break
      case '--help':
      case '-h':
        console.log(`
Migration Rollback Script

${colors.red}${colors.bold}WARNING: This permanently deletes all migrated data!${colors.reset}

Usage:
  npx tsx tooling/migrations/rollback.ts [options]

Options:
  --tenant <slug>     Tenant slug to rollback (required)
  --confirm           Skip confirmation prompt (dangerous!)
  --keep-org          Keep organization record, only drop schema
  --help, -h          Show this help message

Example:
  npx tsx tooling/migrations/rollback.ts --tenant rawdog
`)
        process.exit(0)
    }
  }

  if (!options.tenant) {
    console.error(
      `${colors.red}Error: --tenant is required${colors.reset}`
    )
    console.log('Use --help for usage information')
    process.exit(1)
  }

  return options
}

/**
 * Prompt for confirmation
 */
async function promptConfirmation(tenant: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    console.log()
    console.log(
      `${colors.red}${colors.bold}WARNING: This will permanently delete:${colors.reset}`
    )
    console.log(`  - Schema: tenant_${tenant}`)
    console.log(`  - Organization record for: ${tenant}`)
    console.log()
    console.log(`${colors.yellow}This action cannot be undone!${colors.reset}`)
    console.log()

    rl.question(
      `Type "${tenant}" to confirm rollback: `,
      (answer) => {
        rl.close()
        resolve(answer === tenant)
      }
    )
  })
}

/**
 * Get table count in schema
 */
async function getTableCount(schemaName: string): Promise<number> {
  const pool = getDestinationPool()
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1`,
    [schemaName]
  )
  return parseInt(result.rows[0]?.count ?? '0', 10)
}

/**
 * Get total row count across all tables in schema
 */
async function getTotalRowCount(schemaName: string): Promise<number> {
  const pool = getDestinationPool()

  // Get all tables in schema
  const tablesResult = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    [schemaName]
  )

  let totalRows = 0
  for (const row of tablesResult.rows) {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${schemaName}.${row.table_name}`
    )
    totalRows += parseInt(countResult.rows[0]?.count ?? '0', 10)
  }

  return totalRows
}

/**
 * Drop tenant schema
 */
async function dropSchema(tenant: string): Promise<void> {
  const pool = getDestinationPool()
  const schemaName = `tenant_${tenant}`

  console.log(`${colors.cyan}Dropping schema: ${schemaName}...${colors.reset}`)

  await pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)

  console.log(`${colors.green}Schema dropped successfully.${colors.reset}`)
}

/**
 * Remove organization record
 */
async function removeOrganization(tenant: string): Promise<boolean> {
  const pool = getDestinationPool()

  console.log(
    `${colors.cyan}Removing organization record...${colors.reset}`
  )

  const result = await pool.query(
    `DELETE FROM public.organizations WHERE slug = $1`,
    [tenant]
  )

  if ((result.rowCount ?? 0) > 0) {
    console.log(
      `${colors.green}Organization record removed.${colors.reset}`
    )
    return true
  } else {
    console.log(
      `${colors.yellow}No organization record found for: ${tenant}${colors.reset}`
    )
    return false
  }
}

/**
 * Run rollback
 */
async function runRollback(options: RollbackOptions): Promise<void> {
  // Validate environment
  const envCheck = validateEnvironment()
  if (!envCheck.valid) {
    // For rollback, we only need destination
    if (envCheck.missing.includes('POSTGRES_URL')) {
      throw new Error('POSTGRES_URL environment variable is required')
    }
  }

  const destUrl = getConnectionUrl('destination')
  if (!destUrl) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }

  // Check if schema exists
  const schemaName = `tenant_${options.tenant}`
  const schemaExists_var = await tenantSchemaExists(options.tenant)

  if (!schemaExists_var) {
    console.log(
      `${colors.yellow}Schema "${schemaName}" does not exist.${colors.reset}`
    )

    if (!options.keepOrg) {
      console.log('Checking for organization record...')
      await removeOrganization(options.tenant)
    }

    console.log(
      `${colors.green}Rollback complete (nothing to do).${colors.reset}`
    )
    return
  }

  // Get stats
  const tableCount = await getTableCount(schemaName)
  const rowCount = await getTotalRowCount(schemaName)

  console.log()
  console.log(`${colors.bold}Schema: ${schemaName}${colors.reset}`)
  console.log(`  Tables: ${tableCount}`)
  console.log(`  Total rows: ${rowCount.toLocaleString()}`)
  console.log()

  // Confirm if needed
  if (!options.confirm) {
    const confirmed = await promptConfirmation(options.tenant)
    if (!confirmed) {
      console.log(`${colors.yellow}Rollback cancelled.${colors.reset}`)
      return
    }
  }

  // Perform rollback
  console.log()
  console.log(`${colors.cyan}Starting rollback...${colors.reset}`)
  console.log()

  // Drop schema
  await dropSchema(options.tenant)

  // Remove organization record
  if (!options.keepOrg) {
    await removeOrganization(options.tenant)
  }

  console.log()
  console.log(
    `${colors.green}${colors.bold}Rollback complete for tenant: ${options.tenant}${colors.reset}`
  )
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs()

  try {
    await runRollback(options)
    process.exit(0)
  } catch (error) {
    console.error(
      `${colors.red}Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`
    )
    process.exit(1)
  } finally {
    await closeConnections()
  }
}

// Run if executed directly
main()
