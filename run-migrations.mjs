import { runPublicMigrations, createTenantSchema, tenantSchemaExists, getMigrationStatus } from './packages/db/dist/migrations.js'

async function main() {
  console.log('Running public schema migrations...\n')
  try {
    const publicResults = await runPublicMigrations()
    console.log('Public migrations: ' + publicResults.length + ' applied\n')

    // Show any failures
    const failures = publicResults.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('Public migration failures:')
      for (const f of failures) {
        console.log('  - ' + f.migration.name + ': ' + f.error)
      }
    }
  } catch (err) {
    console.error('Public migration error:', err.message)
    console.error(err.stack)
  }

  console.log('Checking tenant schema for rawdog...\n')
  try {
    const exists = await tenantSchemaExists('rawdog')
    console.log('  Schema exists: ' + exists)

    if (!exists) {
      console.log('  Creating schema tenant_rawdog...')
    }

    console.log('\nRunning tenant migrations for rawdog...\n')
    const tenantResults = await createTenantSchema('rawdog')
    console.log('Tenant migrations: ' + tenantResults.length + ' applied\n')

    // Show any failures
    const failures = tenantResults.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('Tenant migration failures:')
      for (const f of failures) {
        console.log('  - ' + f.migration.name + ': ' + f.error)
      }
    }

    // Show status
    const status = await getMigrationStatus('tenant_rawdog')
    console.log('\nMigration status:')
    console.log('  Applied: ' + status.applied.length)
    console.log('  Pending: ' + status.pending.length)
    if (status.pending.length > 0) {
      console.log('  Pending migrations:')
      for (let i = 0; i < Math.min(5, status.pending.length); i++) {
        console.log('    - ' + status.pending[i].name)
      }
      if (status.pending.length > 5) {
        console.log('    ... and ' + (status.pending.length - 5) + ' more')
      }
    }
  } catch (err) {
    console.error('Tenant migration error:', err.message)
    console.error(err.stack)
  }
}

main().catch(console.error)
