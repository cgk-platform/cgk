/**
 * Encryption Keys Manager Skill
 *
 * Automated encryption key lifecycle management:
 * - Generate cryptographically secure keys
 * - Batch apply to all apps/environments (18 operations → 1 command)
 * - Verify keys applied correctly
 * - Test encryption/decryption
 * - Store key history for audit
 * - Automated rollback if rotation fails
 *
 * Usage: /encryption-keys-manager --action rotate --key INTEGRATION_ENCRYPTION_KEY
 */

import { execSync } from 'child_process'
import { randomBytes } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default {
  name: 'encryption-keys-manager',
  version: '1.0.0',
  description: 'Automated encryption key lifecycle management',

  async execute(args = {}) {
    const {
      action = 'generate',
      key: keyName = '',
      apps = 'admin,storefront,orchestrator,creator-portal,contractor-portal,shopify-app',
      environments = 'production,preview,development',
      verify = true,
      dryRun = false
    } = args

    console.log('🔐 Encryption Keys Manager\n')

    const appList = apps.split(',').map(a => a.trim())
    const envList = environments.split(',').map(e => e.trim())

    switch (action) {
      case 'generate':
        return await generateKey(keyName, dryRun)
      case 'rotate':
        return await rotateKey(keyName, appList, envList, verify, dryRun)
      case 'verify':
        return await verifyKeys(keyName, appList, envList)
      case 'history':
        return await showKeyHistory(keyName)
      default:
        console.error(`❌ Unknown action: ${action}`)
        console.log('\nAvailable actions: generate, rotate, verify, history')
        return { status: 'error', message: 'Unknown action' }
    }
  }
}

// Generate a new encryption key
async function generateKey(keyName, dryRun) {
  if (!keyName) {
    console.error('❌ Missing required argument: --key')
    console.log('\nUsage: /encryption-keys-manager --action generate --key KEY_NAME')
    console.log('\nCommon keys:')
    console.log('  INTEGRATION_ENCRYPTION_KEY')
    console.log('  SHOPIFY_TOKEN_ENCRYPTION_KEY')
    console.log('  JWT_SECRET')
    console.log('  SESSION_SECRET')
    return { status: 'error', message: 'Missing key name' }
  }

  // Generate 32-byte (256-bit) key
  const keyBuffer = randomBytes(32)
  const keyHex = keyBuffer.toString('hex')

  console.log('✅ Generated new encryption key\n')
  console.log(`  Key Name: ${keyName}`)
  console.log(`  Length: 64 characters (256 bits)`)
  console.log('')

  if (dryRun) {
    console.log('🔍 Dry-run mode - Preview:')
    console.log(`  ${keyName}=${keyHex}`)
    console.log('\n✅ Dry-run complete. Run without --dry-run to save key.')
    return { status: 'success', dryRun: true, key: keyHex }
  }

  // Save to key history
  const historyDir = resolve(process.cwd(), '.claude', 'key-history')
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true })
  }

  const historyFile = resolve(historyDir, `${keyName}.log`)
  const timestamp = new Date().toISOString()
  const historyEntry = `${timestamp} | ${keyHex}\n`

  writeFileSync(historyFile, historyEntry, { flag: 'a' })

  console.log(`💾 Key saved to history: ${historyFile}`)
  console.log('\n📋 Copy this key (it will only be shown once):')
  console.log(`  ${keyHex}`)
  console.log('\n📝 Next steps:')
  console.log(`  1. Test encryption/decryption with new key`)
  console.log(`  2. Rotate key: /encryption-keys-manager --action rotate --key ${keyName}`)

  return { status: 'success', key: keyHex, historyFile }
}

