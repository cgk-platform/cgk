import chalk from 'chalk'
import { Command } from 'commander'
import { logger } from '@cgk-platform/logging'

import {
  checkPrerequisites,
  generateAllSecrets,
  createEnvFiles,
  promptForNeonDatabase,
  promptForUpstashRedis,
  installDependencies,
  runMigrations,
  startDevServer,
  openBrowser,
} from '../utils/quick-start-helpers.js'

export const quickStartCommand = new Command('quick-start')
  .description('Set up CGK platform in 5-10 minutes (cloud-first)')
  .option('--no-browser', 'Do not open browser automatically')
  .option('--skip-install', 'Skip dependency installation (if already installed)')
  .action(async (options) => {
    logger.info(chalk.cyan('\n🚀 CGK Platform Quick Start\n'))
    logger.info('This will set up your development environment in 5-10 minutes.\n')

    try {
      // Step 1: Prerequisites check (30s)
      logger.info(chalk.bold('Step 1/7:') + ' Checking prerequisites...\n')
      const prereqCheck = await checkPrerequisites()

      if (!prereqCheck.success) {
        logger.error('\n❌ Prerequisites check failed:\n')
        for (const error of prereqCheck.errors) {
          logger.error(`  • ${error}`)
        }
        logger.info(
          '\nPlease install the required dependencies and run ' +
            chalk.cyan('npx @cgk-platform/cli quick-start') +
            ' again.\n'
        )
        process.exit(1)
      }

      // Step 2: Database setup (1-2 min)
      logger.info(chalk.bold('\nStep 2/7:') + ' Setting up database...\n')
      logger.info(
        chalk.cyan('Using cloud database for dev/prod parity.\n') +
          chalk.dim('This ensures your local environment matches production.\n')
      )
      const databaseUrl = await promptForNeonDatabase()
      const redisConfig = await promptForUpstashRedis()

      // Step 3: Auto-generate secrets and .env files (30s)
      logger.info(chalk.bold('\nStep 3/7:') + ' Generating secrets and configuration...\n')
      const secrets = generateAllSecrets()
      await createEnvFiles(secrets, databaseUrl, redisConfig)

      logger.info(
        chalk.dim('\n  ✓ Generated 10 unique secrets\n' + '  ✓ Created 7 .env.local files\n')
      )

      // Step 4: Install dependencies (4-5 min - unavoidable)
      if (!options.skipInstall) {
        logger.info(chalk.bold('Step 4/7:') + ' Installing dependencies...\n')
        logger.info(
          chalk.dim(
            '  This may take 4-5 minutes on first install.\n' +
              '  (Subsequent installs will be faster)\n'
          )
        )
        await installDependencies()
      } else {
        logger.info(chalk.bold('Step 4/7:') + ' Skipping dependency installation\n')
      }

      // Step 5: Run migrations (1-2 min)
      logger.info(chalk.bold('\nStep 5/7:') + ' Running database migrations...\n')
      await runMigrations()

      // Step 6: Start dev server (1 min)
      logger.info(chalk.bold('\nStep 6/7:') + ' Starting development server...\n')
      startDevServer()

      logger.info(
        chalk.dim(
          '\n  ✓ Dev server starting in background\n' + '  ✓ Compilation may take 1-2 minutes\n'
        )
      )

      // Step 7: Open browser (automatic)
      logger.info(chalk.bold('\nStep 7/7:') + ' Opening browser...\n')

      if (options.browser !== false) {
        await openBrowser('http://localhost:3200')
      }

      // Success message
      logger.info(chalk.green('\n✅ Platform ready!\n'))
      logger.info('You can now:')
      logger.info(`  • Visit the admin: ${chalk.cyan('http://localhost:3200')}`)
      logger.info(`  • Visit the storefront: ${chalk.cyan('http://localhost:3000')}`)
      logger.info(`  • Visit the orchestrator: ${chalk.cyan('http://localhost:3100')}`)
      logger.info(`  • Visit the creator portal: ${chalk.cyan('http://localhost:3300')}\n`)

      logger.info('Next steps:')
      logger.info('  1. Create a demo tenant:')
      logger.info(chalk.dim('     npx @cgk-platform/cli tenant:create demo --name "Demo Brand"'))
      logger.info('  2. Configure integrations (Shopify, Stripe):')
      logger.info(
        chalk.dim('     See docs/getting-started/CREDENTIAL-ACQUISITION.md (coming soon)')
      )
      logger.info('  3. Start building!\n')

      logger.info(chalk.dim('📚 Documentation: docs/getting-started/\n'))
    } catch (error) {
      logger.error(chalk.red('\n❌ Quick start failed\n'))

      if (error instanceof Error) {
        logger.error(error.message)

        if (error.stack) {
          logger.debug(chalk.dim(error.stack))
        }
      }

      logger.info('\nFor manual setup, see: docs/getting-started/LOCAL-DEVELOPMENT-SETUP.md\n')
      process.exit(1)
    }
  })
