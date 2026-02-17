import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

interface OutdatedPackage {
  current: string
  wanted: string
  latest: string
  dependent?: string
}

export const checkUpdatesCommand = new Command('check-updates')
  .description('Check for available package updates')
  .option('--channel <channel>', 'Release channel: stable, beta, canary', 'stable')
  .option('--all', 'Check all packages, not just @cgk-platform/*', false)
  .action(async (options) => {
    const spinner = ora('Checking for updates...').start()

    try {
      const { execSync } = await import('child_process')

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
        // The output is still in stdout
        if (
          error &&
          typeof error === 'object' &&
          'stdout' in error &&
          typeof (error as { stdout: unknown }).stdout === 'string'
        ) {
          result = (error as { stdout: string }).stdout
        } else {
          // No updates available or other error
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

      // Filter by channel if not 'stable'
      const packages = Object.entries(outdated)
      const filteredPackages = packages.filter(([, info]) => {
        if (options.channel === 'stable') {
          // Only show stable versions (no pre-release tags)
          return !info.latest.includes('-')
        } else if (options.channel === 'beta') {
          return info.latest.includes('-beta') || !info.latest.includes('-')
        } else if (options.channel === 'canary') {
          return true // Show all versions including canary
        }
        return true
      })

      if (filteredPackages.length === 0) {
        spinner.succeed('All packages are up to date!')
        return
      }

      spinner.stop()

      console.log(chalk.cyan('\n📦 Updates available:\n'))

      // Group by package type
      const cgkPackages = filteredPackages.filter(([pkg]) => pkg.startsWith('@cgk-platform/'))
      const otherPackages = filteredPackages.filter(([pkg]) => !pkg.startsWith('@cgk-platform/'))

      if (cgkPackages.length > 0) {
        console.log(chalk.bold('  CGK Platform Packages:'))
        for (const [pkg, info] of cgkPackages) {
          const current = chalk.red(info.current)
          const latest = chalk.green(info.latest)
          console.log(`    ${chalk.cyan(pkg)}: ${current} → ${latest}`)
        }
        console.log('')
      }

      if (otherPackages.length > 0 && options.all) {
        console.log(chalk.bold('  Other Packages:'))
        for (const [pkg, info] of otherPackages.slice(0, 20)) {
          const current = chalk.red(info.current)
          const latest = chalk.green(info.latest)
          console.log(`    ${chalk.dim(pkg)}: ${current} → ${latest}`)
        }
        if (otherPackages.length > 20) {
          console.log(chalk.dim(`    ... and ${otherPackages.length - 20} more`))
        }
        console.log('')
      }

      // Summary
      const totalUpdates = filteredPackages.length
      console.log(
        chalk.yellow(`  ${totalUpdates} package${totalUpdates === 1 ? '' : 's'} can be updated.`)
      )
      console.log(chalk.dim('\n  Run `npx @cgk-platform/cli update` to update packages'))
      console.log(chalk.dim('  Run `npx @cgk-platform/cli update --dry-run` to preview changes\n'))
    } catch (error) {
      spinner.fail('Failed to check for updates')
      console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  })
