import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'

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
    console.log(chalk.cyan('\n🛠️  CGK Platform Setup Wizard\n'))
    console.log(
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
      console.log(
        chalk.bold(`\nStep ${i + 1}/${steps.length}: ${step.name}`)
      )
      console.log(chalk.dim(step.description))

      const success = await step.action()

      if (!success) {
        console.log(chalk.red(`\n❌ Setup failed at step: ${step.name}`))
        console.log(chalk.dim('Please fix the issue and run setup again.'))
        process.exit(1)
      }
    }

    console.log(chalk.green('\n✅ Platform setup complete!\n'))
    console.log('Next steps:')
    console.log(chalk.cyan('  pnpm dev'))
    console.log('')
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
    console.log(chalk.cyan('\n🗄️  Database Setup\n'))

    const spinner = ora()

    // Step 1: Check DATABASE_URL
    console.log(chalk.bold('Step 1: Checking environment'))

    if (!process.env.DATABASE_URL) {
      console.log(chalk.red('  ✗ DATABASE_URL not set'))
      console.log('')
      console.log(chalk.dim('  To set up your database:'))
      console.log(chalk.dim('  1. Create a database at https://neon.tech'))
      console.log(chalk.dim('  2. Copy the connection string'))
      console.log(chalk.dim('  3. Add to .env.local:'))
      console.log(chalk.cyan('     DATABASE_URL=postgresql://...'))
      console.log('')
      process.exit(1)
    }

    console.log(chalk.green('  ✓ DATABASE_URL is set'))

    // Mask the connection string for display
    const dbUrl = process.env.DATABASE_URL
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':***@')
    console.log(chalk.dim(`    ${maskedUrl}`))

    // Step 2: Test connection
    console.log(chalk.bold('\nStep 2: Testing connection'))
    spinner.start('Connecting to database...')

    try {
      const db = await import('@cgk/db')
      await db.sql`SELECT 1`
      spinner.succeed('Database connection successful')
    } catch (error) {
      spinner.fail('Database connection failed')
      if (error instanceof Error) {
        console.log(chalk.red(`  ${error.message}`))
      }
      console.log('')
      console.log(chalk.dim('  Common issues:'))
      console.log(chalk.dim('  - Check that the connection string is correct'))
      console.log(chalk.dim('  - Verify the database exists'))
      console.log(chalk.dim('  - Check firewall/network settings'))
      console.log('')
      process.exit(1)
    }

    if (options.skipMigrations) {
      console.log(chalk.yellow('\n⚠ Skipping migrations (--skip-migrations flag)'))
      console.log(chalk.green('\n✅ Database connection verified!\n'))
      return
    }

    // Step 3: Run public migrations
    console.log(chalk.bold('\nStep 3: Running migrations'))

    if (options.dryRun) {
      console.log(chalk.yellow('  DRY RUN - Showing pending migrations\n'))
    }

    try {
      const db = await import('@cgk/db')
      const results = await db.runPublicMigrations({
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
        console.log(chalk.dim('  No pending migrations'))
      } else {
        const failed = results.filter((r) => !r.success)
        if (failed.length > 0) {
          console.log(chalk.red(`\n❌ ${failed.length} migration(s) failed`))
          for (const f of failed) {
            console.log(chalk.red(`  ${f.migration.name}: ${f.error}`))
          }
          process.exit(1)
        }

        const verb = options.dryRun ? 'would apply' : 'applied'
        console.log(chalk.green(`\n  ${results.length} migration(s) ${verb}`))
      }
    } catch (error) {
      spinner.fail('Migration failed')
      if (error instanceof Error) {
        console.log(chalk.red(`  ${error.message}`))
      }
      process.exit(1)
    }

    // Step 4: Verify
    console.log(chalk.bold('\nStep 4: Verifying setup'))
    spinner.start('Checking tables...')

    try {
      const db = await import('@cgk/db')
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
        console.log(chalk.yellow(`  ⚠ Missing tables: ${missing.join(', ')}`))
      } else {
        console.log(chalk.green('  ✓ All required tables present'))
      }
    } catch (error) {
      spinner.fail('Verification failed')
    }

    console.log(chalk.green('\n✅ Database setup complete!\n'))
    console.log('Next steps:')
    console.log(chalk.cyan('  npx @cgk/cli tenant:create <slug> --name "Brand Name"'))
    console.log('')
  })

async function setupDatabase(): Promise<boolean> {
  const spinner = ora()

  // Check for existing DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log(chalk.green('  DATABASE_URL already set'))

    if (!process.env.DATABASE_URL.includes('neon')) {
      console.log(
        chalk.yellow('  ⚠ Warning: Expected Neon PostgreSQL URL')
      )
    }

    // Test connection
    spinner.start('Testing database connection...')
    try {
      const db = await import('@cgk/db')
      await db.sql`SELECT 1`
      spinner.succeed('Database connection successful')
      return true
    } catch {
      spinner.fail('Database connection failed')
      return false
    }
  }

  // No DATABASE_URL - prompt for it
  const { connectionType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'connectionType',
      message: 'How would you like to configure the database?',
      choices: [
        { name: 'Enter connection URL manually', value: 'manual' },
        { name: 'Use Vercel Integration (recommended)', value: 'vercel' },
        { name: 'Skip for now', value: 'skip' },
      ],
    },
  ])

  if (connectionType === 'skip') {
    console.log(chalk.yellow('  Skipping database setup'))
    return true
  }

  if (connectionType === 'vercel') {
    console.log(chalk.cyan('\n  To use Vercel Integration:'))
    console.log('  1. Go to your Vercel project settings')
    console.log('  2. Navigate to Integrations')
    console.log('  3. Add Neon Postgres')
    console.log('  4. Re-run this setup')
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
    envContent = envContent.replace(/DATABASE_URL=.*\n?/g, '')
  }

  envContent += `\nDATABASE_URL=${url}\n`
  await fs.writeFile(envPath, envContent)

  console.log(chalk.green('  DATABASE_URL saved to .env.local'))
  return true
}

async function setupCache(): Promise<boolean> {
  // Similar to setupDatabase but for Redis/Upstash
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    console.log(chalk.green('  Redis/Upstash already configured'))
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
    console.log(chalk.yellow('  Skipping cache setup (will use in-memory)'))
  }

  return true
}

async function runMigrations(): Promise<boolean> {
  const spinner = ora()

  spinner.start('Running database migrations...')

  try {
    const db = await import('@cgk/db')
    const results = await db.runPublicMigrations()

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
      console.log(chalk.red(`  ${error.message}`))
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
    console.log(chalk.yellow('  Skipping admin user creation'))
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
    const db = await import('@cgk/db')

    // Simple password hashing (in production, use proper library like argon2)
    // This is a placeholder - actual implementation should use @cgk/auth
    const crypto = await import('crypto')
    const passwordHash = crypto
      .createHash('sha256')
      .update(answers.password)
      .digest('hex')

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
      console.log(chalk.red(`  ${error.message}`))
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
    const db = await import('@cgk/db')

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
      console.log(chalk.red(`  ${error.message}`))
    }
    return false
  }
}