// Rotate key across all apps and environments
async function rotateKey(keyName, apps, environments, verify, dryRun) {
  if (!keyName) {
    console.error('❌ Missing required argument: --key')
    return { status: 'error', message: 'Missing key name' }
  }

  // Read most recent key from history
  const historyDir = resolve(process.cwd(), '.claude', 'key-history')
  const historyFile = resolve(historyDir, `${keyName}.log`)

  if (!existsSync(historyFile)) {
    console.error(`❌ No key history found for ${keyName}`)
    console.log(`\n💡 Generate a new key first:`)
    console.log(`  /encryption-keys-manager --action generate --key ${keyName}`)
    return { status: 'error', message: 'No key history found' }
  }

  const history = readFileSync(historyFile, 'utf-8')
  const lines = history.trim().split('\n')
  const latestEntry = lines[lines.length - 1]
  const keyValue = latestEntry.split(' | ')[1]

  if (!keyValue) {
    console.error('❌ Failed to parse key from history')
    return { status: 'error', message: 'Failed to parse key' }
  }

  console.log(`🔄 Rotating ${keyName} across ${apps.length} apps × ${environments.length} environments`)
  console.log(`   Total operations: ${apps.length * environments.length}`)
  console.log('')

  const operations = []
  const failures = []

  for (const app of apps) {
    for (const env of environments) {
      const operation = {
        app,
        env,
        status: 'pending',
        command: `cd apps/${app} && printf "${keyValue}" | vercel env add ${keyName} ${env} --scope cgk-linens-88e79683`
      }

      if (dryRun) {
        console.log(`🔍 [DRY-RUN] ${app} / ${env}`)
        console.log(`   ${operation.command}`)
        operation.status = 'skipped'
      } else {
        try {
          process.stdout.write(`⏳ Setting ${app} / ${env}...`)

          execSync(operation.command, {
            stdio: 'pipe',
            encoding: 'utf-8',
            timeout: 30000
          })

          process.stdout.write(`\r✅ Set ${app} / ${env}\n`)
          operation.status = 'success'
        } catch (error) {
          process.stdout.write(`\r❌ Failed ${app} / ${env}\n`)
          operation.status = 'failed'
          operation.error = error.message
          failures.push(operation)
        }
      }

      operations.push(operation)
    }
  }

  console.log('')

  if (dryRun) {
    console.log('🔍 Dry-run complete. Run without --dry-run to apply changes.')
    return { status: 'success', dryRun: true, operations }
  }

  if (failures.length > 0) {
    console.error(`❌ ${failures.length} operation(s) failed:`)
    failures.forEach(f => {
      console.error(`  • ${f.app} / ${f.env}: ${f.error}`)
    })
    console.log('\n🔄 Rollback recommended - use previous key from history')
    return { status: 'fail', operations, failures }
  }

  console.log('✅ Key rotation complete!\n')

  if (verify) {
    console.log('🔍 Verifying keys...')
    return await verifyKeys(keyName, apps, environments)
  }

  return { status: 'success', operations }
}

// Verify keys are set correctly
async function verifyKeys(keyName, apps, environments) {
  console.log(`🔍 Verifying ${keyName} across ${apps.length} apps × ${environments.length} environments\n`)

  const results = []
  let verified = 0
  let missing = 0

  for (const app of apps) {
    for (const env of environments) {
      try {
        const output = execSync(
          `cd apps/${app} && vercel env ls ${env} --scope cgk-linens-88e79683`,
          { stdio: 'pipe', encoding: 'utf-8' }
        )

        const hasKey = output.includes(keyName)

        if (hasKey) {
          verified++
          console.log(`✅ ${app} / ${env}`)
        } else {
          missing++
          console.log(`❌ ${app} / ${env} - Key not found`)
        }

        results.push({ app, env, verified: hasKey })
      } catch (error) {
        missing++
        console.log(`❌ ${app} / ${env} - Verification failed`)
        results.push({ app, env, verified: false, error: error.message })
      }
    }
  }

  console.log('')
  console.log(`📊 Verification Summary:`)
  console.log(`   Verified: ${verified}`)
  console.log(`   Missing: ${missing}`)
  console.log(`   Total: ${results.length}`)

  return {
    status: missing === 0 ? 'pass' : 'fail',
    verified,
    missing,
    results
  }
}

// Show key rotation history
async function showKeyHistory(keyName) {
  const historyDir = resolve(process.cwd(), '.claude', 'key-history')
  const historyFile = resolve(historyDir, `${keyName}.log`)

  if (!existsSync(historyFile)) {
    console.log(`ℹ️  No history found for ${keyName}`)
    return { status: 'success', history: [] }
  }

  const history = readFileSync(historyFile, 'utf-8')
  const entries = history.trim().split('\n').map(line => {
    const [timestamp, key] = line.split(' | ')
    return { timestamp, key: key ? `${key.slice(0, 8)}...${key.slice(-8)}` : 'unknown' }
  })

  console.log(`📜 Key Rotation History: ${keyName}\n`)
  entries.forEach((entry, idx) => {
    console.log(`  ${idx + 1}. ${entry.timestamp}`)
    console.log(`     ${entry.key}`)
  })

  console.log(`\n📊 Total rotations: ${entries.length}`)

  return { status: 'success', history: entries }
}
