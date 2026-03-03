/**
 * Auto-migrate command
 *
 * Automatically runs missing migrations on existing tenants.
 */

import { Command } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { autoMigrateAllTenants, autoMigrateTenant } from '@cgk-platform/db/migrations'
import { logger } from '@cgk-platform/logging'

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

        logger.info(chalk.bold('Migration Results:'))
        logger.info(chalk.green(`  Applied: ${result.applied}`))
        if (result.errors > 0) {
          logger.info(chalk.red(`  Errors: ${result.errors}`))
        }

        if (options.dryRun) {
          logger.info(chalk.yellow('  (Dry run - no changes made)'))
        }
      } else {
        // Migrate all tenants
        spinner.text = 'Migrating all tenants...'

        const result = await autoMigrateAllTenants({
          dryRun: options.dryRun,
        })

        spinner.succeed()

        logger.info(chalk.bold('Migration Summary:'))
        logger.info(`  Total tenants: ${result.total}`)
        logger.info(chalk.green(`  Succeeded: ${result.succeeded}`))
        if (result.failed > 0) {
          logger.info(chalk.red(`  Failed: ${result.failed}`))
        }

        if (options.dryRun) {
          logger.info(chalk.yellow('  (Dry run - no changes made)'))
        }

        logger.info(chalk.bold('Details:'))
        result.details.forEach((detail) => {
          if (detail.applied > 0 || detail.errors > 0) {
            const status =
              detail.errors > 0
                ? chalk.red(`✗ ${detail.errors} errors`)
                : chalk.green(`✓ ${detail.applied} applied`)
            logger.info(`  ${detail.slug}: ${status}`)
          }
        })
      }
    } catch (error) {
      spinner.fail()
      logger.error(chalk.red('Auto-migration failed:'))
      logger.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  })
