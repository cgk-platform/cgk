import path from 'path'

import chalk from 'chalk'
import { Command } from 'commander'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'

export const migrateCommand = new Command('migrate')
  .description('Run database migrations')
  .option('--status', 'Show migration status')
  .option('--rollback [count]', 'Rollback migrations (default: 1, or specify count)')
  .option('--dry-run', 'Show what would be run without executing')
  .option('--tenant <slug>', 'Run migrations for a specific tenant schema')
  .option('--public-only', 'Only run public schema migrations')
  .option('--tenant-only', 'Only run tenant schema migrations (requires --tenant)')
  .action(async (options) => {
    const spinner = ora()

    // Dynamic import to avoid loading db package at CLI startup
    const { getMigrationStatus, runPublicMigrations, runTenantMigrations, tenantSchemaExists } =
      await import('@cgk-platform/db/migrations')
    const { sql } = await import('@cgk-platform/db')

    if (options.status) {
      logger.info(chalk.cyan('\n📋 Migration Status\n'))

      try {
        // Get public schema status
        logger.info(chalk.bold('  Public Schema:'))
        const publicStatus = await getMigrationStatus('public')

        if (publicStatus.applied.length > 0) {
          logger.info('    Applied:')
          for (const migration of publicStatus.applied.slice(-5)) {
            const date = new Date(migration.applied_at).toLocaleDateString()
            logger.info(chalk.green(`      ✓ ${migration.name} (${date})`))
          }
          if (publicStatus.applied.length > 5) {
            logger.info(chalk.dim(`      ... and ${publicStatus.applied.length - 5} more`))
          }
        }

        if (publicStatus.pending.length > 0) {
          logger.info('    Pending:')
          for (const migration of publicStatus.pending.slice(0, 5)) {
            logger.info(chalk.yellow(`      ○ ${migration.name}`))
          }
          if (publicStatus.pending.length > 5) {
            logger.info(chalk.dim(`      ... and ${publicStatus.pending.length - 5} more`))
          }
        }

        if (publicStatus.pending.length === 0 && publicStatus.applied.length > 0) {
          logger.info(chalk.green('    ✓ All migrations applied'))
        }

        // If a specific tenant was requested, show its status
        if (options.tenant) {
          logger.info('')
          logger.info(chalk.bold(`  Tenant Schema (${options.tenant}):`))

          const exists = await tenantSchemaExists(options.tenant)
          if (!exists) {
            logger.info(chalk.yellow(`    Schema tenant_${options.tenant} does not exist`))
          } else {
            const tenantStatus = await getMigrationStatus(`tenant_${options.tenant}`)

            if (tenantStatus.applied.length > 0) {
              logger.info('    Applied:')
              for (const migration of tenantStatus.applied.slice(-5)) {
                const date = new Date(migration.applied_at).toLocaleDateString()
                logger.info(chalk.green(`      ✓ ${migration.name} (${date})`))
              }
              if (tenantStatus.applied.length > 5) {
                logger.info(chalk.dim(`      ... and ${tenantStatus.applied.length - 5} more`))
              }
            }

            if (tenantStatus.pending.length > 0) {
              logger.info('    Pending:')
              for (const migration of tenantStatus.pending.slice(0, 5)) {
                logger.info(chalk.yellow(`      ○ ${migration.name}`))
              }
              if (tenantStatus.pending.length > 5) {
                logger.info(chalk.dim(`      ... and ${tenantStatus.pending.length - 5} more`))
              }
            }

            if (tenantStatus.pending.length === 0 && tenantStatus.applied.length > 0) {
              logger.info(chalk.green('    ✓ All migrations applied'))
            }
          }
        } else {
          // Show list of all tenants
          const tenantsResult = await sql`
            SELECT slug FROM public.organizations WHERE status = 'active' ORDER BY slug
          `
          const tenants = tenantsResult.rows.map((r) => (r as { slug: string }).slug)

          if (tenants.length > 0) {
            logger.info('')
            logger.info(chalk.bold('  Active Tenants:'))
            for (const tenant of tenants.slice(0, 10)) {
              logger.info(chalk.dim(`    - ${tenant}`))
            }
            if (tenants.length > 10) {
              logger.info(chalk.dim(`    ... and ${tenants.length - 10} more`))
            }
            logger.info('')
            logger.info(chalk.dim('  Use --tenant <slug> to see tenant-specific status'))
          }
        }

        logger.info('')
      } catch (error) {
        logger.error(chalk.red('\n❌ Failed to get migration status'))
        logger.error(chalk.dim(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }

      return
    }

    if (options.rollback) {
      const rollbackCount = typeof options.rollback === 'string' ? parseInt(options.rollback, 10) : 1
      const isPublic = !options.tenant

      logger.info(chalk.yellow('\n⚠️  Rollback Warning\n'))
      logger.info('  Rollback is a destructive operation that removes migration records.')
      logger.info('  The actual database changes are NOT automatically reverted.')
      logger.info('  You must manually revert the SQL changes if needed.\n')

      try {
        const schema = options.tenant ? `tenant_${options.tenant}` : 'public'
        const status = await getMigrationStatus(schema)

        if (status.applied.length === 0) {
          logger.info(chalk.yellow('  No migrations to rollback.\n'))
          return
        }

        // Get the migrations to rollback (last N applied)
        const toRollback = status.applied.slice(-rollbackCount).reverse()

        logger.info(chalk.cyan(`  Migrations to rollback (${toRollback.length}):`))
        for (const migration of toRollback) {
          const date = new Date(migration.applied_at).toLocaleDateString()
          logger.info(chalk.red(`    ✗ ${migration.name} (applied ${date})`))
        }
        logger.info('')

        // Show the migration file content for reference
        const schemaDir = isPublic ? 'public' : 'tenant'
        const migrationsDir = path.join(
          process.cwd(),
          'packages/db/src/migrations',
          schemaDir
        )

        logger.info(chalk.cyan('  Migration file contents (for manual revert):'))
        for (const migration of toRollback) {
          const filename = `${String(migration.version).padStart(3, '0')}_${migration.name}.sql`
          const filepath = path.join(migrationsDir, filename)

          logger.info('')
          logger.info(chalk.bold(`  --- ${filename} ---`))

          if (await fs.pathExists(filepath)) {
            const content = await fs.readFile(filepath, 'utf-8')
            // Show first 30 lines or up to 2000 chars
            const lines = content.split('\n').slice(0, 30)
            const preview = lines.join('\n').slice(0, 2000)
            logger.info(chalk.dim(preview.split('\n').map((l) => `    ${l}`).join('\n')))
            if (content.length > preview.length) {
              logger.info(chalk.dim('    ... (truncated)'))
            }
          } else {
            logger.info(chalk.dim(`    (File not found: ${filepath})`))
          }
        }

        logger.info('')

        if (options.dryRun) {
          logger.info(chalk.yellow('  DRY RUN - No changes will be made\n'))
          logger.info(chalk.dim('  Would execute:'))
          for (const migration of toRollback) {
            logger.info(
              chalk.dim(`    DELETE FROM ${schema}.schema_migrations WHERE name = '${migration.name}';`)
            )
          }
          logger.info('')
          return
        }

        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Remove ${toRollback.length} migration record(s) from ${schema}?`,
            default: false,
          },
        ])

        if (!proceed) {
          logger.info(chalk.dim('\n  Rollback cancelled.\n'))
          return
        }

        // Perform the rollback
        spinner.start('Rolling back migrations...')

        for (const migration of toRollback) {
          await sql.query(`
            SET search_path TO ${schema};
            DELETE FROM schema_migrations WHERE name = '${migration.name}'
          `)
        }

        spinner.succeed(`Rolled back ${toRollback.length} migration(s)`)

        logger.info('')
        logger.info(chalk.yellow('  Important: The database schema was NOT automatically reverted.'))
        logger.info(chalk.yellow('  You may need to manually run SQL to undo the schema changes.'))
        logger.info('')
        logger.info(chalk.cyan('  Tips for manual revert:'))
        logger.info(chalk.dim('    - DROP TABLE IF EXISTS table_name;'))
        logger.info(chalk.dim('    - ALTER TABLE ... DROP COLUMN IF EXISTS column_name;'))
        logger.info(chalk.dim('    - DROP INDEX IF EXISTS index_name;'))
        logger.info(chalk.dim('    - DROP TYPE IF EXISTS enum_name;'))
        logger.info('')
      } catch (error) {
        spinner.fail('Rollback failed')
        logger.error(chalk.red('\n❌ Failed to rollback migrations'))
        logger.error(chalk.dim(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }

      return
    }

    // Run migrations
    logger.info(chalk.cyan('\n🔄 Running Migrations\n'))

    if (options.dryRun) {
      logger.info(chalk.yellow('  DRY RUN - No changes will be made\n'))
    }

    const runPublic = !options.tenantOnly
    const runTenant = !options.publicOnly && options.tenant

    // Run public migrations
    if (runPublic) {
      spinner.start('Running public schema migrations...')

      try {
        const results = await runPublicMigrations({
          dryRun: options.dryRun,
          onProgress: (migration, status) => {
            if (status === 'running') {
              spinner.text = `Running: ${migration.name}...`
            }
          },
        })

        const successful = results.filter((r) => r.success)
        const failed = results.filter((r) => !r.success)

        if (failed.length > 0 && failed[0]) {
          spinner.fail(`Public migrations failed: ${failed[0].migration.name}`)
          logger.error(chalk.red(`  Error: ${failed[0].error}`))
          process.exit(1)
        }

        if (successful.length > 0) {
          spinner.succeed(`Applied ${successful.length} public migrations`)
          for (const result of successful) {
            logger.info(chalk.green(`  ✓ ${result.migration.name} (${result.durationMs}ms)`))
          }
        } else {
          spinner.succeed('Public schema up to date')
        }
      } catch (error) {
        spinner.fail('Public migrations failed')
        logger.error(chalk.red(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }
    }

    // Run tenant migrations
    if (runTenant) {
      logger.info('')
      spinner.start(`Running tenant migrations for ${options.tenant}...`)

      try {
        const exists = await tenantSchemaExists(options.tenant)
        if (!exists) {
          spinner.warn(`Tenant schema ${options.tenant} does not exist, skipping`)
        } else {
          const results = await runTenantMigrations(options.tenant, {
            dryRun: options.dryRun,
            onProgress: (migration, status) => {
              if (status === 'running') {
                spinner.text = `Running: ${migration.name}...`
              }
            },
          })

          const successful = results.filter((r) => r.success)
          const failed = results.filter((r) => !r.success)

          if (failed.length > 0 && failed[0]) {
            spinner.fail(`Tenant migrations failed: ${failed[0].migration.name}`)
            logger.error(chalk.red(`  Error: ${failed[0].error}`))
            process.exit(1)
          }

          if (successful.length > 0) {
            spinner.succeed(`Applied ${successful.length} tenant migrations`)
            for (const result of successful) {
              logger.info(chalk.green(`  ✓ ${result.migration.name} (${result.durationMs}ms)`))
            }
          } else {
            spinner.succeed(`Tenant ${options.tenant} up to date`)
          }
        }
      } catch (error) {
        spinner.fail('Tenant migrations failed')
        logger.error(chalk.red(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }
    }

    logger.info(chalk.green('\n✅ Migration complete!\n'))
  })
