import { Command } from 'commander'
import chalk from 'chalk'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string
}

export const doctorCommand = new Command('doctor')
  .description('Check system requirements and configuration')
  .action(async () => {
    console.log(chalk.cyan('\n🔍 CGK Doctor - Checking system...\n'))

    const results: CheckResult[] = []

    // Check Node.js version
    const nodeVersion = process.version
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10)
    results.push({
      name: 'Node.js',
      status: nodeMajor >= 20 ? 'pass' : 'fail',
      message: `${nodeVersion}`,
      details: nodeMajor >= 20 ? undefined : 'Node.js 20+ required',
    })

    // Check pnpm
    const pnpmCheck = await checkCommand('pnpm --version')
    results.push({
      name: 'pnpm',
      status: pnpmCheck.success ? 'pass' : 'fail',
      message: pnpmCheck.output || 'Not found',
      details: pnpmCheck.success ? undefined : 'Install with: npm install -g pnpm',
    })

    // Check environment variables
    const envVars = [
      { name: 'DATABASE_URL', required: true },
      { name: 'REDIS_URL', required: false },
      { name: 'JWT_SECRET', required: true },
    ]

    for (const { name, required } of envVars) {
      const value = process.env[name]
      results.push({
        name: `Env: ${name}`,
        status: value ? 'pass' : required ? 'fail' : 'warn',
        message: value ? 'Set' : 'Not set',
        details: !value && required ? `Required: Set ${name} in .env.local` : undefined,
      })
    }

    // Check if we're in a CGK project
    const fs = await import('fs-extra')
    const path = await import('path')
    const configPath = path.join(process.cwd(), 'platform.config.ts')
    const hasConfig = await fs.pathExists(configPath)
    results.push({
      name: 'CGK Project',
      status: hasConfig ? 'pass' : 'warn',
      message: hasConfig ? 'Detected' : 'Not in CGK project',
      details: hasConfig ? undefined : 'Run from CGK project root or use cgk create',
    })

    // Display results
    console.log(chalk.bold('System Check Results:\n'))

    for (const result of results) {
      const icon =
        result.status === 'pass'
          ? chalk.green('✓')
          : result.status === 'warn'
            ? chalk.yellow('⚠')
            : chalk.red('✗')

      console.log(`  ${icon} ${chalk.bold(result.name)}: ${result.message}`)
      if (result.details) {
        console.log(`     ${chalk.dim(result.details)}`)
      }
    }

    // Summary
    const passed = results.filter((r) => r.status === 'pass').length
    const failed = results.filter((r) => r.status === 'fail').length
    const warned = results.filter((r) => r.status === 'warn').length

    console.log('')
    if (failed === 0) {
      console.log(chalk.green(`✅ All checks passed! (${passed} passed, ${warned} warnings)`))
    } else {
      console.log(chalk.red(`❌ ${failed} checks failed (${passed} passed, ${warned} warnings)`))
      console.log(chalk.dim('Fix the issues above before continuing.'))
      process.exit(1)
    }
    console.log('')
  })

async function checkCommand(
  command: string
): Promise<{ success: boolean; output?: string }> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    const { stdout } = await execAsync(command)
    return { success: true, output: stdout.trim() }
  } catch {
    return { success: false }
  }
}
