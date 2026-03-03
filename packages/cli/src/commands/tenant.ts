import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'

// Note: We dynamically import @cgk-platform/db to handle cases where DB isn't available

/**
 * Validate tenant slug format
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_]+$/.test(slug)
}

/**
 * tenant:create command
 * Creates a new tenant with its own database schema
 */
const createTenantCommand = new Command('tenant:create')
  .description('Create a new tenant with isolated database schema')
  .argument('<slug>', 'Tenant slug (lowercase alphanumeric + underscore)')
  .option('-n, --name <name>', 'Display name for the tenant')
  .option('--dry-run', 'Show what would be created without making changes')
  .action(async (slug: string, options) => {
    const spinner = ora()

    // Validate slug format
    if (!isValidSlug(slug)) {
      logger.info(chalk.red('\n❌ Invalid tenant slug'))
      logger.info(
        chalk.dim(
          '   Slug must be lowercase alphanumeric with underscores only (e.g., my_brand)'
        )
      )
      process.exit(1)
    }

    const displayName = options.name ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

    logger.info(chalk.cyan('\n🏗️  Creating Tenant\n'))
    logger.info(`  Slug: ${chalk.bold(slug)}`)
    logger.info(`  Name: ${chalk.bold(displayName)}`)
    logger.info(`  Schema: ${chalk.bold(`tenant_${slug}`)}`)

    if (options.dryRun) {
      logger.info(chalk.yellow('\n  DRY RUN - No changes will be made\n'))
      return
    }

    // Check POSTGRES_URL (Vercel/Neon) or DATABASE_URL
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      logger.info(chalk.red('\n❌ POSTGRES_URL not set'))
      logger.info(chalk.dim('   Run: npx @cgk-platform/cli setup:database'))
      process.exit(1)
    }

    try {
      // Dynamic import to handle missing dependency gracefully
      const db = await import('@cgk-platform/db')
      const migrations = await import('@cgk-platform/db/migrations')

      // Check if tenant already exists
      spinner.start('Checking if tenant exists...')
      const exists = await migrations.tenantSchemaExists(slug)

      if (exists) {
        spinner.fail(`Tenant "${slug}" already exists`)
        process.exit(1)
      }

      spinner.succeed('Tenant slug available')

      // Create tenant schema
      spinner.start('Creating tenant schema...')
      const results = await migrations.createTenantSchema(slug, {
        onProgress: (migration, status) => {
          if (status === 'running') {
            spinner.text = `Running migration: ${migration.name}...`
          }
        },
      })

      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        spinner.fail('Schema creation failed')
        for (const f of failed) {
          logger.info(chalk.red(`  ✗ ${f.migration.name}: ${f.error}`))
        }
        process.exit(1)
      }

      spinner.succeed(`Created schema tenant_${slug} (${results.length} migrations)`)

      // Create organization record
      spinner.start('Creating organization record...')
      await db.sql`
        INSERT INTO public.organizations (slug, name, status)
        VALUES (${slug}, ${displayName}, 'active')
        ON CONFLICT (slug) DO UPDATE SET name = ${displayName}
      `
      spinner.succeed('Created organization record')

      logger.info(chalk.green('\n✅ Tenant created successfully!\n'))
      logger.info('Next steps:')
      logger.info(
        chalk.cyan(`  1. Configure Shopify: Connect store in admin portal`)
      )
      logger.info(
        chalk.cyan(`  2. Configure Stripe: Connect payment processing`)
      )
      logger.info('')
    } catch (error) {
      spinner.fail('Failed to create tenant')
      if (error instanceof Error) {
        logger.info(chalk.red(`  ${error.message}`))
      }
      process.exit(1)
    }
  })

/**
 * tenant:list command
 * Lists all tenants in the platform
 */
const listTenantsCommand = new Command('tenant:list')
  .description('List all tenants')
  .option('--status <status>', 'Filter by status (active, suspended, onboarding)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    // Check POSTGRES_URL (Vercel/Neon) or DATABASE_URL
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      logger.info(chalk.red('\n❌ POSTGRES_URL not set'))
      logger.info(chalk.dim('   Run: npx @cgk-platform/cli setup:database'))
      process.exit(1)
    }

    try {
      const db = await import('@cgk-platform/db')

      interface Organization {
        id: string
        slug: string
        name: string
        status: string
        created_at: Date
      }

      let query = db.sql<Organization>`
        SELECT id, slug, name, status, created_at
        FROM public.organizations
        ORDER BY created_at DESC
      `

      if (options.status) {
        query = db.sql<Organization>`
          SELECT id, slug, name, status, created_at
          FROM public.organizations
          WHERE status = ${options.status}
          ORDER BY created_at DESC
        `
      }

      const result = await query

      if (options.json) {
        logger.info(JSON.stringify(result.rows, null, 2))
        return
      }

      if (result.rows.length === 0) {
        logger.info(chalk.yellow('\nNo tenants found.\n'))
        logger.info('Create one with:')
        logger.info(chalk.cyan('  npx @cgk-platform/cli tenant:create <slug> --name "Brand Name"'))
        logger.info('')
        return
      }

      logger.info(chalk.cyan('\n📋 Tenants\n'))

      for (const org of result.rows) {
        const statusIcon =
          org.status === 'active'
            ? chalk.green('●')
            : org.status === 'suspended'
              ? chalk.red('●')
              : chalk.yellow('○')

        logger.info(`  ${statusIcon} ${chalk.bold(org.name)}`)
        logger.info(chalk.dim(`     Slug: ${org.slug}`))
        logger.info(chalk.dim(`     Schema: tenant_${org.slug}`))
        logger.info(
          chalk.dim(
            `     Created: ${new Date(org.created_at).toLocaleDateString()}`
          )
        )
        logger.info('')
      }

      logger.info(chalk.dim(`  Total: ${result.rows.length} tenant(s)\n`))
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.info(chalk.yellow('\nNo tenants found (organizations table not created yet).\n'))
        logger.info('Run setup first:')
        logger.info(chalk.cyan('  npx @cgk-platform/cli setup:database'))
        logger.info('')
        return
      }

      logger.info(chalk.red('\n❌ Failed to list tenants'))
      if (error instanceof Error) {
        logger.info(chalk.dim(`   ${error.message}`))
      }
      process.exit(1)
    }
  })

/**
 * Parent tenant command group
 */
export const tenantCommand = new Command('tenant')
  .description('Manage tenants')
  .addCommand(createTenantCommand)
  .addCommand(listTenantsCommand)

// Also export individual commands for direct registration
export { createTenantCommand, listTenantsCommand }
