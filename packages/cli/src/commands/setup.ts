import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'

interface SetupStep {
  name: string
  description: string
  action: () => Promise<boolean>
}

export const setupCommand = new Command('setup')
  .description('Run platform setup wizard')
  .option('--database', 'Setup database only')
  .option('--cache', 'Setup cache only')
  .option('--skip-verification', 'Skip verification steps')
  .action(async (options) => {
    logger.info(chalk.cyan('\n🛠️  CGK Platform Setup Wizard\n'))
    logger.info(
      chalk.dim('This wizard will help you configure your CGK platform.\n')
    )

    const steps: SetupStep[] = []

    // Determine which steps to run
    if (options.database || (!options.database && !options.cache)) {
      steps.push({
        name: 'Database',
        description: 'Connect PostgreSQL (Neon)',
        action: setupDatabase,
      })
    }

    if (options.cache || (!options.database && !options.cache)) {
      steps.push({
        name: 'Cache',
        description: 'Connect Redis (Upstash)',
        action: setupCache,
      })
    }

    if (!options.database && !options.cache) {
      steps.push(
        {
          name: 'Migrations',
          description: 'Run database migrations',
          action: runMigrations,
        },
        {
          name: 'Admin User',
          description: 'Create super admin account',
          action: createAdminUser,
        },
        {
          name: 'Platform Config',
          description: 'Configure platform settings',
          action: configurePlatform,
        }
      )
    }

    // Run steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!
      logger.info(
        chalk.bold(`\nStep ${i + 1}/${steps.length}: ${step.name}`)
      )
      logger.info(chalk.dim(step.description))

      const success = await step.action()

      if (!success) {
        logger.info(chalk.red(`\n❌ Setup failed at step: ${step.name}`))
        logger.info(chalk.dim('Please fix the issue and run setup again.'))
        process.exit(1)
      }
    }

    logger.info(chalk.green('\n✅ Platform setup complete!\n'))
    logger.info('Next steps:')
    logger.info(chalk.cyan('  pnpm dev'))
    logger.info('')
  })

/**
 * setup:database command
 * Dedicated command for database setup, testing, and migrations
 */
