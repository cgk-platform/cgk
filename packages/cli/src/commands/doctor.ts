import chalk from 'chalk'
import { Command } from 'commander'

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
    // Check POSTGRES_URL (Vercel/Neon standard) or DATABASE_URL fallback
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
    results.push({
      name: 'Env: POSTGRES_URL',
      status: dbUrl ? 'pass' : 'fail',
      message: dbUrl ? (process.env.POSTGRES_URL ? 'Set' : 'Set (as DATABASE_URL)') : 'Not set',
      details: !dbUrl ? 'Required: Add Neon via Vercel Storage, then run vercel env pull' : undefined,
    })

    // Check Redis (Upstash) - Vercel uses KV_REST_API_*, direct Upstash uses UPSTASH_*
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const redisEnvName = process.env.KV_REST_API_URL ? 'KV_REST_API_URL' : 'UPSTASH_REDIS_REST_URL'
    results.push({
      name: 'Env: Redis (KV)',
      status: redisUrl ? 'pass' : 'warn',
      message: redisUrl ? `Set (${redisEnvName})` : 'Not set',
      details: !redisUrl ? 'Optional: Add Upstash via Vercel Storage for Redis cache' : undefined,
    })

    // Check JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET
    results.push({
      name: 'Env: JWT_SECRET',
      status: jwtSecret ? 'pass' : 'warn',
      message: jwtSecret ? 'Set' : 'Not set',
      details: !jwtSecret ? 'Needed for auth (will be required in Phase 1C)' : undefined,
    })

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
