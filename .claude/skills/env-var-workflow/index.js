/**
 * Environment Variable Workflow Skill
 *
 * Interactive guide for adding environment variables to the CGK platform:
 * - Validates 2-file pattern (.env.example vs .env.local)
 * - Generates Vercel commands for all 3 environments (prod/preview/dev)
 * - Checks .env.example sync across ALL apps
 * - Validates turbo.json env declarations
 * - Detects LOCAL_* vars (don't push to Vercel)
 *
 * Usage: /env-var-workflow [--var VAR_NAME] [--value VAR_VALUE] [--apps admin,storefront]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

export default {
  name: 'env-var-workflow',
  version: '1.0.0',
  description: 'Interactive workflow for adding environment variables to CGK platform',

  async execute(args = {}) {
    const {
      var: varName = null,       // Environment variable name
      value: varValue = null,     // Variable value (optional for dry-run)
      apps: appsList = null,      // Comma-separated app names (default: all)
      check = false,              // Only check .env.example sync (no add)
      verbose = false             // Detailed output
    } = args

    console.log('🔧 CGK Environment Variable Workflow\n')

    // Determine target apps
    const allApps = getAllApps()
    const targetApps = appsList
      ? appsList.split(',').map(a => a.trim())
      : allApps

    // Validate apps exist
    const invalidApps = targetApps.filter(app => !allApps.includes(app))
    if (invalidApps.length > 0) {
      console.error(`❌ Invalid apps: ${invalidApps.join(', ')}`)
      console.log(`   Valid apps: ${allApps.join(', ')}\n`)
      return { status: 'fail', error: 'Invalid apps' }
    }

    // Mode: Check .env.example sync only
    if (check) {
      return checkEnvExampleSync(targetApps, verbose)
    }

    // Mode: Add new environment variable
    if (!varName) {
      console.log('📋 Usage Examples:\n')
      console.log('  # Add new production var (will guide through Vercel setup)')
      console.log('  /env-var-workflow --var STRIPE_SECRET_KEY --value sk_live_xxx\n')
      console.log('  # Add local-only var (skip Vercel)')
      console.log('  /env-var-workflow --var LOCAL_DEBUG_MODE --value true\n')
      console.log('  # Add to specific apps only')
      console.log('  /env-var-workflow --var MUX_TOKEN_ID --value xxx --apps admin,orchestrator\n')
      console.log('  # Check .env.example sync across all apps')
      console.log('  /env-var-workflow --check\n')
      return { status: 'help' }
    }

    return addEnvironmentVariable({
      varName,
      varValue,
      targetApps,
      verbose
    })
  }
}

// ============================================================================
// CORE WORKFLOWS
// ============================================================================

async function addEnvironmentVariable({ varName, varValue, targetApps, verbose }) {
  console.log(`📌 Adding environment variable: ${varName}\n`)

  // Step 1: Detect variable type
  const isLocal = isLocalOnlyVar(varName)
  const isShared = isSharedVar(varName)

  if (isLocal) {
    console.log(`🏠 Detected LOCAL-ONLY variable (${varName})`)
    console.log('   ✓ Will NOT be pushed to Vercel')
    console.log(`   ✓ Will be added to .env.development.local files\n`)
  } else {
    console.log(`☁️  Detected PRODUCTION variable (${varName})`)
    console.log('   ✓ Will be pushed to Vercel (production, preview, development)')
    console.log('   ✓ Will be synced to .env.local via `pnpm env:pull`')
    console.log(`   ✓ Will be documented in .env.example files\n`)
  }

  // Step 2: Validate value is provided (required for production vars)
  if (!isLocal && !varValue) {
    console.log('❌ Production variables require --value parameter\n')
    console.log(`   Example: /env-var-workflow --var ${varName} --value your-secret-here\n`)
    return { status: 'fail', error: 'Missing value for production variable' }
  }

  // Step 3: Check if variable already exists
  const existingVars = checkExistingVar(varName, targetApps)
  if (existingVars.length > 0) {
    console.log(`⚠️  Variable already exists in:\n`)
    existingVars.forEach(({ app, file }) => {
      console.log(`   - apps/${app}/${file}`)
    })
    console.log('\n   Use --force to overwrite (not yet implemented)\n')
    return { status: 'warn', error: 'Variable already exists' }
  }

  // Step 4: Generate workflow steps
  const workflow = generateWorkflow({
    varName,
    varValue,
    targetApps,
    isLocal,
    isShared
  })

  // Step 5: Display workflow
  console.log('📝 Workflow Steps:\n')
  workflow.steps.forEach((step, i) => {
    console.log(`${i + 1}. ${step.title}`)
    if (step.commands && step.commands.length > 0) {
      step.commands.forEach(cmd => {
        console.log(`   ${cmd}`)
      })
    }
    if (step.description) {
      console.log(`   ${step.description}`)
    }
    console.log('')
  })

  // Step 6: Validate .env.example sync
  console.log('🔍 Checking .env.example sync across apps...\n')
  const syncResult = checkEnvExampleSync(targetApps, verbose)

  if (syncResult.status === 'fail') {
    console.log('⚠️  Warning: .env.example files are out of sync')
    console.log('   This new variable will need to be added to ALL apps\n')
  }

  // Step 7: Check turbo.json
  console.log('🔍 Checking turbo.json env declarations...\n')
  const turboResult = checkTurboJsonEnv(varName)

  if (turboResult.needsUpdate) {
    console.log(`⚠️  Variable should be added to turbo.json build.env array`)
    console.log(`   File: turbo.json`)
    console.log(`   Add: "${varName}" to tasks.build.env array\n`)
    workflow.steps.push({
      title: 'Update turbo.json',
      description: `Add "${varName}" to tasks.build.env array in turbo.json`
    })
  }

  // Step 8: Return summary
  return {
    status: 'success',
    workflow,
    varName,
    isLocal,
    targetApps,
    syncStatus: syncResult.status,
    turboNeedsUpdate: turboResult.needsUpdate
  }
}

function checkEnvExampleSync(targetApps, verbose) {
  console.log('🔍 Validating .env.example sync across apps...\n')

  const envExampleFiles = {}
  const allVars = new Set()

  // Read all .env.example files
  targetApps.forEach(app => {
    const filePath = resolve(process.cwd(), `apps/${app}/.env.example`)

    if (!existsSync(filePath)) {
      console.log(`⚠️  Missing: apps/${app}/.env.example`)
      envExampleFiles[app] = { missing: true, vars: [] }
      return
    }

    const content = readFileSync(filePath, 'utf-8')
    const vars = extractEnvVars(content)

    envExampleFiles[app] = { missing: false, vars, content }
    vars.forEach(v => allVars.add(v))

    if (verbose) {
      console.log(`   apps/${app}/.env.example (${vars.length} vars)`)
    }
  })

  // Check for shared vars (should be in ALL apps)
  const sharedVars = ['DATABASE_URL', 'POSTGRES_URL', 'JWT_SECRET', 'SESSION_SECRET']
  const missingShared = {}

  sharedVars.forEach(sharedVar => {
    targetApps.forEach(app => {
      if (envExampleFiles[app].missing) return

      const hasVar = envExampleFiles[app].vars.includes(sharedVar)
      if (!hasVar) {
        if (!missingShared[sharedVar]) missingShared[sharedVar] = []
        missingShared[sharedVar].push(app)
      }
    })
  })

  // Report results
  if (Object.keys(missingShared).length > 0) {
    console.log('❌ Shared variables missing from some apps:\n')
    Object.entries(missingShared).forEach(([varName, apps]) => {
      console.log(`   ${varName}: missing from ${apps.join(', ')}`)
    })
    console.log('')
    return {
      status: 'fail',
      missingShared,
      envExampleFiles
    }
  }

  console.log('✅ All .env.example files are in sync\n')
  return {
    status: 'pass',
    envExampleFiles
  }
}

function checkTurboJsonEnv(varName) {
  const turboPath = resolve(process.cwd(), 'turbo.json')

  if (!existsSync(turboPath)) {
    return { needsUpdate: false, reason: 'turbo.json not found' }
  }

  const content = readFileSync(turboPath, 'utf-8')
  const turboConfig = JSON.parse(content)

  const buildEnvVars = turboConfig?.tasks?.build?.env || []
  const hasVar = buildEnvVars.includes(varName)

  // Heuristic: If var affects runtime, it should be in turbo.json
  const shouldBeInTurbo = !isLocalOnlyVar(varName) && !varName.startsWith('TEST_')

  return {
    needsUpdate: shouldBeInTurbo && !hasVar,
    currentVars: buildEnvVars,
    hasVar
  }
}

// ============================================================================
// WORKFLOW GENERATION
// ============================================================================

function generateWorkflow({ varName, varValue, targetApps, isLocal, isShared }) {
  const steps = []

  if (isLocal) {
    // LOCAL-ONLY variable workflow
    steps.push({
      title: 'Add to .env.development.local (local-only)',
      commands: targetApps.map(app =>
        `echo '${varName}=${varValue || 'your-value-here'}' >> apps/${app}/.env.development.local`
      ),
      description: 'These files are gitignored and never synced to Vercel'
    })

    steps.push({
      title: 'Document in .env.example (optional)',
      description: `Add commented placeholder to apps/<app>/.env.example:\n   # ${varName}= (local development only)`
    })
  } else {
    // PRODUCTION variable workflow
    steps.push({
      title: 'Add to Vercel (source of truth)',
      commands: generateVercelCommands(varName, varValue, targetApps),
      description: 'Adds to production, preview, and development environments'
    })

    steps.push({
      title: 'Pull to local .env.local',
      commands: ['pnpm env:pull'],
      description: 'Syncs Vercel variables to all apps/.env.local files'
    })

    steps.push({
      title: 'Document in .env.example',
      commands: targetApps.map(app =>
        `# Add to apps/${app}/.env.example with comment explaining what it's for`
      ),
      description: 'Update ALL .env.example files with clear comments'
    })

    if (isShared) {
      steps.push({
        title: 'Update ALL apps (shared variable)',
        description: `${varName} is a shared variable. Update .env.example in ALL apps:\n   ${getAllApps().join(', ')}`
      })
    }
  }

  return { steps }
}

function generateVercelCommands(varName, varValue, targetApps) {
  const commands = []

  targetApps.forEach(app => {
    // Three commands per app (production, preview, development)
    const appDir = `apps/${app}`
    const scope = '--scope cgk-linens-88e79683'

    commands.push(
      `cd ${appDir} && printf '${varValue}' | vercel env add ${varName} production ${scope}`,
      `cd ${appDir} && printf '${varValue}' | vercel env add ${varName} preview ${scope}`,
      `cd ${appDir} && printf '${varName}' | vercel env add ${varName} development ${scope}`
    )
  })

  return commands
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAllApps() {
  const appsDir = resolve(process.cwd(), 'apps')
  if (!existsSync(appsDir)) return []

  return readdirSync(appsDir)
    .filter(name => {
      const appPath = join(appsDir, name)
      return statSync(appPath).isDirectory() &&
             existsSync(join(appPath, 'package.json'))
    })
}

function isLocalOnlyVar(varName) {
  const localPrefixes = ['LOCAL_', 'DEBUG_', 'TEST_']
  return localPrefixes.some(prefix => varName.startsWith(prefix))
}

function isSharedVar(varName) {
  const sharedVars = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'VERCEL_URL',
    'NODE_ENV'
  ]
  return sharedVars.includes(varName)
}

function checkExistingVar(varName, targetApps) {
  const existing = []

  targetApps.forEach(app => {
    // Check .env.example
    const examplePath = resolve(process.cwd(), `apps/${app}/.env.example`)
    if (existsSync(examplePath)) {
      const content = readFileSync(examplePath, 'utf-8')
      if (new RegExp(`^${varName}=`, 'm').test(content)) {
        existing.push({ app, file: '.env.example' })
      }
    }

    // Check .env.local
    const localPath = resolve(process.cwd(), `apps/${app}/.env.local`)
    if (existsSync(localPath)) {
      const content = readFileSync(localPath, 'utf-8')
      if (new RegExp(`^${varName}=`, 'm').test(content)) {
        existing.push({ app, file: '.env.local' })
      }
    }

    // Check .env.development.local
    const devPath = resolve(process.cwd(), `apps/${app}/.env.development.local`)
    if (existsSync(devPath)) {
      const content = readFileSync(devPath, 'utf-8')
      if (new RegExp(`^${varName}=`, 'm').test(content)) {
        existing.push({ app, file: '.env.development.local' })
      }
    }
  })

  return existing
}

function extractEnvVars(envFileContent) {
  const vars = []
  const lines = envFileContent.split('\n')

  lines.forEach(line => {
    // Match VAR_NAME= or VAR_NAME = (ignore comments)
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) {
      vars.push(match[1])
    }
  })

  return vars
}
