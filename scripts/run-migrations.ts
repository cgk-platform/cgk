#!/usr/bin/env npx tsx
/**
 * Run database migrations
 * Usage: npx tsx scripts/run-migrations.ts [--tenant=slug]
 */

import { runPublicMigrations, runTenantMigrations, getMigrationStatus } from '@cgk-platform/db/migrations'

async function main() {
  const args = process.argv.slice(2)
  const tenantArg = args.find(a => a.startsWith('--tenant='))
  const tenantSlug = tenantArg?.split('=')[1]
  const showStatus = args.includes('--status')

  console.log('\n🔄 CGK Database Migration Runner\n')

  if (showStatus) {
    console.log('📋 Migration Status\n')
    const publicStatus = await getMigrationStatus('public')
    console.log(`Public schema: ${publicStatus.applied.length} applied, ${publicStatus.pending.length} pending`)
    if (publicStatus.pending.length > 0) {
      console.log('  Pending:', publicStatus.pending.map(m => m.name).join(', '))
    }
    return
  }

  // Run public migrations
  console.log('Running public schema migrations...')
  const publicResults = await runPublicMigrations()
  console.log(`✅ Public migrations complete: ${publicResults.length} applied`)

  // Run tenant migrations if specified
  if (tenantSlug) {
    console.log(`\nRunning tenant migrations for: ${tenantSlug}`)
    const tenantResults = await runTenantMigrations(tenantSlug)
    console.log(`✅ Tenant migrations complete: ${tenantResults.length} applied`)
  } else {
    console.log('\n💡 To run tenant migrations, use: --tenant=<slug>')
  }

  console.log('\n✅ Done!\n')
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
