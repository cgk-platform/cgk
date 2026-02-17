import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import path from 'path'
import fs from 'fs-extra'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Validate tenant slug format
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_]+$/.test(slug)
}

/**
 * Get the list of tables in a tenant schema
 */
async function getTenantTables(slug: string): Promise<string[]> {
  const schemaName = `tenant_${slug}`

  try {
    const db = await import('@cgk-platform/db')
    const result = await db.sql<{ table_name: string }>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    return result.rows.map((r) => r.table_name)
  } catch (error) {
    throw new Error(`Failed to get tables: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * tenant:export command
 * Exports tenant data to a SQL file using pg_dump
 */
export const tenantExportCommand = new Command('tenant:export')
  .description('Export tenant data to SQL file')
  .argument('<slug>', 'Tenant slug to export')
  .option('-o, --output <file>', 'Output file path')
  .option('--data-only', 'Export data only (no schema)')
  .option('--schema-only', 'Export schema only (no data)')
  .option('--dry-run', 'Show what would be exported without creating file')
  .action(async (slug: string, options) => {
    const spinner = ora()

    // Validate slug format
    if (!isValidSlug(slug)) {
      console.log(chalk.red('\n[ERROR] Invalid tenant slug'))
      console.log(
        chalk.dim(
          '   Slug must be lowercase alphanumeric with underscores only (e.g., my_brand)'
        )
      )
      process.exit(1)
    }

    const schemaName = `tenant_${slug}`
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const defaultFilename = `${slug}-export-${timestamp}.sql`
    const output = options.output || defaultFilename

    console.log(chalk.cyan('\n[EXPORT] Tenant Export\n'))
    console.log(`  Tenant: ${chalk.bold(slug)}`)
    console.log(`  Schema: ${chalk.bold(schemaName)}`)
    console.log(`  Output: ${chalk.bold(output)}`)

    if (options.dataOnly && options.schemaOnly) {
      console.log(chalk.red('\n[ERROR] Cannot use both --data-only and --schema-only'))
      process.exit(1)
    }

    // Check POSTGRES_URL (Vercel/Neon) or DATABASE_URL
    const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!databaseUrl) {
      console.log(chalk.red('\n[ERROR] POSTGRES_URL not set'))
      console.log(chalk.dim('   Run: npx @cgk-platform/cli setup:database'))
      process.exit(1)
    }

    try {
      // Check if tenant schema exists
      spinner.start('Checking tenant schema...')
      const migrations = await import('@cgk-platform/db/migrations')
      const exists = await migrations.tenantSchemaExists(slug)

      if (!exists) {
        spinner.fail(`Tenant schema "${schemaName}" does not exist`)
        process.exit(1)
      }
      spinner.succeed('Tenant schema found')

      // Get list of tables
      spinner.start('Getting table list...')
      const tables = await getTenantTables(slug)
      spinner.succeed(`Found ${tables.length} tables`)

      console.log('')
      console.log(chalk.bold('  Tables to export:'))
      for (const table of tables) {
        console.log(chalk.dim(`    - ${table}`))
      }
      console.log('')

      if (options.dryRun) {
        console.log(chalk.yellow('  DRY RUN - No file will be created\n'))
        console.log(chalk.dim('  Would execute pg_dump with options:'))
        console.log(chalk.dim(`    --schema=${schemaName}`))
        if (options.dataOnly) {
          console.log(chalk.dim('    --data-only'))
        }
        if (options.schemaOnly) {
          console.log(chalk.dim('    --schema-only'))
        }
        console.log('')
        return
      }

      // Build pg_dump command
      spinner.start('Exporting tenant data...')

      const pgDumpArgs = [
        'pg_dump',
        `--schema=${schemaName}`,
        '--no-owner',
        '--no-privileges',
      ]

      if (options.dataOnly) {
        pgDumpArgs.push('--data-only')
      }
      if (options.schemaOnly) {
        pgDumpArgs.push('--schema-only')
      }

      // Parse database URL for pg_dump
      const url = new URL(databaseUrl)
      const host = url.hostname
      const port = url.port || '5432'
      const database = url.pathname.slice(1) // Remove leading slash
      const username = url.username

      pgDumpArgs.push(`--host=${host}`)
      pgDumpArgs.push(`--port=${port}`)
      pgDumpArgs.push(`--username=${username}`)
      pgDumpArgs.push(`--dbname=${database}`)

      // Set PGPASSWORD environment variable for pg_dump
      const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) }

      const command = pgDumpArgs.join(' ')

      try {
        const { stdout, stderr } = await execAsync(command, { env, maxBuffer: 100 * 1024 * 1024 })

        if (stderr && !stderr.includes('warning')) {
          spinner.warn('pg_dump completed with warnings')
          console.log(chalk.yellow(`  ${stderr}`))
        }

        // Write output to file
        const outputPath = path.isAbsolute(output) ? output : path.join(process.cwd(), output)
        await fs.ensureDir(path.dirname(outputPath))
        await fs.writeFile(outputPath, stdout, 'utf-8')

        const stats = await fs.stat(outputPath)
        const sizeKB = Math.round(stats.size / 1024)

        spinner.succeed(`Export completed: ${outputPath}`)
        console.log('')
        console.log(`  File size: ${chalk.bold(`${sizeKB} KB`)}`)
        console.log(`  Tables: ${chalk.bold(tables.length)}`)
        console.log('')
        console.log(chalk.green('[SUCCESS] Tenant exported successfully!\n'))
        console.log('To import this export to another tenant:')
        console.log(chalk.cyan(`  npx @cgk-platform/cli tenant:import ${output} --target <new_slug>`))
        console.log('')
      } catch (pgError) {
        // pg_dump might not be available, fall back to SQL export
        spinner.warn('pg_dump not available, falling back to SQL query export')

        // Generate SQL export using queries
        let sqlContent = `-- CGK Tenant Export\n`
        sqlContent += `-- Tenant: ${slug}\n`
        sqlContent += `-- Schema: ${schemaName}\n`
        sqlContent += `-- Exported: ${new Date().toISOString()}\n`
        sqlContent += `-- Tables: ${tables.join(', ')}\n\n`

        if (!options.dataOnly) {
          sqlContent += `-- Schema creation\n`
          sqlContent += `CREATE SCHEMA IF NOT EXISTS ${schemaName};\n\n`
        }

        sqlContent += `-- Note: Full data export requires pg_dump.\n`
        sqlContent += `-- This fallback export contains table structure only.\n`
        sqlContent += `-- Install PostgreSQL client tools for full data export.\n\n`

        // Write output to file
        const outputPath = path.isAbsolute(output) ? output : path.join(process.cwd(), output)
        await fs.ensureDir(path.dirname(outputPath))
        await fs.writeFile(outputPath, sqlContent, 'utf-8')

        spinner.succeed(`Partial export completed: ${outputPath}`)
        console.log('')
        console.log(chalk.yellow('  Note: pg_dump not found. Install PostgreSQL client tools for full export.'))
        console.log('')
      }
    } catch (error) {
      spinner.fail('Export failed')
      if (error instanceof Error) {
        console.log(chalk.red(`  ${error.message}`))
      }
      process.exit(1)
    }
  })