export const setupDatabaseCommand = new Command('setup:database')
  .description('Setup database: test connection, run public migrations, verify')
  .option('--dry-run', 'Show what would be run without executing')
  .option('--skip-migrations', 'Skip running migrations')
  .action(async (options) => {
    logger.info(chalk.cyan('\n🗄️  Database Setup\n'))

    const spinner = ora()

    // Step 1: Check POSTGRES_URL (Vercel/Neon standard) or DATABASE_URL (fallback)
    logger.info(chalk.bold('Step 1: Checking environment'))

    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      logger.info(chalk.red('  ✗ POSTGRES_URL not set'))
      logger.info('')
      logger.info(chalk.dim('  To set up your database:'))
      logger.info(chalk.dim('  1. Add Neon integration in Vercel dashboard, OR'))
      logger.info(chalk.dim('  2. Create a database at https://neon.tech'))
      logger.info(chalk.dim('  3. Run: vercel env pull .env.local'))
      logger.info(chalk.dim('  4. Or add to .env.local manually:'))
      logger.info(chalk.cyan('     POSTGRES_URL=postgresql://...'))
      logger.info('')
      process.exit(1)
    }

    const envVarName = process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL'
    logger.info(chalk.green(`  ✓ ${envVarName} is set`))

    // Mask the connection string for display
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':***@')
    logger.info(chalk.dim(`    ${maskedUrl}`))

    // Step 2: Test connection
    logger.info(chalk.bold('\nStep 2: Testing connection'))
    spinner.start('Connecting to database...')

    try {
      const db = await import('@cgk-platform/db')
      await db.sql`SELECT 1`
      spinner.succeed('Database connection successful')
    } catch (error) {
      spinner.fail('Database connection failed')
      if (error instanceof Error) {
        logger.info(chalk.red(`  ${error.message}`))
      }
      logger.info('')
      logger.info(chalk.dim('  Common issues:'))
      logger.info(chalk.dim('  - Check that the connection string is correct'))
      logger.info(chalk.dim('  - Verify the database exists'))
      logger.info(chalk.dim('  - Check firewall/network settings'))
      logger.info('')
      process.exit(1)
    }

    if (options.skipMigrations) {
      logger.info(chalk.yellow('\n⚠ Skipping migrations (--skip-migrations flag)'))
      logger.info(chalk.green('\n✅ Database connection verified!\n'))
      return
    }

    // Step 3: Run public migrations
    logger.info(chalk.bold('\nStep 3: Running migrations'))

    if (options.dryRun) {
      logger.info(chalk.yellow('  DRY RUN - Showing pending migrations\n'))
    }

    try {
      const migrations = await import('@cgk-platform/db/migrations')
      const results = await migrations.runPublicMigrations({
        dryRun: options.dryRun,
        onProgress: (migration, status) => {
          if (status === 'running') {
            spinner.start(`${migration.name}...`)
          } else if (status === 'complete') {
            spinner.succeed(migration.name)
          } else if (status === 'error') {
            spinner.fail(migration.name)
          }
        },
      })

      if (results.length === 0) {
        logger.info(chalk.dim('  No pending migrations'))
      } else {
        const failed = results.filter((r) => !r.success)
        if (failed.length > 0) {
          logger.info(chalk.red(`\n❌ ${failed.length} migration(s) failed`))
          for (const f of failed) {
            logger.info(chalk.red(`  ${f.migration.name}: ${f.error}`))
          }
          process.exit(1)
        }

        const verb = options.dryRun ? 'would apply' : 'applied'
        logger.info(chalk.green(`\n  ${results.length} migration(s) ${verb}`))
      }
    } catch (error) {
      spinner.fail('Migration failed')
      if (error instanceof Error) {
        logger.info(chalk.red(`  ${error.message}`))
      }
      process.exit(1)
    }

    // Step 4: Verify
    logger.info(chalk.bold('\nStep 4: Verifying setup'))
    spinner.start('Checking tables...')

    try {
      const db = await import('@cgk-platform/db')
      const result = await db.sql<{ table_name: string }>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `

      const tables = result.rows.map((r) => r.table_name)
      spinner.succeed(`Found ${tables.length} tables in public schema`)

      // Check for required tables
      const required = [
        'platform_config',
        'organizations',
        'users',
        'sessions',
      ]
      const missing = required.filter((t) => !tables.includes(t))

      if (missing.length > 0) {
        logger.info(chalk.yellow(`  ⚠ Missing tables: ${missing.join(', ')}`))
      } else {
        logger.info(chalk.green('  ✓ All required tables present'))
      }
    } catch {
      spinner.fail('Verification failed')
    }

    logger.info(chalk.green('\n✅ Database setup complete!\n'))
    logger.info('Next steps:')
    logger.info(chalk.cyan('  npx @cgk-platform/cli tenant:create <slug> --name "Brand Name"'))
    logger.info('')
  })

async function setupDatabase(): Promise<boolean> {
  const spinner = ora()

  // Check for existing DATABASE_URL
  // Check for POSTGRES_URL (Vercel/Neon) or DATABASE_URL (fallback)
  const existingUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (existingUrl) {
    const envVarName = process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL'
    logger.info(chalk.green(`  ${envVarName} already set`))

    if (!existingUrl.includes('neon') && !existingUrl.includes('postgres')) {
      logger.info(
        chalk.yellow('  ⚠ Warning: Expected Neon PostgreSQL URL')
      )
    }

    // Test connection
    spinner.start('Testing database connection...')
    try {
      const db = await import('@cgk-platform/db')
      await db.sql`SELECT 1`
      spinner.succeed('Database connection successful')
      return true
    } catch {
      spinner.fail('Database connection failed')
      return false
    }
  }

  // No database URL - prompt for it
  const { connectionType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'connectionType',
      message: 'How would you like to configure the database?',
      choices: [
        { name: 'Use Vercel Integration (recommended)', value: 'vercel' },
        { name: 'Enter connection URL manually', value: 'manual' },
        { name: 'Skip for now', value: 'skip' },
      ],
    },
  ])

  if (connectionType === 'skip') {
    logger.info(chalk.yellow('  Skipping database setup'))
    return true
  }

  if (connectionType === 'vercel') {
    logger.info(chalk.cyan('\n  To use Vercel Integration:'))
    logger.info('  1. Go to your Vercel project settings')
    logger.info('  2. Navigate to Storage → Create Database → Neon Postgres')
    logger.info('  3. Connect to your project')
    logger.info('  4. Run: vercel env pull .env.local')
    logger.info('  5. Re-run this setup')
    return true
  }

  // Manual entry
  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'PostgreSQL connection URL:',
      validate: (input: string) =>
        input.startsWith('postgres') || 'Invalid PostgreSQL URL',
    },
  ])

  // Save to .env.local
  const fs = await import('fs-extra')
  const path = await import('path')
  const envPath = path.join(process.cwd(), '.env.local')

  let envContent = ''
  if (await fs.pathExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf-8')
    envContent = envContent.replace(/POSTGRES_URL=.*\n?/g, '')
    envContent = envContent.replace(/DATABASE_URL=.*\n?/g, '')
  }

  envContent += `\nPOSTGRES_URL=${url}\n`
  await fs.writeFile(envPath, envContent)

  logger.info(chalk.green('  POSTGRES_URL saved to .env.local'))
  return true
}

async function setupCache(): Promise<boolean> {
  // Similar to setupDatabase but for Redis/Upstash
  // Check for Redis - Vercel uses KV_REST_API_*, direct Upstash uses UPSTASH_*
  if (process.env.KV_REST_API_URL || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    logger.info(chalk.green('  Redis/Upstash already configured'))
    return true
  }

  const { skip } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'skip',
      message: 'Redis not configured. Skip cache setup?',
      default: true,
    },
  ])

  if (skip) {
    logger.info(chalk.yellow('  Skipping cache setup (will use in-memory)'))
  }

  return true
}

async function runMigrations(): Promise<boolean> {
  const spinner = ora()

  spinner.start('Running database migrations...')

  try {
    const migrations = await import('@cgk-platform/db/migrations')
    const results = await migrations.runPublicMigrations()

    if (results.length === 0) {
      spinner.succeed('No pending migrations')
    } else {
      const failed = results.filter((r) => !r.success)
      if (failed.length > 0) {
        spinner.fail('Some migrations failed')
        return false
      }
      spinner.succeed(`Applied ${results.length} migration(s)`)
    }

    return true
  } catch (error) {
    spinner.fail('Migration failed')
    if (error instanceof Error) {
      logger.info(chalk.red(`  ${error.message}`))
    }
    return false
  }
}

async function createAdminUser(): Promise<boolean> {
  const { createAdmin } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createAdmin',
      message: 'Create super admin user?',
      default: true,
    },
  ])

  if (!createAdmin) {
    logger.info(chalk.yellow('  Skipping admin user creation'))
    return true
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Admin name:',
      validate: (input: string) =>
        input.length >= 2 || 'Name must be at least 2 characters',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Admin email:',
      validate: (input: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Invalid email',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Admin password (min 12 characters):',
      validate: (input: string) =>
        input.length >= 12 || 'Password must be at least 12 characters',
    },
  ])

  const spinner = ora()
  spinner.start('Creating admin user...')

  try {
    const db = await import('@cgk-platform/db')
    const { hashPassword } = await import('@cgk-platform/auth/node')

    // Use bcrypt-based password hashing from auth package
    const passwordHash = await hashPassword(answers.password)

    await db.sql`
      INSERT INTO public.users (email, name, password_hash, role, status, email_verified)
      VALUES (${answers.email}, ${answers.name}, ${passwordHash}, 'super_admin', 'active', true)
      ON CONFLICT (email) DO UPDATE SET
        name = ${answers.name},
        password_hash = ${passwordHash},
        role = 'super_admin'
    `

    spinner.succeed(`Admin user created: ${answers.email}`)
    return true
  } catch (error) {
    spinner.fail('Failed to create admin user')
    if (error instanceof Error) {
      logger.info(chalk.red(`  ${error.message}`))
    }
    return false
  }
}

async function configurePlatform(): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'platformName',
      message: 'Platform name:',
      default: 'CGK Platform',
    },
  ])

  const spinner = ora()
  spinner.start('Saving platform configuration...')

  try {
    const db = await import('@cgk-platform/db')

    await db.sql`
      INSERT INTO public.platform_config (key, value)
      VALUES ('platform', ${JSON.stringify({ name: answers.platformName })}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify({ name: answers.platformName })}::jsonb
    `

    await db.sql`
      INSERT INTO public.platform_config (key, value)
      VALUES ('setup', ${JSON.stringify({
        completedAt: new Date().toISOString(),
        version: '0.0.1',
      })}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify({
        completedAt: new Date().toISOString(),
        version: '0.0.1',
      })}::jsonb
    `

    spinner.succeed(`Platform configured: ${answers.platformName}`)
    return true
  } catch (error) {
    spinner.fail('Failed to save platform configuration')
    if (error instanceof Error) {
      logger.info(chalk.red(`  ${error.message}`))
    }
    return false
  }
}
