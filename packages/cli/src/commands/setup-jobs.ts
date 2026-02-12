/**
 * setup:jobs CLI Command
 *
 * Sets up background job infrastructure for the CGK platform.
 * Guides users through provider selection and configuration.
 *
 * @ai-pattern cli-setup
 */

import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import * as fs from 'fs-extra'
import * as path from 'path'

interface ProviderChoice {
  name: string
  value: 'trigger.dev' | 'inngest' | 'local'
  description: string
}

const PROVIDERS: ProviderChoice[] = [
  {
    name: 'Trigger.dev (Recommended)',
    value: 'trigger.dev',
    description: 'Production-ready, proven with 199+ tasks in RAWDOG',
  },
  {
    name: 'Inngest',
    value: 'inngest',
    description: 'Event-driven alternative with step functions',
  },
  {
    name: 'Local (Development Only)',
    value: 'local',
    description: 'In-memory processing for testing',
  },
]

export const setupJobsCommand = new Command('setup:jobs')
  .description('Setup background job infrastructure (Trigger.dev or Inngest)')
  .option('--provider <provider>', 'Provider to configure (trigger.dev, inngest, local)')
  .option('--skip-env', 'Skip environment variable setup')
  .option('--verify-only', 'Only verify existing configuration')
  .action(async (options) => {
    console.log(chalk.cyan('\n🔄 Background Jobs Setup\n'))

    const spinner = ora()

    // Step 1: Check for existing configuration
    console.log(chalk.bold('Step 1: Checking existing configuration'))

    const existingProvider = detectExistingProvider()
    if (existingProvider) {
      console.log(chalk.green(`  ✓ Found existing ${existingProvider} configuration`))

      if (options.verifyOnly) {
        await verifyProvider(existingProvider, spinner)
        return
      }

      const { useExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useExisting',
          message: `Continue with existing ${existingProvider} setup?`,
          default: true,
        },
      ])

      if (useExisting) {
        await verifyProvider(existingProvider, spinner)
        return
      }
    } else {
      console.log(chalk.yellow('  No existing job provider detected'))
    }

    // Step 2: Select provider
    console.log(chalk.bold('\nStep 2: Select a provider'))

    let provider: 'trigger.dev' | 'inngest' | 'local'

    if (options.provider) {
      provider = options.provider as typeof provider
      console.log(chalk.dim(`  Using specified provider: ${provider}`))
    } else {
      const { selectedProvider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Which background job provider would you like to use?',
          choices: PROVIDERS.map((p) => ({
            name: `${p.name}\n     ${chalk.dim(p.description)}`,
            value: p.value,
            short: p.name,
          })),
        },
      ])
      provider = selectedProvider
    }

    // Step 3: Configure provider
    console.log(chalk.bold(`\nStep 3: Configure ${provider}`))

    switch (provider) {
      case 'trigger.dev':
        await configureTriggerDev(spinner, options.skipEnv)
        break
      case 'inngest':
        await configureInngest(spinner, options.skipEnv)
        break
      case 'local':
        await configureLocal(spinner)
        break
    }

    // Step 4: Verify
    console.log(chalk.bold('\nStep 4: Verifying setup'))
    await verifyProvider(provider, spinner)

    console.log(chalk.green('\n✅ Background jobs setup complete!\n'))
    console.log('Next steps:')
    console.log(chalk.cyan('  1. Start development: pnpm dev'))

    if (provider === 'trigger.dev') {
      console.log(chalk.cyan('  2. Run Trigger.dev dev server: npx trigger dev'))
    } else if (provider === 'inngest') {
      console.log(chalk.cyan('  2. Run Inngest dev server: npx inngest-cli dev'))
    }

    console.log(chalk.cyan('  3. Send a test job to verify everything works'))
    console.log('')
  })

/**
 * Detect existing provider from environment
 */
function detectExistingProvider(): 'trigger.dev' | 'inngest' | null {
  if (process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_DEV_SECRET_KEY) {
    return 'trigger.dev'
  }
  if (process.env.INNGEST_EVENT_KEY) {
    return 'inngest'
  }
  return null
}

/**
 * Configure Trigger.dev
 */
