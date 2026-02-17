import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import path from 'path'
import fs from 'fs-extra'
import inquirer from 'inquirer'

/**
 * Validate tenant slug format
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_]+$/.test(slug)
}

/**
 * Parse SQL file to extract metadata and validate
 */
async function parseExportFile(filePath: string): Promise<{
  content: string
  sourceSlug?: string
  sourceSchema?: string
  exportDate?: string
  tables?: string[]
}> {
  const content = await fs.readFile(filePath, 'utf-8')

  // Extract metadata from comments
  const slugMatch = content.match(/-- Tenant: ([a-z0-9_]+)/i)
  const schemaMatch = content.match(/-- Schema: (tenant_[a-z0-9_]+)/i)
  const dateMatch = content.match(/-- Exported: ([\d\-T:.Z]+)/i)
  const tablesMatch = content.match(/-- Tables: (.+)/i)

  return {
    content,
    sourceSlug: slugMatch?.[1],
    sourceSchema: schemaMatch?.[1],
    exportDate: dateMatch?.[1],
    tables: tablesMatch?.[1]?.split(', ').map((t) => t.trim()),
  }
}

/**
 * Rewrite SQL content to target a different schema
 */
function rewriteSchemaReferences(
  content: string,
  sourceSchema: string,
  targetSchema: string
): string {
  // Replace schema references
  return content
    .replace(new RegExp(`\\b${sourceSchema}\\b`, 'g'), targetSchema)
    .replace(new RegExp(`SET search_path TO ${sourceSchema}`, 'g'), `SET search_path TO ${targetSchema}`)
}

/**
 * tenant:import command
 * Imports tenant data from a SQL file
 */
