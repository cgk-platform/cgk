#!/usr/bin/env ts-node
/**
 * Vercel Debugging Skill
 *
 * TypeScript skill for production debugging with Vercel CLI.
 * Provides commands for env var management, logs, and deployment inspection.
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

const VERCEL_SCOPE = 'cgk-linens-88e79683'
const APPS = [
  'admin',
  'storefront',
  'creator-portal',
  'contractor-portal',
  'orchestrator',
  'shopify-app',
  'command-center',
]

interface Args {
  command: string
  app?: string
  varName?: string
  varValue?: string
  since?: string
  limit?: string
}

function parseArgs(args: string[]): Args {
  const parsed: Args = {
    command: args[0] || 'help',
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--app' && args[i + 1]) {
      parsed.app = args[i + 1]
      i++
    } else if (arg === '--var-name' && args[i + 1]) {
      parsed.varName = args[i + 1]
      i++
    } else if (arg === '--var-value' && args[i + 1]) {
      parsed.varValue = args[i + 1]
      i++
    } else if (arg === '--since' && args[i + 1]) {
      parsed.since = args[i + 1]
      i++
    } else if (arg === '--limit' && args[i + 1]) {
      parsed.limit = args[i + 1]
      i++
    }
  }

  return parsed
}

function exec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' })
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as unknown as { stdout: Buffer }).stdout.toString()
    }
    throw error
  }
}

function envList(app?: string): void {
  console.log('📋 Environment Variables\n')

  if (app) {
    console.log(`App: ${app}\n`)
    const output = exec(`vercel env ls --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
    console.log(output)
  } else {
    for (const appName of APPS) {
      console.log(`\n=== ${appName} ===\n`)
      const output = exec(`vercel env ls --scope ${VERCEL_SCOPE} --cwd apps/${appName}`)
      console.log(output)
    }
  }
}

function envAdd(varName: string, varValue: string, app?: string): void {
  console.log(`📤 Adding environment variable: ${varName}\n`)

  const appsToUpdate = app ? [app] : APPS

  for (const appName of appsToUpdate) {
    console.log(`Adding to ${appName}...`)

    // Add to all environments: production, preview, development
    for (const env of ['production', 'preview', 'development']) {
      try {
        exec(
          `echo "${varValue}" | vercel env add ${varName} ${env} --scope ${VERCEL_SCOPE} --cwd apps/${appName} --yes`
        )
        console.log(`  ✓ ${env}`)
      } catch (error) {
        console.log(`  ✗ ${env} (already exists or error)`)
      }
    }
  }

  console.log('\n✅ Environment variable added to all apps')
}

function envBulkPull(): void {
  console.log('📥 Pulling all environment variables to .env.local files\n')

  for (const app of APPS) {
    console.log(`Pulling ${app}...`)

    try {
      exec(`vercel env pull apps/${app}/.env.local --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
      console.log(`  ✓ apps/${app}/.env.local`)
    } catch (error) {
      console.log(`  ✗ Failed to pull ${app}`)
    }
  }

  console.log('\n✅ All .env.local files updated')
}

function logs(app: string, since?: string, limit?: string): void {
  console.log(`📜 Production Logs: ${app}\n`)

  const sinceFlag = since ? `--since ${since}` : '--since 1h'
  const limitFlag = limit ? `--limit ${limit}` : ''

  const output = exec(
    `vercel logs --scope ${VERCEL_SCOPE} --cwd apps/${app} ${sinceFlag} ${limitFlag}`
  )
  console.log(output)
}

function inspect(app: string): void {
  console.log(`🔍 Deployment Inspection: ${app}\n`)

  // Get latest deployment
  const deployments = exec(`vercel ls --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
  console.log('Recent Deployments:\n')
  console.log(deployments)

  console.log('\nEnvironment Variables:\n')
  const envs = exec(`vercel env ls --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
  console.log(envs)
}

function quickDebug(app: string): void {
  console.log(`🐛 Quick Debug: ${app}\n`)

  console.log('=== Environment Variables ===\n')
  const envs = exec(`vercel env ls --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
  console.log(envs)

  console.log('\n=== Recent Logs ===\n')
  const recentLogs = exec(`vercel logs --scope ${VERCEL_SCOPE} --cwd apps/${app} --since 1h`)
  console.log(recentLogs)

  console.log('\n=== Latest Deployment ===\n')
  const deployments = exec(`vercel ls --scope ${VERCEL_SCOPE} --cwd apps/${app}`)
  console.log(deployments)
}

function help(): void {
  console.log(`
🧰 Vercel Debugging Skill

Commands:
  env:list [--app APP]                 - List environment variables for all apps or specific app
  env:add VAR_NAME VAR_VALUE [--app]   - Add environment variable to all apps or specific app
  env:bulk-pull                        - Pull all .env.local files from Vercel
  logs APP [--since TIME] [--limit N]  - View production logs (default: last 1 hour)
  inspect APP                          - Inspect deployment (env vars, logs, deployments)
  quick:debug APP                      - Quick debugging workflow (env vars + logs + deployments)
  help                                 - Show this help

Examples:
  npx ts-node .claude/skills/vercel/index.ts env:list
  npx ts-node .claude/skills/vercel/index.ts env:list --app admin
  npx ts-node .claude/skills/vercel/index.ts env:add DATABASE_URL "postgres://..." --app admin
  npx ts-node .claude/skills/vercel/index.ts env:bulk-pull
  npx ts-node .claude/skills/vercel/index.ts logs admin --since 2h
  npx ts-node .claude/skills/vercel/index.ts inspect admin
  npx ts-node .claude/skills/vercel/index.ts quick:debug admin

Apps: ${APPS.join(', ')}
Team Scope: ${VERCEL_SCOPE}
  `)
}

// Main
function main() {
  const args = process.argv.slice(2)
  const parsed = parseArgs(args)

  switch (parsed.command) {
    case 'env:list':
      envList(parsed.app)
      break

    case 'env:add':
      if (!parsed.varName || !parsed.varValue) {
        console.error('Error: Missing --var-name or --var-value')
        help()
        process.exit(1)
      }
      envAdd(parsed.varName, parsed.varValue, parsed.app)
      break

    case 'env:bulk-pull':
      envBulkPull()
      break

    case 'logs':
      if (!parsed.app) {
        console.error('Error: Missing --app parameter')
        help()
        process.exit(1)
      }
      logs(parsed.app, parsed.since, parsed.limit)
      break

    case 'inspect':
      if (!parsed.app) {
        console.error('Error: Missing --app parameter')
        help()
        process.exit(1)
      }
      inspect(parsed.app)
      break

    case 'quick:debug':
      if (!parsed.app) {
        console.error('Error: Missing --app parameter')
        help()
        process.exit(1)
      }
      quickDebug(parsed.app)
      break

    case 'help':
    default:
      help()
      break
  }
}

main()
