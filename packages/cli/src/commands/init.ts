import path from 'path'

import chalk from 'chalk'
import { Command } from 'commander'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import ora from 'ora'


export const initCommand = new Command('init')
  .description('Initialize CGK in an existing project')
  .action(async () => {
    const spinner = ora()

    console.log(chalk.cyan('\n🔧 Initializing CGK in existing project...\n'))

    // Check if package.json exists
    const pkgPath = path.join(process.cwd(), 'package.json')
    if (!(await fs.pathExists(pkgPath))) {
      console.log(
        chalk.red('No package.json found. Please run from project root.')
      )
      process.exit(1)
    }

    // Check if already initialized
    const configPath = path.join(process.cwd(), 'platform.config.ts')
    if (await fs.pathExists(configPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'CGK already initialized. Overwrite configuration?',
          default: false,
        },
      ])

      if (!overwrite) {
        console.log(chalk.yellow('Aborted.'))
        process.exit(0)
      }
    }

    // Gather information
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Brand name:',
        validate: (input: string) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'slug',
        message: 'Brand slug (URL-safe):',
        default: (answers: { name: string }) =>
          answers.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        validate: (input: string) =>
          /^[a-z0-9-]+$/.test(input) ||
          'Slug must contain only lowercase letters, numbers, and hyphens',
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select features to enable:',
        choices: [
          { name: 'Creator Portal', value: 'creators', checked: true },
          { name: 'A/B Testing', value: 'abTesting', checked: false },
          { name: 'Attribution', value: 'attribution', checked: false },
          { name: 'Reviews', value: 'reviews', checked: true },
          { name: 'Subscriptions', value: 'subscriptions', checked: false },
        ],
      },
    ])

    // Create configuration
    spinner.start('Creating configuration...')

    const features = answers.features.reduce(
      (acc: Record<string, boolean>, feature: string) => {
        acc[feature] = true
        return acc
      },
      {}
    )

    const config = `import { defineConfig } from '@cgk/core'

export default defineConfig({
  brand: {
    name: '${answers.name}',
    slug: '${answers.slug}',
  },
  features: ${JSON.stringify(features, null, 4).replace(/"/g, '')},
  deployment: {
    profile: 'small',
  },
})
`

    await fs.writeFile(configPath, config)
    spinner.succeed('Configuration created')

    // Add dependencies
    spinner.start('Updating package.json...')
    const pkg = await fs.readJson(pkgPath)

    pkg.dependencies = pkg.dependencies || {}
    pkg.dependencies['@cgk/core'] = 'workspace:*'
    pkg.dependencies['@cgk/db'] = 'workspace:*'
    pkg.dependencies['@cgk/auth'] = 'workspace:*'
    pkg.dependencies['@cgk/ui'] = 'workspace:*'

    await fs.writeJson(pkgPath, pkg, { spaces: 2 })
    spinner.succeed('Package.json updated')

    console.log(chalk.green('\n✅ CGK initialized successfully!\n'))
    console.log('Next steps:')
    console.log(chalk.cyan('  pnpm install'))
    console.log(chalk.cyan('  cgk setup'))
    console.log('')
  })
