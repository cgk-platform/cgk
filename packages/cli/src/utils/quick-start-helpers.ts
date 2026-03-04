import { randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'

/**
 * Generated secrets for a brand
 */
export interface BrandSecrets {
  JWT_SECRET: string
  SESSION_SECRET: string
  CREATOR_JWT_SECRET: string
  CONTRACTOR_JWT_SECRET: string
  ENCRYPTION_KEY: string
  INTEGRATION_ENCRYPTION_KEY: string
  SHOPIFY_TOKEN_ENCRYPTION_KEY: string
  DAM_TOKEN_ENCRYPTION_KEY: string
  TAX_TIN_ENCRYPTION_KEY: string
  CGK_PLATFORM_API_KEY: string
}

/**
 * Check if all prerequisites are installed
 */
export async function checkPrerequisites(): Promise<{ success: boolean; errors: string[] }> {
  const spinner = ora('Checking prerequisites...').start()
  const errors: string[] = []

  try {
    // Check Node.js version
    const nodeVersion = process.version
    const versionWithoutV = nodeVersion.slice(1)
    const versionParts = versionWithoutV.split('.')
    const majorVersion = versionParts[0] ? parseInt(versionParts[0]) : 0
    if (majorVersion < 22) {
      errors.push(`Node.js 22+ required (found ${nodeVersion}). Install from https://nodejs.org/`)
    } else {
      spinner.text = `Node.js ${nodeVersion} ✓`
    }

    // Check pnpm
    try {
      const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim()
      const versionParts = pnpmVersion.split('.')
      const pnpmMajor = versionParts[0] ? parseInt(versionParts[0]) : 0
      if (pnpmMajor < 10) {
        errors.push(
          `pnpm 10+ required (found ${pnpmVersion}). Install with: npm install -g pnpm@latest`
        )
      } else {
        spinner.text = `pnpm ${pnpmVersion} ✓`
      }
    } catch {
      errors.push('pnpm not found. Install with: npm install -g pnpm@latest')
    }

    // Check Docker (optional)
    try {
      const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim()
      spinner.text = `${dockerVersion} ✓`
    } catch {
      spinner.warn('Docker not found (optional). Install from https://www.docker.com/get-started')
    }

    if (errors.length === 0) {
      spinner.succeed('Prerequisites checked')
      return { success: true, errors: [] }
    } else {
      spinner.fail('Prerequisites check failed')
      return { success: false, errors }
    }
  } catch (error) {
    spinner.fail('Prerequisites check failed')
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Generate cryptographically secure secrets
 */
export function generateAllSecrets(): BrandSecrets {
  return {
    JWT_SECRET: randomBytes(32).toString('hex'),
    SESSION_SECRET: randomBytes(32).toString('hex'),
    CREATOR_JWT_SECRET: randomBytes(32).toString('hex'),
    CONTRACTOR_JWT_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    SHOPIFY_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    DAM_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    TAX_TIN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    CGK_PLATFORM_API_KEY: randomBytes(32).toString('base64'),
  }
}

/**
 * Generate .env.local content for an app
 */
export function generateEnvContent(
  app: string,
  secrets: BrandSecrets,
  databaseUrl: string,
  redis?: { url: string; token: string }
): string {
  const baseEnv = `# CGK Platform Environment Variables
# Generated: ${new Date().toISOString()}
# App: ${app}

# ============================================================================
# DATABASE & CACHE
# ============================================================================
DATABASE_URL="${databaseUrl}"
POSTGRES_URL="${databaseUrl}"
POSTGRES_PRISMA_URL="${databaseUrl}?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="${databaseUrl}"

# Redis${redis ? ' (Upstash)' : ' (optional - using local in-memory fallback)'}
${redis ? `UPSTASH_REDIS_REST_URL="${redis.url}"` : 'REDIS_URL="redis://localhost:6379"'}
${redis ? `UPSTASH_REDIS_REST_TOKEN="${redis.token}"` : 'KV_REST_API_URL=""'}
${redis ? '' : 'KV_REST_API_TOKEN=""'}

# ============================================================================
# PLATFORM SECRETS
# ============================================================================
JWT_SECRET="${secrets.JWT_SECRET}"
SESSION_SECRET="${secrets.SESSION_SECRET}"
CREATOR_JWT_SECRET="${secrets.CREATOR_JWT_SECRET}"
CONTRACTOR_JWT_SECRET="${secrets.CONTRACTOR_JWT_SECRET}"
ENCRYPTION_KEY="${secrets.ENCRYPTION_KEY}"
INTEGRATION_ENCRYPTION_KEY="${secrets.INTEGRATION_ENCRYPTION_KEY}"
SHOPIFY_TOKEN_ENCRYPTION_KEY="${secrets.SHOPIFY_TOKEN_ENCRYPTION_KEY}"
DAM_TOKEN_ENCRYPTION_KEY="${secrets.DAM_TOKEN_ENCRYPTION_KEY}"
TAX_TIN_ENCRYPTION_KEY="${secrets.TAX_TIN_ENCRYPTION_KEY}"
CGK_PLATFORM_API_KEY="${secrets.CGK_PLATFORM_API_KEY}"

# ============================================================================
# TENANT CONFIGURATION
# ============================================================================
DEFAULT_TENANT_SLUG="demo"

# ============================================================================
# APP URLS (Development)
# ============================================================================
NEXT_PUBLIC_ADMIN_URL="http://localhost:3200"
NEXT_PUBLIC_ORCHESTRATOR_URL="http://localhost:3100"
NEXT_PUBLIC_STOREFRONT_URL="http://localhost:3000"
NEXT_PUBLIC_CREATOR_PORTAL_URL="http://localhost:3300"
CONTRACTOR_PORTAL_URL="http://localhost:3400"
MCP_SERVER_URL="http://localhost:3500"

# ============================================================================
# INTEGRATIONS (Optional - Add your own)
# ============================================================================
SHOPIFY_CLIENT_ID=""
SHOPIFY_CLIENT_SECRET=""
SHOPIFY_SCOPES="read_products,write_products,read_orders,write_orders"

STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""

RESEND_API_KEY=""

# Background Jobs (Optional)
TRIGGER_SECRET_KEY=""

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=""
`

  return baseEnv
}

/**
 * Create .env.local files for all apps
 */
export async function createEnvFiles(
  secrets: BrandSecrets,
  databaseUrl: string,
  redis?: { url: string; token: string }
): Promise<void> {
  const spinner = ora('Creating environment files...').start()

  const apps = [
    'admin',
    'orchestrator',
    'creator-portal',
    'contractor-portal',
    'storefront',
    'command-center',
    'mcp-server',
  ]

  try {
    for (const app of apps) {
      const appDir = join(process.cwd(), 'apps', app)
      if (existsSync(appDir)) {
        const envContent = generateEnvContent(app, secrets, databaseUrl, redis)
        const envPath = join(appDir, '.env.local')
        writeFileSync(envPath, envContent)
        spinner.text = `Created apps/${app}/.env.local`
      }
    }

    spinner.succeed(`Created ${apps.length} .env.local files`)
  } catch (error) {
    spinner.fail('Failed to create environment files')
    throw error
  }
}

/**
 * Setup Docker database with docker-compose
 */
export async function setupDockerDatabase(): Promise<string> {
  const spinner = ora('Starting PostgreSQL and Redis...').start()

  try {
    // Check if docker-compose.yml exists
    const composePath = join(process.cwd(), 'docker-compose.yml')
    if (!existsSync(composePath)) {
      spinner.text = 'Creating docker-compose.yml...'
      createDockerCompose()
    }

    // Start containers
    spinner.text = 'Starting containers...'
    execSync('docker-compose up -d', { stdio: 'inherit' })

    // Wait for PostgreSQL to be ready
    spinner.text = 'Waiting for PostgreSQL...'
    await waitForPostgres('postgresql://postgres:postgres@localhost:5432/cgk')

    spinner.succeed('Database ready (PostgreSQL + Redis running)')
    return 'postgresql://postgres:postgres@localhost:5432/cgk'
  } catch (error) {
    spinner.fail('Failed to start Docker database')
    throw error
  }
}

/**
 * Create docker-compose.yml file
 */
function createDockerCompose(): void {
  const composeContent = `version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: cgk-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cgk
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cgk-redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
`

  writeFileSync(join(process.cwd(), 'docker-compose.yml'), composeContent)
}

/**
 * Wait for PostgreSQL to be ready
 */
async function waitForPostgres(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      execSync(`psql "${url}" -c "SELECT 1" > /dev/null 2>&1`, { stdio: 'ignore' })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error('PostgreSQL failed to start within timeout')
}

/**
 * Prompt for Neon database with helpful guidance
 */
export async function promptForNeonDatabase(): Promise<string> {
  const inquirer = (await import('inquirer')).default

  logger.info(chalk.cyan('\n📋 Neon PostgreSQL Setup\n'))
  logger.info('Neon is a serverless PostgreSQL provider with a free tier.\n')
  logger.info(chalk.bold('Steps to get your DATABASE_URL:'))
  logger.info('  1. Sign up at ' + chalk.cyan('https://neon.tech'))
  logger.info('  2. Create a new project')
  logger.info('  3. Copy the connection string from the "Connection Details" section')
  logger.info('  4. Paste it below\n')

  const { databaseUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'databaseUrl',
      message: 'Enter your Neon DATABASE_URL:',
      validate: (input: string) => {
        if (!input.startsWith('postgres://') && !input.startsWith('postgresql://')) {
          return 'Invalid PostgreSQL connection string (must start with postgres:// or postgresql://)'
        }
        return true
      },
    },
  ])

  return databaseUrl
}

/**
 * Prompt for Upstash Redis with helpful guidance
 */
export async function promptForUpstashRedis(): Promise<{
  url: string
  token: string
}> {
  const inquirer = (await import('inquirer')).default

  logger.info(chalk.cyan('\n📋 Upstash Redis Setup\n'))
  logger.info('Upstash is a serverless Redis provider with a free tier.\n')
  logger.info(chalk.bold('Steps to get your Redis credentials:'))
  logger.info('  1. Sign up at ' + chalk.cyan('https://upstash.com'))
  logger.info('  2. Create a new Redis database')
  logger.info('  3. Click "REST API" tab')
  logger.info('  4. Copy "UPSTASH_REDIS_REST_URL" and "UPSTASH_REDIS_REST_TOKEN"')
  logger.info('  5. Paste them below\n')

  const { redisUrl, redisToken } = await inquirer.prompt([
    {
      type: 'input',
      name: 'redisUrl',
      message: 'Enter UPSTASH_REDIS_REST_URL:',
      validate: (input: string) => {
        if (!input.startsWith('https://')) {
          return 'Invalid Upstash Redis URL (must start with https://)'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'redisToken',
      message: 'Enter UPSTASH_REDIS_REST_TOKEN:',
      validate: (input: string) => {
        if (!input || input.length < 10) {
          return 'Invalid Upstash Redis token'
        }
        return true
      },
    },
  ])

  return { url: redisUrl, token: redisToken }
}

/**
 * Prompt for manual database URL (fallback)
 */
export async function promptForDatabaseUrl(): Promise<string> {
  const inquirer = (await import('inquirer')).default

  logger.info(chalk.cyan('\n📋 Database Setup\n'))
  logger.info('You can use:')
  logger.info('  1. Neon PostgreSQL (recommended) - https://neon.tech')
  logger.info('  2. Supabase - https://supabase.com')
  logger.info('  3. Any PostgreSQL 14+ database\n')

  const { databaseUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'databaseUrl',
      message: 'Enter your DATABASE_URL:',
      validate: (input: string) => {
        if (!input.startsWith('postgres://') && !input.startsWith('postgresql://')) {
          return 'Invalid PostgreSQL connection string (must start with postgres:// or postgresql://)'
        }
        return true
      },
    },
  ])

  return databaseUrl
}

/**
 * Install dependencies with pnpm
 */
export async function installDependencies(): Promise<void> {
  const spinner = ora('Installing dependencies...').start()

  try {
    execSync('pnpm install', { stdio: 'inherit' })
    spinner.succeed('Dependencies installed')
  } catch (error) {
    spinner.fail('Failed to install dependencies')
    throw error
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  const spinner = ora('Running database migrations...').start()

  try {
    // Dynamic import to avoid loading db package before install
    const { runPublicMigrations } = await import('@cgk-platform/db/migrations')

    spinner.text = 'Running public schema migrations...'
    await runPublicMigrations()

    spinner.succeed('Database migrations complete')
  } catch (error) {
    spinner.fail('Failed to run migrations')
    throw error
  }
}

/**
 * Start dev server in background
 */
export function startDevServer(): void {
  const spinner = ora('Starting dev server...').start()

  try {
    // Start pnpm dev in background
    const { spawn } = require('child_process')
    const devProcess = spawn('pnpm', ['dev'], {
      detached: true,
      stdio: 'ignore',
    })

    devProcess.unref()

    spinner.succeed('Dev server starting...')
    logger.info(chalk.dim('  (Check terminal output for compilation progress)'))
  } catch (error) {
    spinner.fail('Failed to start dev server')
    throw error
  }
}

/**
 * Open browser to URL
 */
export async function openBrowser(url: string): Promise<void> {
  const open = (await import('open')).default

  logger.info(chalk.cyan('\n🎉 Opening browser...\n'))

  // Wait a bit for dev server to start
  await new Promise((resolve) => setTimeout(resolve, 3000))

  try {
    await open(url)
  } catch (error) {
    logger.warn(`Could not open browser automatically. Visit: ${chalk.cyan(url)}`)
  }
}
