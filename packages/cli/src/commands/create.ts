import path from 'path'

import chalk from 'chalk'
import { Command } from 'commander'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import ora from 'ora'


export const createCommand = new Command('create')
  .description('Create a new CGK brand site')
  .argument('<name>', 'Name of the brand site')
  .option('-t, --template <template>', 'Template to use', 'full')
  .option('-d, --directory <directory>', 'Directory to create the project in')
  .option('--skip-install', 'Skip installing dependencies')
  .action(async (name: string, options) => {
    const spinner = ora()

    console.log(chalk.cyan('\n🚀 Creating CGK brand site...\n'))

    // Validate name
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (slug !== name) {
      console.log(chalk.yellow(`Using slug: ${chalk.bold(slug)}`))
    }

    // Determine directory
    const targetDir = options.directory || path.join(process.cwd(), slug)

    // Check if directory exists
    if (await fs.pathExists(targetDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${slug} already exists. Overwrite?`,
          default: false,
        },
      ])

      if (!overwrite) {
        console.log(chalk.red('Aborted.'))
        process.exit(1)
      }

      await fs.remove(targetDir)
    }

    // Validate template
    const validTemplates = ['basic', 'full', 'storefront-only']
    if (!validTemplates.includes(options.template)) {
      console.log(
        chalk.red(`Invalid template. Choose from: ${validTemplates.join(', ')}`)
      )
      process.exit(1)
    }

    spinner.start(`Creating project from ${options.template} template...`)

    try {
      // Copy template
      const templateDir = path.join(
        import.meta.dirname,
        '..',
        '..',
        'templates',
        options.template
      )

      if (await fs.pathExists(templateDir)) {
        await fs.copy(templateDir, targetDir)
      } else {
        // Create basic structure if template doesn't exist yet
        await fs.ensureDir(targetDir)
        await createBasicStructure(targetDir, slug, name)
      }

      spinner.succeed('Project created')

      // Create platform.config.ts
      spinner.start('Creating configuration...')
      await createPlatformConfig(targetDir, slug, name)
      spinner.succeed('Configuration created')

      // Install dependencies
      if (!options.skipInstall) {
        spinner.start('Installing dependencies...')
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        
        try {
          await execAsync('pnpm install', { cwd: targetDir })
          spinner.succeed('Dependencies installed')
        } catch (err) {
          spinner.warn('Failed to install dependencies')
          console.log(chalk.yellow('  Run `pnpm install` manually in the project directory'))
        }
      }

      // Success message
      console.log(chalk.green('\n✅ Brand site created successfully!\n'))
      console.log('Next steps:')
      console.log(chalk.cyan(`  cd ${slug}`))
      console.log(chalk.cyan('  pnpm dev'))
      console.log('')
      console.log('Documentation: https://cgk.dev/docs')
      console.log('')
    } catch (err) {
      spinner.fail('Failed to create project')
      console.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  })

async function createBasicStructure(
  dir: string,
  slug: string,
  name: string
): Promise<void> {
  // Create package.json
  const pkg = {
    name: slug,
    version: '0.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      '@cgk-platform/core': 'workspace:*',
      '@cgk-platform/db': 'workspace:*',
      '@cgk-platform/auth': 'workspace:*',
      '@cgk-platform/ui': 'workspace:*',
      next: '^14.1.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/node': '^20.11.0',
      '@types/react': '^18.2.48',
      '@types/react-dom': '^18.2.18',
      typescript: '^5.3.3',
    },
  }

  await fs.writeJson(path.join(dir, 'package.json'), pkg, { spaces: 2 })

  // Create directories
  await fs.ensureDir(path.join(dir, 'src', 'app'))
  await fs.ensureDir(path.join(dir, 'src', 'components'))
  await fs.ensureDir(path.join(dir, 'src', 'lib'))

  // Create basic page
  await fs.writeFile(
    path.join(dir, 'src', 'app', 'page.tsx'),
    `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">${name}</h1>
      <p className="mt-4 text-lg text-gray-600">
        Welcome to your CGK brand site
      </p>
    </main>
  )
}
`
  )

  // Create layout
  await fs.writeFile(
    path.join(dir, 'src', 'app', 'layout.tsx'),
    `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${name}',
  description: 'Powered by CGK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`
  )

  // Create globals.css
  await fs.writeFile(
    path.join(dir, 'src', 'app', 'globals.css'),
    `@tailwind base;
@tailwind components;
@tailwind utilities;
`
  )

  // Create tsconfig.json
  await fs.writeJson(
    path.join(dir, 'tsconfig.json'),
    {
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    { spaces: 2 }
  )
}

async function createPlatformConfig(
  dir: string,
  slug: string,
  name: string
): Promise<void> {
  const config = `import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: '${name}',
    slug: '${slug}',
  },
  features: {
    creators: true,
    abTesting: false,
    attribution: false,
    reviews: true,
  },
  deployment: {
    profile: 'small',
  },
})
`
  await fs.writeFile(path.join(dir, 'platform.config.ts'), config)
}