async function configureTriggerDev(
  spinner: ReturnType<typeof ora>,
  skipEnv?: boolean
): Promise<void> {
  console.log('')
  console.log(chalk.dim('  Trigger.dev is the recommended provider based on'))
  console.log(chalk.dim('  institutional knowledge from RAWDOG (199+ tasks).'))
  console.log('')

  // Check for existing API key
  const existingKey =
    process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_DEV_SECRET_KEY

  if (existingKey && !skipEnv) {
    console.log(chalk.green('  ✓ TRIGGER_SECRET_KEY is already set'))
    return
  }

  console.log(chalk.cyan('  To set up Trigger.dev:\n'))
  console.log('  1. Go to https://trigger.dev and create an account')
  console.log('  2. Create a new project (or use existing)')
  console.log('  3. Go to Project Settings → API Keys')
  console.log('  4. Copy your secret key (starts with "tr_")')
  console.log('')

  if (skipEnv) {
    console.log(chalk.yellow('  Skipping environment setup (--skip-env flag)'))
    return
  }

  const { hasKey } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasKey',
      message: 'Do you have your Trigger.dev API key ready?',
      default: true,
    },
  ])

  if (!hasKey) {
    console.log(
      chalk.yellow('\n  ⚠ Please get your API key and run setup:jobs again')
    )
    console.log(
      chalk.dim('    Or manually add TRIGGER_SECRET_KEY to your .env.local')
    )
    return
  }

  const { secretKey, projectRef } = await inquirer.prompt([
    {
      type: 'password',
      name: 'secretKey',
      message: 'Enter your Trigger.dev secret key:',
      validate: (input: string) => {
        if (!input.startsWith('tr_')) {
          return 'Secret key should start with "tr_"'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'projectRef',
      message: 'Enter your project ref (optional):',
    },
  ])

  // Save to .env.local
  spinner.start('Saving configuration...')

  try {
    await saveEnvVars({
      TRIGGER_SECRET_KEY: secretKey,
      ...(projectRef && { TRIGGER_PROJECT_REF: projectRef }),
    })

    spinner.succeed('Configuration saved to .env.local')

    // Create trigger.config.ts if it doesn't exist
    await createTriggerConfig()
  } catch (error) {
    spinner.fail('Failed to save configuration')
    throw error
  }
}

/**
 * Configure Inngest
 */
async function configureInngest(
  spinner: ReturnType<typeof ora>,
  skipEnv?: boolean
): Promise<void> {
  console.log('')
  console.log(chalk.dim('  Inngest is an event-driven alternative with'))
  console.log(chalk.dim('  step functions for complex workflows.'))
  console.log('')

  // Check for existing keys
  const existingKey = process.env.INNGEST_EVENT_KEY

  if (existingKey && !skipEnv) {
    console.log(chalk.green('  ✓ INNGEST_EVENT_KEY is already set'))
    return
  }

  console.log(chalk.cyan('  To set up Inngest:\n'))
  console.log('  1. Go to https://www.inngest.com and create an account')
  console.log('  2. Create a new app (or use existing)')
  console.log('  3. Go to Settings → Keys')
  console.log('  4. Copy your Event Key and Signing Key')
  console.log('')

  if (skipEnv) {
    console.log(chalk.yellow('  Skipping environment setup (--skip-env flag)'))
    return
  }

  const { hasKeys } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasKeys',
      message: 'Do you have your Inngest keys ready?',
      default: true,
    },
  ])

  if (!hasKeys) {
    console.log(chalk.yellow('\n  ⚠ Please get your keys and run setup:jobs again'))
    console.log(
      chalk.dim('    Or manually add INNGEST_EVENT_KEY to your .env.local')
    )
    return
  }

  const { eventKey, signingKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'eventKey',
      message: 'Enter your Inngest Event Key:',
      validate: (input: string) => input.length > 0 || 'Event key is required',
    },
    {
      type: 'password',
      name: 'signingKey',
      message: 'Enter your Inngest Signing Key:',
      validate: (input: string) =>
        input.length > 0 || 'Signing key is required',
    },
  ])

  // Save to .env.local
  spinner.start('Saving configuration...')

  try {
    await saveEnvVars({
      INNGEST_EVENT_KEY: eventKey,
      INNGEST_SIGNING_KEY: signingKey,
    })

    spinner.succeed('Configuration saved to .env.local')
  } catch (error) {
    spinner.fail('Failed to save configuration')
    throw error
  }
}

/**
 * Configure local provider
 */
async function configureLocal(spinner: ReturnType<typeof ora>): Promise<void> {
  console.log('')
  console.log(chalk.yellow('  ⚠ Local provider is for development only!'))
  console.log(chalk.dim('    Jobs run in-memory and are lost on restart.'))
  console.log('')

  spinner.start('Setting up local provider...')

  await saveEnvVars({
    JOBS_PROVIDER: 'local',
  })

  spinner.succeed('Local provider configured')

  console.log('')
  console.log(
    chalk.yellow('  Remember to switch to Trigger.dev or Inngest for production!')
  )
}

/**
 * Verify provider configuration
 */
async function verifyProvider(
  provider: 'trigger.dev' | 'inngest' | 'local',
  spinner: ReturnType<typeof ora>
): Promise<void> {
  spinner.start(`Verifying ${provider} configuration...`)

  try {
    // Dynamically import to test configuration
    const jobs = await import('@cgk/jobs')
    const client = jobs.getJobClient()

    const health = await client.healthCheck()

    if (health.healthy) {
      spinner.succeed(
        `${provider} is configured and healthy${health.latency ? ` (${health.latency}ms)` : ''}`
      )
    } else {
      spinner.warn(`${provider} configured but health check failed: ${health.error}`)
    }
  } catch (error) {
    if (provider === 'local') {
      spinner.succeed('Local provider ready (no external verification needed)')
    } else {
      spinner.warn(
        `Could not verify ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      console.log(chalk.dim('    This may be expected if the provider API is not reachable'))
    }
  }
}

/**
 * Save environment variables to .env.local
 */
async function saveEnvVars(vars: Record<string, string>): Promise<void> {
  const envPath = path.join(process.cwd(), '.env.local')

  let envContent = ''
  if (await fs.pathExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf-8')
  }

  for (const key of Object.keys(vars)) {
    // Remove existing key
    const regex = new RegExp(`^${key}=.*$`, 'gm')
    envContent = envContent.replace(regex, '')
  }

  // Add new keys
  const newVars = Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  envContent = envContent.trim() + '\n\n# Background Jobs\n' + newVars + '\n'

  await fs.writeFile(envPath, envContent)
}

/**
 * Create trigger.config.ts if it doesn't exist
 */
async function createTriggerConfig(): Promise<void> {
  const configPath = path.join(process.cwd(), 'trigger.config.ts')

  if (await fs.pathExists(configPath)) {
    console.log(chalk.dim('  trigger.config.ts already exists'))
    return
  }

  const configContent = `/**
 * Trigger.dev Configuration
 *
 * @see https://trigger.dev/docs/config/overview
 */

import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || 'cgk-platform',
  runtime: 'node',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 60000,
    },
  },
  dirs: ['./src/trigger'],
})
`

  await fs.writeFile(configPath, configContent)
  console.log(chalk.green('  ✓ Created trigger.config.ts'))
}
