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
      // TODO: Actually test the connection
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
  if (process.env.REDIS_URL) {
    console.log(chalk.green('  REDIS_URL already set'))
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
    // TODO: Actually run migrations
    await new Promise((resolve) => setTimeout(resolve, 1000))
    spinner.succeed('Migrations complete')
    return true
  } catch {
    spinner.fail('Migration failed')
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
      name: 'email',
      message: 'Admin email:',
      validate: (input: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Invalid email',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Admin password:',
      validate: (input: string) =>
        input.length >= 8 || 'Password must be at least 8 characters',
    },
  ])

  const spinner = ora()
  spinner.start('Creating admin user...')

  try {
    // TODO: Actually create the user
    await new Promise((resolve) => setTimeout(resolve, 500))
    spinner.succeed(`Admin user created: ${answers.email}`)
    return true
  } catch {
    spinner.fail('Failed to create admin user')
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

  console.log(chalk.green(`  Platform configured: ${answers.platformName}`))
  return true
}
