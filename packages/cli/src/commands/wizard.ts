import chalk from 'chalk'
import { Command } from 'commander'
import { logger } from '@cgk-platform/logging'
import {
  generatePlatformConfig,
  updateDatabaseSettings,
  validateConfig,
  type WizardAnswers,
} from '../utils/wizard-helpers.js'

export const wizardCommand = new Command('wizard')
  .description('Interactive architecture decision wizard for non-technical users')
  .action(async () => {
    logger.info(chalk.cyan('\n🧙 CGK Platform Architecture Wizard\n'))
    logger.info('Answer a few simple questions to configure your platform.\n')

    try {
      const inquirer = (await import('inquirer')).default
      const { existsSync } = await import('fs')
      const { join } = await import('path')

      // Check if platform.config.ts already exists
      const configPath = join(process.cwd(), 'platform.config.ts')
      const configExists = existsSync(configPath)

      if (configExists) {
        logger.info(chalk.yellow('✅ platform.config.ts already exists\n'))
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'platform.config.ts exists. Run wizard anyway (will overwrite)?',
            default: false,
          },
        ])

        if (!proceed) {
          logger.info(
            '\nWizard cancelled. Edit platform.config.ts manually or delete it to run wizard.\n'
          )
          process.exit(0)
        }
      }

      // Question 1: What are you building?
      const { useCase } = await inquirer.prompt([
        {
          type: 'list',
          name: 'useCase',
          message: 'What are you building?',
          choices: [
            {
              name: 'Online store (e-commerce brand)',
              value: 'ecommerce',
              short: 'E-commerce',
            },
            {
              name: 'Creator marketplace (like Patreon)',
              value: 'creator',
              short: 'Creator',
            },
            {
              name: 'Wholesale/B2B platform',
              value: 'b2b',
              short: 'B2B',
            },
            {
              name: 'Multi-brand marketplace',
              value: 'marketplace',
              short: 'Marketplace',
            },
            {
              name: 'Custom configuration',
              value: 'custom',
              short: 'Custom',
            },
          ],
        },
      ])

      let answers: WizardAnswers

      // Apply preset or ask detailed questions
      if (useCase === 'ecommerce') {
        logger.info(chalk.cyan('\n✅ E-commerce Brand preset selected\n'))
        answers = {
          useCase,
          commerceProvider: 'shopify',
          storefrontType: 'headless-react',
          checkoutProvider: 'shopify',
          cacheProducts: true,
          multiTenant: false,
        }
      } else if (useCase === 'creator') {
        logger.info(chalk.cyan('\n✅ Creator Marketplace preset selected\n'))
        answers = {
          useCase,
          commerceProvider: 'custom',
          storefrontType: 'headless-react',
          checkoutProvider: 'stripe',
          cacheProducts: false,
          multiTenant: false,
        }
      } else if (useCase === 'b2b') {
        logger.info(chalk.cyan('\n✅ Wholesale/B2B preset selected\n'))
        answers = {
          useCase,
          commerceProvider: 'custom',
          storefrontType: 'headless-react',
          checkoutProvider: 'stripe',
          cacheProducts: true,
          multiTenant: false,
        }
      } else if (useCase === 'marketplace') {
        logger.info(chalk.cyan('\n✅ Multi-Brand Marketplace preset selected\n'))
        answers = {
          useCase,
          commerceProvider: 'shopify',
          storefrontType: 'headless-react',
          checkoutProvider: 'shopify',
          cacheProducts: true,
          multiTenant: true,
        }
      } else {
        // Custom configuration - ask all questions
        logger.info(chalk.cyan('\n📋 Custom Configuration - Answer the following questions:\n'))

        const customAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'commerceProvider',
            message: 'How do you want to manage products?',
            choices: [
              {
                name: 'Shopify (recommended - easiest product management)',
                value: 'shopify',
                short: 'Shopify',
              },
              {
                name: 'Custom database + Stripe (more control, more work)',
                value: 'custom',
                short: 'Custom',
              },
            ],
          },
          {
            type: 'list',
            name: 'storefrontType',
            message: 'What type of website do you want?',
            choices: [
              {
                name: 'Modern website like Netflix (faster, better SEO)',
                value: 'headless-react',
                short: 'Headless React',
              },
              {
                name: 'Shopify theme customization (easier to update)',
                value: 'shopify-liquid',
                short: 'Shopify Liquid',
              },
            ],
            when: (answers: { commerceProvider: string }) => answers.commerceProvider === 'shopify',
          },
          {
            type: 'list',
            name: 'checkoutProvider',
            message: 'How do you want to handle checkout?',
            choices: [
              {
                name: 'Shopify checkout (recommended - easier compliance)',
                value: 'shopify',
                short: 'Shopify',
              },
              {
                name: 'Custom checkout with Stripe (more control)',
                value: 'stripe',
                short: 'Stripe',
              },
            ],
          },
          {
            type: 'confirm',
            name: 'cacheProducts',
            message: 'Do you need to cache product data locally?',
            default: true,
          },
          {
            type: 'confirm',
            name: 'multiTenant',
            message: 'Will you manage multiple brands?',
            default: false,
          },
        ])

        answers = {
          useCase,
          commerceProvider: customAnswers.commerceProvider,
          storefrontType: customAnswers.storefrontType || 'headless-react',
          checkoutProvider: customAnswers.checkoutProvider,
          cacheProducts: customAnswers.cacheProducts,
          multiTenant: customAnswers.multiTenant,
        }
      }

      // Validate configuration
      logger.info(chalk.bold('\nValidating configuration...\n'))
      const validation = validateConfig(answers)

      if (!validation.valid) {
        logger.warn(chalk.yellow('⚠️  Configuration has potential issues:\n'))
        for (const warning of validation.warnings) {
          logger.warn(`  • ${warning}`)
        }

        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to proceed anyway?',
            default: false,
          },
        ])

        if (!proceed) {
          logger.info('\nConfiguration cancelled. Run the wizard again to try different options.\n')
          process.exit(0)
        }
      }

      // Generate platform.config.ts
      logger.info(chalk.bold('\nGenerating configuration files...\n'))
      await generatePlatformConfig(answers)

      // Update database settings
      logger.info(chalk.bold('Updating database settings...\n'))
      await updateDatabaseSettings(answers)

      // Success message
      logger.info(chalk.green('\n✅ Configuration complete!\n'))
      logger.info('Configuration saved to:')
      logger.info(`  • ${chalk.cyan('platform.config.ts')} (TypeScript config)`)
      logger.info(`  • Database ${chalk.cyan('settings')} table (runtime config)\n`)

      logger.info(chalk.bold('Your configuration:'))
      logger.info(`  Use case: ${chalk.cyan(answers.useCase)}`)
      logger.info(`  Commerce provider: ${chalk.cyan(answers.commerceProvider)}`)
      logger.info(`  Storefront type: ${chalk.cyan(answers.storefrontType)}`)
      logger.info(`  Checkout provider: ${chalk.cyan(answers.checkoutProvider)}`)
      logger.info(`  Cache products: ${chalk.cyan(answers.cacheProducts ? 'Yes' : 'No')}`)
      logger.info(`  Multi-tenant: ${chalk.cyan(answers.multiTenant ? 'Yes' : 'No')}\n`)

      logger.info(chalk.bold('Next steps:'))
      logger.info('  1. Review ' + chalk.cyan('platform.config.ts'))
      logger.info('  2. Run ' + chalk.cyan('npx @cgk-platform/cli quick-start'))
      logger.info('  3. Configure integrations (Shopify, Stripe)\n')
    } catch (error) {
      logger.error(chalk.red('\n❌ Wizard failed\n'))

      if (error instanceof Error) {
        logger.error(error.message)

        if (error.stack) {
          logger.debug(chalk.dim(error.stack))
        }
      }

      process.exit(1)
    }
  })
