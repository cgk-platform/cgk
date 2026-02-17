import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'

interface OutdatedPackage {
  current: string
  wanted: string
  latest: string
  dependent?: string
}

interface PackageUpdate {
  name: string
  current: string
  latest: string
}

export const updateCommand = new Command('update')
  .description('Update packages to latest versions')
  .option('--dry-run', 'Preview updates without applying them', false)
  .option('--all', 'Update all packages, not just @cgk-platform/*', false)
  .option('--yes, -y', 'Skip confirmation prompt', false)
  .option('--latest', 'Update to latest versions (default: wanted versions)', false)
  .action(async (options) => {
    const spinner = ora('Checking for updates...').start()

    try {
      const { execSync, exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // Build the pnpm outdated command
      const filter = options.all ? '' : '@cgk-platform/*'

      let result: string
      try {
        result = execSync(`pnpm outdated ${filter} --json`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      } catch (error) {
        // pnpm outdated returns exit code 1 when updates are available
        if (
          error &&
          typeof error === 'object' &&
          'stdout' in error &&
          typeof (error as { stdout: unknown }).stdout === 'string'
        ) {
          result = (error as { stdout: string }).stdout
        } else {
          spinner.succeed('All packages are up to date!')
          return
        }
      }

      // Parse the JSON output
      let outdated: Record<string, OutdatedPackage>
      try {
        outdated = JSON.parse(result || '{}')
      } catch {
        spinner.succeed('All packages are up to date!')
        return
      }

      const packages = Object.entries(outdated)
      if (packages.length === 0) {
        spinner.succeed('All packages are up to date!')
        return
      }

      spinner.stop()

      // Prepare update list
      const updates: PackageUpdate[] = packages.map(([name, info]) => ({
        name,
        current: info.current,
        latest: options.latest ? info.latest : info.wanted,
      }))

      // Group by package type for display
      const cgkUpdates = updates.filter((u) => u.name.startsWith('@cgk-platform/'))
      const otherUpdates = updates.filter((u) => !u.name.startsWith('@cgk-platform/'))

      // Display updates
      console.log(chalk.cyan('\n📦 Packages to update:\n'))

      if (cgkUpdates.length > 0) {
        console.log(chalk.bold('  CGK Platform Packages:'))
        for (const pkg of cgkUpdates) {
          const current = chalk.red(pkg.current)
          const target = chalk.green(pkg.latest)
          console.log(`    ${chalk.cyan(pkg.name)}: ${current} → ${target}`)
        }
        console.log('')
      }

      if (otherUpdates.length > 0 && options.all) {
        console.log(chalk.bold('  Other Packages:'))
        for (const pkg of otherUpdates.slice(0, 15)) {
          const current = chalk.red(pkg.current)
          const target = chalk.green(pkg.latest)
          console.log(`    ${chalk.dim(pkg.name)}: ${current} → ${target}`)
        }
        if (otherUpdates.length > 15) {
          console.log(chalk.dim(`    ... and ${otherUpdates.length - 15} more`))
        }
        console.log('')
      }

      // Dry run mode - just show what would happen
      if (options.dryRun) {
        console.log(chalk.yellow('  DRY RUN - No changes will be made\n'))
        console.log(chalk.bold('  Commands that would run:\n'))

        if (cgkUpdates.length > 0) {
          const cgkPkgSpecs = cgkUpdates.map((u) => `${u.name}@${u.latest}`).join(' ')
          console.log(chalk.dim(`    pnpm update ${cgkPkgSpecs}`))
        }

        if (otherUpdates.length > 0 && options.all) {
          const otherPkgSpecs = otherUpdates.map((u) => `${u.name}@${u.latest}`).join(' ')
          console.log(chalk.dim(`    pnpm update ${otherPkgSpecs}`))
        }

        console.log('')
        return
      }

      // Confirmation prompt
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Update ${updates.length} package${updates.length === 1 ? '' : 's'}?`,
            default: true,
          },
        ])

        if (!proceed) {
          console.log(chalk.yellow('\n  Update cancelled.\n'))
          return
        }
      }

      // Perform the updates
      console.log('')
      const updateSpinner = ora('Updating packages...').start()

      try {
        // Build package specs for pnpm update
        const packagesToUpdate = options.all ? updates : cgkUpdates
        const pkgSpecs = packagesToUpdate.map((u) => `${u.name}@${u.latest}`).join(' ')

        // Run pnpm update
        await execAsync(`pnpm update ${pkgSpecs}`, {
          encoding: 'utf-8',
        })

        updateSpinner.succeed('Packages updated successfully!')

        // Show updated packages
        console.log(chalk.green('\n✅ Updated packages:\n'))
        for (const pkg of packagesToUpdate.slice(0, 20)) {
          console.log(chalk.green(`    ✓ ${pkg.name}@${pkg.latest}`))
        }
        if (packagesToUpdate.length > 20) {
          console.log(chalk.dim(`    ... and ${packagesToUpdate.length - 20} more`))
        }

        // Remind about lockfile
        console.log('')
        console.log(chalk.dim('  Remember to commit the updated pnpm-lock.yaml'))
        console.log('')
      } catch (error) {
        updateSpinner.fail('Failed to update packages')
        console.error(
          chalk.red(
            '\n  Error: ' + (error instanceof Error ? error.message : String(error)) + '\n'
          )
        )
        console.log(chalk.dim('  Try running `pnpm update` manually to see detailed errors.'))
        process.exit(1)
      }
    } catch (error) {
      spinner.fail('Failed to check for updates')
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  })
