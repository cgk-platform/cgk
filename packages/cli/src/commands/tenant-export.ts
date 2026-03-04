import path from 'path'

import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'

import {
  exportTenantData,
  exportToDirectory,
  createGitHubRepo,
  setupVercelProject,
} from '../utils/tenant-export-helpers.js'

/**
 * Validate tenant slug format
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_]+$/.test(slug)
}

/**
 * tenant:export command
 * Exports tenant to standalone repository (WordPress-style portability)
 */
export const tenantExportCommand = new Command('tenant:export')
  .description('Export tenant to standalone repository (WordPress-style)')
  .argument('<slug>', 'Tenant slug to export')
  .option('--fork', 'Create GitHub repository and Vercel project')
  .option('--github-token <token>', 'GitHub personal access token')
  .option('--vercel-token <token>', 'Vercel API token')
  .option('--org <org>', 'GitHub organization or username')
  .option('--repo-name <name>', 'GitHub repository name (default: tenant-slug)')
  .option('-o, --output <dir>', 'Output directory (default: ./exports/<slug>)')
  .option('--dry-run', 'Show what would be exported without executing')
  .action(async (slug: string, options) => {
    const spinner = ora()

    // Validate slug format
    if (!isValidSlug(slug)) {
      logger.info(chalk.red('\n[ERROR] Invalid tenant slug'))
      logger.info(
        chalk.dim('   Slug must be lowercase alphanumeric with underscores only (e.g., my_brand)')
      )
      process.exit(1)
    }

    const defaultOutputDir = path.join(process.cwd(), 'exports', slug)
    const outputDir = options.output || defaultOutputDir

    logger.info(chalk.cyan('\n[EXPORT] Tenant Export (WordPress-style)\n'))
    logger.info(`  Tenant: ${chalk.bold(slug)}`)
    logger.info(`  Output: ${chalk.bold(outputDir)}`)
    logger.info(
      `  Mode: ${chalk.bold(options.fork ? 'Fork to GitHub + Vercel' : 'Local export only')}`
    )
    logger.info('')

    try {
      // Step 1: Export tenant data from database
      spinner.start('Fetching tenant data from database...')
      const tenantData = await exportTenantData(slug)
      spinner.succeed(
        `Fetched tenant data: ${tenantData.tableCount} tables, ${tenantData.totalRecords.toLocaleString()} records`
      )

      // Show summary
      logger.info('')
      logger.info(chalk.bold('  Organization:'))
      logger.info(chalk.dim(`    Name: ${tenantData.organization.name}`))
      logger.info(chalk.dim(`    Status: ${tenantData.organization.status}`))
      if (tenantData.organization.shopify_store_domain) {
        logger.info(chalk.dim(`    Shopify: ${tenantData.organization.shopify_store_domain}`))
      }
      if (tenantData.organization.stripe_account_id) {
        logger.info(chalk.dim(`    Stripe: ${tenantData.organization.stripe_account_id}`))
      }
      logger.info('')

      if (options.dryRun) {
        logger.info(chalk.yellow('  DRY RUN - No changes will be made\n'))
        logger.info(chalk.dim('  Would export to:'))
        logger.info(chalk.dim(`    Directory: ${outputDir}`))
        logger.info(
          chalk.dim(
            `    Files: organization.json, tenant-data.json, platform.config.ts, migration.sql, .env.example`
          )
        )
        logger.info('')

        if (options.fork) {
          logger.info(chalk.dim('  Would create:'))
          logger.info(
            chalk.dim(`    GitHub repo: ${options.org || '<org>'}/${options.repoName || slug}`)
          )
          logger.info(chalk.dim(`    Vercel project: ${options.repoName || slug}`))
          logger.info('')
        }

        return
      }

      // Step 2: Export to directory
      spinner.start('Exporting to directory...')
      await exportToDirectory({
        tenantData,
        outputDir,
        includeSecrets: false, // Never include encrypted secrets in exports
      })
      spinner.succeed(`Exported to directory: ${outputDir}`)

      // Step 3: Create GitHub repository (if --fork flag)
      if (options.fork) {
        // Prompt for GitHub token if not provided
        let githubToken = options.githubToken
        if (!githubToken) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: 'GitHub personal access token:',
              validate: (input: string) => (input.length > 0 ? true : 'Token is required'),
            },
          ])
          githubToken = answers.token
        }

        // Prompt for organization if not provided
        let org = options.org
        if (!org) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'org',
              message: 'GitHub organization or username:',
              validate: (input: string) => (input.length > 0 ? true : 'Organization is required'),
            },
          ])
          org = answers.org
        }

        const repoName = options.repoName || slug

        spinner.start(`Creating GitHub repository: ${org}/${repoName}...`)
        try {
          const repoUrl = await createGitHubRepo({
            githubToken,
            orgOrUsername: org,
            repoName,
            description: `Exported CGK tenant: ${tenantData.organization.name}`,
            private: true,
            templateRepo: 'cgk-platform/cgk-template',
          })
          spinner.succeed(`Created GitHub repository: ${repoUrl}`)
          logger.info('')
        } catch (error) {
          spinner.fail('Failed to create GitHub repository')
          logger.info(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`))
          logger.info('')
          logger.info(chalk.yellow('  Continuing without GitHub repository...\n'))
        }

        // Step 4: Create Vercel project (if --vercel-token provided)
        if (options.vercelToken) {
          spinner.start('Creating Vercel project...')
          try {
            const vercelProjectId = await setupVercelProject({
              token: options.vercelToken,
              teamId: 'cgk-linens-88e79683', // CGK team ID
              projectName: repoName,
              githubRepo: `${org}/${repoName}`,
              framework: 'nextjs',
            })
            spinner.succeed(`Created Vercel project: ${vercelProjectId}`)
            logger.info('')
          } catch (error) {
            spinner.fail('Failed to create Vercel project')
            logger.info(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`))
            logger.info('')
          }
        } else {
          logger.info(chalk.dim('  Skipping Vercel project (no --vercel-token provided)\n'))
        }
      }

      // Success message
      logger.info(chalk.green('[SUCCESS] Tenant exported successfully!\n'))
      logger.info('Next steps:')
      logger.info('  1. Review exported files:')
      logger.info(chalk.cyan(`     cd ${outputDir}`))
      logger.info('  2. Import to new platform:')
      logger.info(
        chalk.cyan(
          `     npx @cgk-platform/cli tenant:import ${path.join(outputDir, 'migration.sql')} --target new_slug`
        )
      )

      if (options.fork) {
        logger.info('  3. Push exported files to GitHub:')
        logger.info(chalk.cyan(`     cd ${outputDir}`))
        logger.info(chalk.cyan(`     git init && git add . && git commit -m "Initial export"`))
        logger.info(
          chalk.cyan(
            `     git remote add origin https://github.com/${options.org || '<org>'}/${options.repoName || slug}.git`
          )
        )
        logger.info(chalk.cyan(`     git push -u origin main`))
      }

      logger.info('')
    } catch (error) {
      spinner.fail('Export failed')
      if (error instanceof Error) {
        logger.info(chalk.red(`  ${error.message}`))
        if (error.stack) {
          logger.debug(chalk.dim(error.stack))
        }
      }
      process.exit(1)
    }
  })
