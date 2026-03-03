/**
 * Auto-migrate command
 *
 * Automatically runs missing migrations on existing tenants.
 */

import { Command } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { autoMigrateAllTenants, autoMigrateTenant } from '@cgk-platform/db/migrations'

export const migrateAutoCommand = new Command('migrate:auto')
  .description('Automatically run missing migrations on existing tenants')
  .option('--tenant <slug>', 'Migrate specific tenant only')
  .option('--dry-run', 'Show what would be migrated without applying')
  .action(async (options) => {
    const spinner = ora('Checking for pending migrations...').start()

    try {
      if (options.tenant) {
        // Migrate single tenant
        spinner.text = `Migrating tenant: ${options.tenant}...`

        const result = await autoMigrateTenant(options.tenant, {
          dryRun: options.dryRun,
        })

        spinner.succeed()

        console.log()
        console.log(chalk.bold('Migration Results:'))
        console.log(chalk.green(`  Applied: ${result.applied}`))
        if (result.errors > 0) {
          console.log(chalk.red(`  Errors: ${result.errors}`))
        }

        if (options.dryRun) {
          console.log()
          console.log(chalk.yellow('  (Dry run - no changes made)'))
        }
      } else {
        // Migrate all tenants
        spinner.text = 'Migrating all tenants...'

        const result = await autoMigrateAllTenants({
          dryRun: options.dryRun,
        })

        spinner.succeed()

        console.log()
        console.log(chalk.bold('Migration Summary:'))
        console.log(`  Total tenants: ${result.total}`)
        console.log(chalk.green(`  Succeeded: ${result.succeeded}`))
        if (result.failed > 0) {
          console.log(chalk.red(`  Failed: ${result.failed}`))
        }

        if (options.dryRun) {
          console.log()
          console.log(chalk.yellow('  (Dry run - no changes made)'))
        }

        console.log()
        console.log(chalk.bold('Details:'))
        result.details.forEach((detail) => {
          if (detail.applied > 0 || detail.errors > 0) {
            const status =
              detail.errors > 0
                ? chalk.red(`✗ ${detail.errors} errors`)
                : chalk.green(`✓ ${detail.applied} applied`)
            console.log(`  ${detail.slug}: ${status}`)
          }
        })
      }
    } catch (error) {
      spinner.fail()
      console.error()
      console.error(chalk.red('Auto-migration failed:'))
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  })
