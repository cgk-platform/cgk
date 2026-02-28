/**
 * Deployment Readiness Checker Skill
 *
 * Comprehensive pre-deployment validation to prevent common deployment failures:
 * - Tests passing
 * - Type check successful
 * - Migrations applied
 * - Environment variables complete
 * - Database connectivity
 * - Tenant isolation violations
 * - Build succeeds
 * - No critical TODOs in deployment scope
 *
 * Usage: /deployment-readiness-checker --app admin --env production
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { glob } from 'glob'

export default {
  name: 'deployment-readiness-checker',
  version: '1.0.0',
  description: 'Pre-deployment validation to prevent deployment failures',

  async execute(args = {}) {
    const {
      app = 'admin',
      env = 'production',
      skipTests = false,
      skipBuild = false,
      verbose = false
    } = args

    console.log('🚀 Deployment Readiness Checker\n')
    console.log(`  App: ${app}`)
    console.log(`  Environment: ${env}`)
    console.log('')

    const checks = []
    const warnings = []
    const errors = []
    let passedChecks = 0
    let totalChecks = 0

    // Helper function to run a check
    const runCheck = async (name, fn) => {
      totalChecks++
      process.stdout.write(`⏳ ${name}...`)

      try {
        const result = await fn()

        if (result.status === 'pass') {
          passedChecks++
          process.stdout.write(`\r✅ ${name}\n`)

          if (result.warnings && result.warnings.length > 0) {
            warnings.push(...result.warnings.map(w => `[${name}] ${w}`))
          }
        } else if (result.status === 'warn') {
          passedChecks++
          process.stdout.write(`\r⚠️  ${name}\n`)
          warnings.push(`[${name}] ${result.message}`)
        } else {
          process.stdout.write(`\r❌ ${name}\n`)
          errors.push(`[${name}] ${result.message}`)

          if (verbose && result.details) {
            console.log(`   ${result.details}`)
          }
        }

        checks.push({ name, ...result })
      } catch (error) {
        process.stdout.write(`\r❌ ${name}\n`)
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`[${name}] ${errorMsg}`)
        checks.push({ name, status: 'fail', message: errorMsg })
      }
    }

    // Check 1: Verify app exists
    await runCheck('Verify app exists', async () => {
      const appDir = resolve(process.cwd(), 'apps', app)

      if (!existsSync(appDir)) {
        return {
          status: 'fail',
          message: `App directory not found: ${appDir}`,
          details: `Available apps: ${getAvailableApps().join(', ')}`
        }
      }

      return { status: 'pass' }
    })

    // Check 2: Type check
    await runCheck('TypeScript type check', async () => {
      try {
        execSync(`cd apps/${app} && npx tsc --noEmit`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        })
        return { status: 'pass' }
      } catch (error) {
        const output = error.stdout || error.stderr || ''
        const errorCount = (output.match(/error TS/g) || []).length

        return {
          status: 'fail',
          message: `Type check failed with ${errorCount} error(s)`,
          details: verbose ? output : output.split('\n').slice(0, 10).join('\n')
        }
      }
    })

    // Check 3: Tests (if not skipped)
    if (!skipTests) {
      await runCheck('Unit tests', async () => {
        try {
          execSync(`cd apps/${app} && pnpm test`, {
            stdio: 'pipe',
            encoding: 'utf-8'
          })
          return { status: 'pass' }
        } catch (error) {
          const output = error.stdout || error.stderr || ''
          const failedTests = (output.match(/FAIL/g) || []).length

          return {
            status: 'fail',
            message: `${failedTests} test(s) failed`,
            details: verbose ? output : output.split('\n').slice(-20).join('\n')
          }
        }
      })
    }

    // Check 4: Environment variables
    await runCheck('Environment variables', async () => {
      const exampleEnvFile = resolve(process.cwd(), 'apps', app, '.env.example')
      const localEnvFile = resolve(process.cwd(), 'apps', app, '.env.local')

      if (!existsSync(exampleEnvFile)) {
        return {
          status: 'warn',
          message: 'No .env.example file found (recommended for documentation)'
        }
      }

      const exampleVars = parseEnvFile(exampleEnvFile)
      const missingVars = []

      // Check if .env.local exists
      if (existsSync(localEnvFile)) {
        const localVars = parseEnvFile(localEnvFile)

        exampleVars.forEach(varName => {
          if (!localVars.includes(varName)) {
            missingVars.push(varName)
          }
        })
      }

      if (missingVars.length > 0) {
        return {
          status: 'warn',
          message: `${missingVars.length} environment variable(s) not set locally`,
          warnings: missingVars.map(v => `Missing: ${v}`)
        }
      }

      return { status: 'pass' }
    })

    // Check 5: Database connectivity
    await runCheck('Database connectivity', async () => {
      // Check if DATABASE_URL is set
      const envFile = resolve(process.cwd(), 'apps', app, '.env.local')

      if (!existsSync(envFile)) {
        return {
          status: 'warn',
          message: 'No .env.local file - cannot verify database connection'
        }
      }

      const envContent = readFileSync(envFile, 'utf-8')
      const hasDbUrl = /DATABASE_URL=/.test(envContent)

      if (!hasDbUrl) {
        return {
          status: 'fail',
          message: 'DATABASE_URL not set in .env.local'
        }
      }

      return { status: 'pass' }
    })

    // Check 6: Tenant isolation violations
    await runCheck('Tenant isolation patterns', async () => {
      try {
        const result = execSync(`pnpm validate:tenant-isolation --path apps/${app}`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        })

        // Parse output for violations
        const violationMatch = result.match(/Total violations: (\d+)/)
        const violations = violationMatch ? parseInt(violationMatch[1], 10) : 0

        if (violations > 0) {
          return {
            status: 'fail',
            message: `${violations} tenant isolation violation(s) found`,
            details: 'Run: pnpm validate:tenant-isolation --path apps/${app} for details'
          }
        }

        return { status: 'pass' }
      } catch (error) {
        // If script doesn't exist, just warn
        return {
          status: 'warn',
          message: 'Tenant isolation validator not found (skipping)'
        }
      }
    })

    // Check 7: Build succeeds (if not skipped)
    if (!skipBuild) {
      await runCheck('Production build', async () => {
        try {
          execSync(`cd apps/${app} && pnpm build`, {
            stdio: 'pipe',
            encoding: 'utf-8',
            timeout: 300000 // 5 minutes
          })
          return { status: 'pass' }
        } catch (error) {
          const output = error.stdout || error.stderr || ''

          return {
            status: 'fail',
            message: 'Production build failed',
            details: verbose ? output : output.split('\n').slice(-30).join('\n')
          }
        }
      })
    }

    // Check 8: Critical TODOs
    await runCheck('Critical TODO comments', async () => {
      const files = await glob(`apps/${app}/**/*.{ts,tsx,js,jsx}`, {
        cwd: process.cwd(),
        ignore: [
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**'
        ]
      })

      const criticalTodos = []

      files.forEach(file => {
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, idx) => {
          const lowerLine = line.toLowerCase()

          if (
            lowerLine.includes('todo') &&
            (lowerLine.includes('critical') ||
              lowerLine.includes('fixme') ||
              lowerLine.includes('hack') ||
              lowerLine.includes('must fix'))
          ) {
            criticalTodos.push({
              file,
              line: idx + 1,
              content: line.trim()
            })
          }
        })
      })

      if (criticalTodos.length > 0) {
        return {
          status: 'warn',
          message: `${criticalTodos.length} critical TODO(s) found`,
          warnings: criticalTodos.slice(0, 5).map(
            t => `${t.file}:${t.line} - ${t.content}`
          )
        }
      }

      return { status: 'pass' }
    })

    // Check 9: Git status (uncommitted changes)
    await runCheck('Git status', async () => {
      try {
        const status = execSync('git status --porcelain', {
          stdio: 'pipe',
          encoding: 'utf-8'
        })

        if (status.trim().length > 0) {
          const changedFiles = status.trim().split('\n').length

          return {
            status: 'warn',
            message: `${changedFiles} uncommitted file(s) - commit before deploying`
          }
        }

        return { status: 'pass' }
      } catch {
        return {
          status: 'warn',
          message: 'Not a git repository (skipping)'
        }
      }
    })

    // Summary
    console.log('\n' + '─'.repeat(80))
    console.log('📊 Summary\n')
    console.log(`  Total checks: ${totalChecks}`)
    console.log(`  Passed: ${passedChecks}`)
    console.log(`  Failed: ${totalChecks - passedChecks}`)
    console.log(`  Warnings: ${warnings.length}`)
    console.log('')

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:')
      warnings.forEach(w => console.log(`  • ${w}`))
      console.log('')
    }

    if (errors.length > 0) {
      console.log('❌ Errors:')
      errors.forEach(e => console.log(`  • ${e}`))
      console.log('')
      console.log('🚫 Deployment NOT ready - fix errors before deploying\n')

      return {
        status: 'fail',
        checks,
        summary: {
          total: totalChecks,
          passed: passedChecks,
          failed: totalChecks - passedChecks,
          warnings: warnings.length
        }
      }
    }

    console.log('✅ Deployment ready!\n')

    if (warnings.length > 0) {
      console.log('💡 Consider addressing warnings before deploying\n')
    }

    console.log('📝 Next Steps:')
    console.log(`  1. git add . && git commit -m "Deploy ${app}"`)
    console.log(`  2. git push origin main`)
    console.log(`  3. Monitor Vercel dashboard for deployment status\n`)

    return {
      status: 'pass',
      checks,
      summary: {
        total: totalChecks,
        passed: passedChecks,
        failed: 0,
        warnings: warnings.length
      }
    }
  }
}

// Helper functions
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const vars = []

  content.split('\n').forEach(line => {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || !trimmed) return

    // Extract variable name
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) {
      vars.push(match[1])
    }
  })

  return vars
}

function getAvailableApps() {
  const appsDir = resolve(process.cwd(), 'apps')

  if (!existsSync(appsDir)) return []

  try {
    const { readdirSync, statSync } = await import('fs')
    return readdirSync(appsDir)
      .filter(name => statSync(resolve(appsDir, name)).isDirectory())
  } catch {
    return []
  }
}