export const tenantImportCommand = new Command('tenant:import')
  .description('Import tenant data from SQL file')
  .argument('<file>', 'SQL file to import')
  .option('--target <slug>', 'Target tenant slug (required)')
  .option('--dry-run', 'Show what would be imported without executing')
  .option('--yes, -y', 'Skip confirmation prompt')
  .option('--create-tenant', 'Create the target tenant if it does not exist')
  .action(async (file: string, options) => {
    const spinner = ora()

    // Validate file path
    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file)

    if (!(await fs.pathExists(filePath))) {
      console.log(chalk.red('\n[ERROR] File not found'))
      console.log(chalk.dim(`   Path: ${filePath}`))
      process.exit(1)
    }

    // Require target slug
    if (!options.target) {
      console.log(chalk.red('\n[ERROR] Target tenant slug is required'))
      console.log(chalk.dim('   Use --target <slug> to specify the target tenant'))
      process.exit(1)
    }

    const targetSlug = options.target

    // Validate target slug format
    if (!isValidSlug(targetSlug)) {
      console.log(chalk.red('\n[ERROR] Invalid target tenant slug'))
      console.log(
        chalk.dim(
          '   Slug must be lowercase alphanumeric with underscores only (e.g., my_brand)'
        )
      )
      process.exit(1)
    }

    const targetSchema = `tenant_${targetSlug}`

    console.log(chalk.cyan('\n[IMPORT] Tenant Import\n'))
    console.log(`  File: ${chalk.bold(filePath)}`)
    console.log(`  Target: ${chalk.bold(targetSlug)}`)
    console.log(`  Schema: ${chalk.bold(targetSchema)}`)

    // Check POSTGRES_URL (Vercel/Neon) or DATABASE_URL
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      console.log(chalk.red('\n[ERROR] POSTGRES_URL not set'))
      console.log(chalk.dim('   Run: npx @cgk-platform/cli setup:database'))
      process.exit(1)
    }

    try {
      // Parse export file
      spinner.start('Parsing export file...')
      const exportData = await parseExportFile(filePath)
      spinner.succeed('Export file parsed')

      // Show export metadata
      if (exportData.sourceSlug || exportData.exportDate) {
        console.log('')
        console.log(chalk.bold('  Export metadata:'))
        if (exportData.sourceSlug) {
          console.log(chalk.dim(`    Source tenant: ${exportData.sourceSlug}`))
        }
        if (exportData.sourceSchema) {
          console.log(chalk.dim(`    Source schema: ${exportData.sourceSchema}`))
        }
        if (exportData.exportDate) {
          console.log(chalk.dim(`    Export date: ${new Date(exportData.exportDate).toLocaleString()}`))
        }
        if (exportData.tables && exportData.tables.length > 0) {
          console.log(chalk.dim(`    Tables: ${exportData.tables.length}`))
          for (const table of exportData.tables.slice(0, 10)) {
            console.log(chalk.dim(`      - ${table}`))
          }
          if (exportData.tables.length > 10) {
            console.log(chalk.dim(`      ... and ${exportData.tables.length - 10} more`))
          }
        }
      }
      console.log('')

      // Check if target tenant exists
      spinner.start('Checking target tenant...')
      const migrations = await import('@cgk-platform/db/migrations')
      const targetExists = await migrations.tenantSchemaExists(targetSlug)

      if (!targetExists) {
        spinner.warn(`Target tenant "${targetSlug}" does not exist`)

        if (options.createTenant) {
          spinner.start('Creating target tenant...')
          const results = await migrations.createTenantSchema(targetSlug)
          const failed = results.filter((r) => !r.success)

          if (failed.length > 0) {
            spinner.fail('Failed to create target tenant')
            for (const f of failed) {
              console.log(chalk.red(`  [ERROR] ${f.migration.name}: ${f.error}`))
            }
            process.exit(1)
          }

          spinner.succeed(`Created target tenant "${targetSlug}" (${results.length} migrations)`)

          // Also create organization record
          const db = await import('@cgk-platform/db')
          const displayName = targetSlug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          await db.sql`
            INSERT INTO public.organizations (slug, name, status)
            VALUES (${targetSlug}, ${displayName}, 'active')
            ON CONFLICT (slug) DO NOTHING
          `
        } else {
          console.log('')
          console.log(chalk.yellow('  Use --create-tenant to create the target tenant'))
          console.log(chalk.dim('  Or create it manually with: npx @cgk-platform/cli tenant:create ' + targetSlug))
          process.exit(1)
        }
      } else {
        spinner.succeed('Target tenant exists')
      }

      // Warn about data overwrite
      if (!options.dryRun && !options.yes) {
        console.log('')
        console.log(chalk.yellow('  [WARNING] This will import data into the target tenant.'))
        console.log(chalk.yellow('  Existing data may be affected if there are conflicts.'))
        console.log('')

        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Import into "${targetSlug}"?`,
            default: false,
          },
        ])

        if (!proceed) {
          console.log(chalk.dim('\n  Import cancelled.\n'))
          return
        }
      }

      // Prepare SQL content
      let sqlContent = exportData.content

      // Rewrite schema references if importing from a different schema
      if (exportData.sourceSchema && exportData.sourceSchema !== targetSchema) {
        spinner.start('Rewriting schema references...')
        sqlContent = rewriteSchemaReferences(sqlContent, exportData.sourceSchema, targetSchema)
        spinner.succeed('Schema references updated')
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\n  DRY RUN - No changes will be made\n'))
        console.log(chalk.dim('  Would execute SQL import with:'))
        console.log(chalk.dim(`    Target schema: ${targetSchema}`))
        console.log(chalk.dim(`    SQL content: ${sqlContent.length} characters`))

        // Show first few lines
        const previewLines = sqlContent.split('\n').slice(0, 20)
        console.log('')
        console.log(chalk.dim('  Preview:'))
        for (const line of previewLines) {
          console.log(chalk.dim(`    ${line}`))
        }
        if (sqlContent.split('\n').length > 20) {
          console.log(chalk.dim('    ... (truncated)'))
        }
        console.log('')
        return
      }

      // Execute the import
      spinner.start('Importing data...')

      const db = await import('@cgk-platform/db')

      // Split SQL content into statements and execute
      // This is a simplified approach - for complex imports, pg_restore should be used
      const statements = sqlContent
        .split(/;\s*\n/)
        .filter((s) => s.trim() && !s.trim().startsWith('--'))

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const statement of statements) {
        const trimmed = statement.trim()
        if (!trimmed) continue

        try {
          await db.sql.query(trimmed)
          successCount++
        } catch (error) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : String(error)
          errors.push(`Statement failed: ${trimmed.slice(0, 100)}... - ${errorMessage}`)

          // Continue on duplicate key errors (data already exists)
          if (!errorMessage.includes('duplicate key') && !errorMessage.includes('already exists')) {
            // For non-duplicate errors, log but continue
            spinner.text = `Importing data... (${successCount} succeeded, ${errorCount} failed)`
          }
        }
      }

      if (errorCount === 0) {
        spinner.succeed(`Import completed: ${successCount} statements executed`)
      } else {
        spinner.warn(`Import completed with errors: ${successCount} succeeded, ${errorCount} failed`)

        if (errors.length > 0) {
          console.log('')
          console.log(chalk.yellow('  Some statements failed:'))
          for (const error of errors.slice(0, 5)) {
            console.log(chalk.dim(`    - ${error.slice(0, 150)}`))
          }
          if (errors.length > 5) {
            console.log(chalk.dim(`    ... and ${errors.length - 5} more errors`))
          }
        }
      }

      console.log('')
      console.log(chalk.green('[SUCCESS] Import completed!\n'))
      console.log('Verify the import:')
      console.log(chalk.cyan(`  npx @cgk-platform/cli tenant:list --status active`))
      console.log('')
    } catch (error) {
      spinner.fail('Import failed')
      if (error instanceof Error) {
        console.log(chalk.red(`  ${error.message}`))
      }
      process.exit(1)
    }
  })
