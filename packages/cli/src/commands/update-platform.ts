import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import { logger } from '@cgk-platform/logging'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface GitStatus {
  clean: boolean
  modified: number
  untracked: number
  staged: number
}

export const updatePlatformCommand = new Command('update-platform')
  .description('Update CGK platform from upstream repository')
  .option('--dry-run', 'Preview changes without applying them', false)
  .option('--yes, -y', 'Skip confirmation prompts', false)
  .option('--skip-typecheck', 'Skip typecheck after merge', false)
  .action(async (options) => {
    logger.info(chalk.cyan('\n🔄 CGK Platform Updater\n'))

    const spinner = ora()

    try {
      // Step 1: Check git status is clean
      spinner.start('Checking git status...')
      const gitStatus = await checkGitStatus()

      if (!gitStatus.clean) {
        spinner.fail('Git working directory is not clean')
        logger.error(chalk.red('\n  You have uncommitted changes:\n'))
        if (gitStatus.staged > 0) {
          logger.error(chalk.yellow(`    ${gitStatus.staged} staged file(s)`))
        }
        if (gitStatus.modified > 0) {
          logger.error(chalk.yellow(`    ${gitStatus.modified} modified file(s)`))
        }
        if (gitStatus.untracked > 0) {
          logger.error(chalk.yellow(`    ${gitStatus.untracked} untracked file(s)`))
        }
        logger.error('')
        logger.error(chalk.dim('  Commit or stash your changes before updating platform.\n'))
        process.exit(1)
      }

      spinner.succeed('Git working directory is clean')

      // Step 2: Check for upstream remote
      spinner.start('Checking upstream remote...')
      const upstreamExists = await checkUpstreamRemote()

      if (!upstreamExists) {
        spinner.fail('Upstream remote not configured')
        logger.error(chalk.red('\n  Upstream remote is not configured.\n'))
        logger.error(chalk.dim('  To add upstream remote, run:'))
        logger.error(
          chalk.dim('    git remote add upstream https://github.com/cgk-platform/cgk.git\n')
        )
        process.exit(1)
      }

      spinner.succeed('Upstream remote configured')

      // Step 3: Fetch from upstream
      spinner.start('Fetching from upstream...')
      await execAsync('git fetch upstream')
      await execAsync('git fetch upstream --tags')
      spinner.succeed('Fetched from upstream')

      // Step 4: Get current and latest version
      spinner.start('Checking platform version...')
      const currentVersion = await getCurrentVersion()
      const latestVersion = await getLatestUpstreamVersion()

      spinner.stop()

      logger.info('')
      logger.info(chalk.bold('  Version Information:'))
      logger.info(`    Current:  ${chalk.cyan(currentVersion)}`)
      logger.info(`    Latest:   ${chalk.green(latestVersion)}`)
      logger.info('')

      if (currentVersion === latestVersion) {
        logger.info(chalk.green('✅ Platform is already up to date!\n'))
        return
      }

      // Step 5: Show what will be updated
      spinner.start('Checking for changes...')
      const changes = await getUpstreamChanges()
      spinner.stop()

      logger.info(chalk.bold('  Changes to be merged:\n'))
      logger.info(chalk.dim(`    ${changes.commits} commit(s)`))
      logger.info(chalk.dim(`    ${changes.filesChanged} file(s) changed`))
      logger.info(
        chalk.dim(`    ${changes.insertions} insertion(s), ${changes.deletions} deletion(s)`)
      )
      logger.info('')

      if (options.dryRun) {
        logger.info(chalk.yellow('  DRY RUN - No changes will be made\n'))
        logger.info(chalk.bold('  Commands that would run:\n'))
        logger.info(chalk.dim(`    git checkout -b update/platform-${latestVersion}`))
        logger.info(chalk.dim(`    git merge upstream/main --no-edit`))
        logger.info(chalk.dim(`    pnpm install`))
        logger.info(chalk.dim(`    pnpm update @cgk-platform/*`))
        if (!options.skipTypecheck) {
          logger.info(chalk.dim(`    pnpm turbo typecheck`))
        }
        logger.info('')
        logger.info(chalk.bold('  Next steps (manual):'))
        logger.info(chalk.dim('    1. Review changes'))
        logger.info(chalk.dim('    2. Test locally'))
        logger.info(chalk.dim('    3. git push origin update/platform-{version}'))
        logger.info(chalk.dim('    4. Create PR for review'))
        logger.info('')
        return
      }

      // Confirmation prompt
      if (!options.yes) {
        logger.info(chalk.yellow('  This will create a new branch and merge upstream changes.\n'))
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with platform update?',
            default: false,
          },
        ])

        if (!proceed) {
          logger.info(chalk.yellow('\n  Update cancelled.\n'))
          return
        }
      }

      // Step 6: Create update branch
      logger.info('')
      const branchName = `update/platform-${latestVersion}`
      spinner.start(`Creating branch ${branchName}...`)

      try {
        await execAsync(`git checkout -b ${branchName}`)
        spinner.succeed(`Created branch ${branchName}`)
      } catch (error) {
        // Branch might already exist, try to check it out
        try {
          await execAsync(`git checkout ${branchName}`)
          spinner.warn(`Switched to existing branch ${branchName}`)
        } catch {
          spinner.fail('Failed to create or switch to update branch')
          throw error
        }
      }

      // Step 7: Merge upstream respecting .gitattributes
      spinner.start('Merging upstream changes...')

      try {
        await execAsync(
          'git merge upstream/main --no-edit -m "chore: merge platform updates from upstream"'
        )
        spinner.succeed('Merged upstream changes')

        // Check if there were merge conflicts
        const statusAfterMerge = await checkGitStatus()
        if (!statusAfterMerge.clean) {
          spinner.warn('Merge completed with conflicts')
          logger.warn(chalk.yellow('\n  ⚠️  Merge conflicts detected!\n'))
          logger.warn(chalk.dim('  Please resolve conflicts manually, then run:'))
          logger.warn(chalk.dim(`    git add .`))
          logger.warn(chalk.dim(`    git commit -m "chore: resolve merge conflicts"`))
          logger.warn('')
          logger.warn(
            chalk.dim(
              '  After resolving conflicts, run: pnpm update @cgk-platform/* && pnpm turbo typecheck'
            )
          )
          logger.warn('')
          process.exit(1)
        }
      } catch (error) {
        spinner.fail('Merge failed')
        throw error
      }

      // Step 8: Update @cgk-platform/* packages
      spinner.start('Updating @cgk-platform/* packages...')

      try {
        await execAsync('pnpm install')
        await execAsync('pnpm update @cgk-platform/*')
        spinner.succeed('Updated CGK platform packages')
      } catch (error) {
        spinner.fail('Failed to update packages')
        throw error
      }

      // Step 9: Run type check
      if (!options.skipTypecheck) {
        spinner.start('Running typecheck...')

        try {
          await execAsync('pnpm turbo typecheck', {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large output
          })
          spinner.succeed('Typecheck passed')
        } catch (error) {
          spinner.fail('Typecheck failed')
          logger.error(chalk.red('\n  ❌ Typecheck failed after merge\n'))
          logger.error(chalk.dim('  This may indicate breaking changes in the platform update.'))
          logger.error(chalk.dim('  Please review the errors and fix them before proceeding.\n'))
          logger.error(chalk.dim('  To see full errors, run: pnpm turbo typecheck'))
          logger.error('')

          // Show the error output
          if (error instanceof Error && 'stdout' in error) {
            const stdout = (error as { stdout?: string }).stdout
            if (stdout) {
              const lines = stdout.split('\n')
              const errorLines = lines.filter(
                (line) => line.includes('error TS') || line.includes('✘')
              )
              if (errorLines.length > 0) {
                logger.error(chalk.dim('  First few errors:\n'))
                for (const line of errorLines.slice(0, 10)) {
                  logger.error(chalk.dim(`    ${line}`))
                }
                if (errorLines.length > 10) {
                  logger.error(chalk.dim(`    ... and ${errorLines.length - 10} more errors`))
                }
                logger.error('')
              }
            }
          }

          process.exit(1)
        }
      }

      // Success!
      logger.info(chalk.green('\n✅ Platform update complete!\n'))

      // Step 10: Show next steps
      logger.info(chalk.bold('  Next steps:\n'))
      logger.info(chalk.dim('  1. Review the changes:'))
      logger.info(chalk.dim(`       git log --oneline HEAD~${changes.commits}..HEAD`))
      logger.info(chalk.dim('       git diff HEAD~1'))
      logger.info('')
      logger.info(chalk.dim('  2. Test locally:'))
      logger.info(chalk.dim('       pnpm dev'))
      logger.info(chalk.dim('       pnpm test'))
      logger.info('')
      logger.info(chalk.dim('  3. Push update branch:'))
      logger.info(chalk.dim(`       git push origin ${branchName}`))
      logger.info('')
      logger.info(chalk.dim('  4. Create pull request for review'))
      logger.info('')
      logger.info(chalk.dim('  5. After PR approval, merge to main and deploy'))
      logger.info('')
    } catch (error) {
      spinner.fail('Platform update failed')
      logger.error(chalk.red('\n❌ Error:\n'))
      logger.error(chalk.dim('  ' + (error instanceof Error ? error.message : String(error))))
      logger.error('')
      process.exit(1)
    }
  })

async function checkGitStatus(): Promise<GitStatus> {
  try {
    const { stdout } = await execAsync('git status --porcelain')
    const lines = stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)

    const staged = lines.filter((line) => /^[MADRCU]/.test(line)).length
    const modified = lines.filter((line) => /^ [MADRCU]/.test(line)).length
    const untracked = lines.filter((line) => /^\?\?/.test(line)).length

    return {
      clean: lines.length === 0,
      staged,
      modified,
      untracked,
    }
  } catch (error) {
    throw new Error(
      `Failed to check git status: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function checkUpstreamRemote(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git remote -v')
    return stdout.includes('upstream')
  } catch {
    return false
  }
}

async function getCurrentVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'git describe --tags --abbrev=0 2>/dev/null || echo "unknown"'
    )
    return stdout.trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function getLatestUpstreamVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'git describe --tags --abbrev=0 upstream/main 2>/dev/null || echo "unknown"'
    )
    return stdout.trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function getUpstreamChanges(): Promise<{
  commits: number
  filesChanged: number
  insertions: number
  deletions: number
}> {
  try {
    // Get commit count
    const { stdout: commitOutput } = await execAsync('git rev-list --count HEAD..upstream/main')
    const commits = parseInt(commitOutput.trim(), 10) || 0

    // Get diffstat
    const { stdout: diffstatOutput } = await execAsync('git diff --shortstat HEAD...upstream/main')

    // Parse diffstat: "X files changed, Y insertions(+), Z deletions(-)"
    const filesMatch = diffstatOutput.match(/(\d+) files? changed/)
    const insertionsMatch = diffstatOutput.match(/(\d+) insertions?/)
    const deletionsMatch = diffstatOutput.match(/(\d+) deletions?/)

    return {
      commits,
      filesChanged: filesMatch ? parseInt(filesMatch[1] ?? '0', 10) : 0,
      insertions: insertionsMatch ? parseInt(insertionsMatch[1] ?? '0', 10) : 0,
      deletions: deletionsMatch ? parseInt(deletionsMatch[1] ?? '0', 10) : 0,
    }
  } catch {
    return {
      commits: 0,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    }
  }
}
