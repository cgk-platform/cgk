import { sql } from '@cgk-platform/db'
import {
  getMigrationStatus,
  tenantSchemaExists,
  type Migration,
} from '@cgk-platform/db/migrations'
import chalk from 'chalk'

interface HealthCheckResult {
  category: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string
}

/**
 * Comprehensive health check for a tenant
 * Validates schema, migrations, tables, foreign keys, and more
 */
export async function tenantHealthCheck(
  tenantSlug: string,
  options: { verbose?: boolean } = {}
): Promise<void> {
  const { verbose = false } = options
  const results: HealthCheckResult[] = []

  console.log(chalk.bold(`\n🏥 Tenant Health Check: ${tenantSlug}\n`))

  // ==========================================================================
  // 1. Check if organization exists
  // ==========================================================================
  try {
    const orgResult = await sql`
      SELECT id, slug, name, status, created_at
      FROM public.organizations
      WHERE slug = ${tenantSlug}
      LIMIT 1
    `

    if (orgResult.rows.length === 0) {
      results.push({
        category: 'Organization',
        status: 'fail',
        message: `Organization '${tenantSlug}' not found in public.organizations`,
      })
      printResults(results)
      process.exit(1)
    }

    const org = orgResult.rows[0] as { id: string; name: string; status: string }
    results.push({
      category: 'Organization',
      status: 'pass',
      message: `Organization exists: ${org.name}`,
      details: verbose ? `ID: ${org.id}, Status: ${org.status}` : undefined,
    })
  } catch (error) {
    results.push({
      category: 'Organization',
      status: 'fail',
      message: `Failed to query organizations table: ${error}`,
    })
    printResults(results)
    process.exit(1)
  }

  // ==========================================================================
  // 2. Check if tenant schema exists
  // ==========================================================================
  try {
    const schemaExists = await tenantSchemaExists(tenantSlug)

    if (!schemaExists) {
      results.push({
        category: 'Schema',
        status: 'fail',
        message: `Tenant schema 'tenant_${tenantSlug}' does not exist`,
      })
      printResults(results)
      process.exit(1)
    }

    results.push({
      category: 'Schema',
      status: 'pass',
      message: `Schema 'tenant_${tenantSlug}' exists`,
    })
  } catch (error) {
    results.push({
      category: 'Schema',
      status: 'fail',
      message: `Failed to check schema existence: ${error}`,
    })
    printResults(results)
    process.exit(1)
  }

  // ==========================================================================
  // 3. Check migrations
  // ==========================================================================
  try {
    const migrationStatus = await getMigrationStatus(`tenant_${tenantSlug}`)

    const totalMigrations = migrationStatus.applied.length + migrationStatus.pending.length
    const appliedCount = migrationStatus.applied.length
    const pendingCount = migrationStatus.pending.length

    if (pendingCount > 0) {
      results.push({
        category: 'Migrations',
        status: 'warn',
        message: `${pendingCount} migrations pending (${appliedCount}/${totalMigrations} applied)`,
        details: verbose
          ? `Pending: ${migrationStatus.pending.map((m: Migration) => m.name).join(', ')}`
          : undefined,
      })
    } else {
      results.push({
        category: 'Migrations',
        status: 'pass',
        message: `All migrations applied (${appliedCount}/${totalMigrations})`,
      })
    }
  } catch (error) {
    results.push({
      category: 'Migrations',
      status: 'fail',
      message: `Failed to check migration status: ${error}`,
    })
  }

  // ==========================================================================
  // 4. Check table count
  // ==========================================================================
  try {
    const tableCountResult = await sql.query(`
      SELECT COUNT(*)::int as table_count
      FROM information_schema.tables
      WHERE table_schema = 'tenant_${tenantSlug}'
      AND table_type = 'BASE TABLE'
    `)

    const tableCount = tableCountResult.rows[0]?.table_count as number
    const expectedTableCount = 397 // Known from audit

    if (tableCount < expectedTableCount) {
      results.push({
        category: 'Tables',
        status: 'warn',
        message: `Only ${tableCount} tables found (expected ${expectedTableCount})`,
        details: `Missing ${expectedTableCount - tableCount} tables`,
      })
    } else if (tableCount > expectedTableCount) {
      results.push({
        category: 'Tables',
        status: 'warn',
        message: `${tableCount} tables found (expected ${expectedTableCount})`,
        details: `Extra ${tableCount - expectedTableCount} tables`,
      })
    } else {
      results.push({
        category: 'Tables',
        status: 'pass',
        message: `All ${tableCount} tables present`,
      })
    }
  } catch (error) {
    results.push({
      category: 'Tables',
      status: 'fail',
      message: `Failed to count tables: ${error}`,
    })
  }

  // ==========================================================================
  // 5. Check foreign key integrity
  // ==========================================================================
  try {
    const fkResult = await sql.query(`
      SELECT COUNT(*)::int as fk_count
      FROM information_schema.table_constraints
      WHERE table_schema = 'tenant_${tenantSlug}'
      AND constraint_type = 'FOREIGN KEY'
    `)

    const fkCount = fkResult.rows[0]?.fk_count as number

    results.push({
      category: 'Foreign Keys',
      status: 'pass',
      message: `${fkCount} foreign keys defined`,
    })
  } catch (error) {
    results.push({
      category: 'Foreign Keys',
      status: 'fail',
      message: `Failed to check foreign keys: ${error}`,
    })
  }

  // ==========================================================================
  // 6. Check if user-org relationship exists
  // ==========================================================================
  try {
    const orgResult = await sql`
      SELECT id FROM public.organizations WHERE slug = ${tenantSlug} LIMIT 1
    `
    const orgId = orgResult.rows[0]?.id as string

    const userOrgResult = await sql`
      SELECT COUNT(*)::int as user_count
      FROM public.user_organizations
      WHERE organization_id = ${orgId}
    `

    const userCount = userOrgResult.rows[0]?.user_count as number

    if (userCount === 0) {
      results.push({
        category: 'User Access',
        status: 'fail',
        message: 'No users assigned to organization',
        details: 'Orphaned organization - no owner or members',
      })
    } else {
      results.push({
        category: 'User Access',
        status: 'pass',
        message: `${userCount} user(s) have access`,
      })
    }
  } catch (error) {
    results.push({
      category: 'User Access',
      status: 'fail',
      message: `Failed to check user access: ${error}`,
    })
  }

  // ==========================================================================
  // 7. Sample query test (verify schema is queryable)
  // ==========================================================================
  try {
    await sql.query(`
      SET search_path TO tenant_${tenantSlug};
      SELECT 1 FROM orders LIMIT 1;
    `)

    results.push({
      category: 'Query Test',
      status: 'pass',
      message: 'Sample query successful (orders table)',
    })
  } catch (error) {
    results.push({
      category: 'Query Test',
      status: 'warn',
      message: `Sample query failed: ${error}`,
      details: 'Schema may be incomplete or orders table missing',
    })
  }

  // ==========================================================================
  // 8. Check indexes
  // ==========================================================================
  if (verbose) {
    try {
      const indexResult = await sql.query(`
        SELECT COUNT(*)::int as index_count
        FROM pg_indexes
        WHERE schemaname = 'tenant_${tenantSlug}'
      `)

      const indexCount = indexResult.rows[0]?.index_count as number

      results.push({
        category: 'Indexes',
        status: 'pass',
        message: `${indexCount} indexes created`,
      })
    } catch (error) {
      results.push({
        category: 'Indexes',
        status: 'warn',
        message: `Failed to count indexes: ${error}`,
      })
    }
  }

  // ==========================================================================
  // 9. Check triggers
  // ==========================================================================
  if (verbose) {
    try {
      const triggerResult = await sql.query(`
        SELECT COUNT(*)::int as trigger_count
        FROM information_schema.triggers
        WHERE trigger_schema = 'tenant_${tenantSlug}'
      `)

      const triggerCount = triggerResult.rows[0]?.trigger_count as number

      results.push({
        category: 'Triggers',
        status: 'pass',
        message: `${triggerCount} triggers created`,
      })
    } catch (error) {
      results.push({
        category: 'Triggers',
        status: 'warn',
        message: `Failed to count triggers: ${error}`,
      })
    }
  }

  // ==========================================================================
  // Print results
  // ==========================================================================
  printResults(results)

  // Exit with error if any check failed
  const hasFailures = results.some((r) => r.status === 'fail')
  if (hasFailures) {
    console.log(chalk.red('\n❌ Health check failed\n'))
    process.exit(1)
  } else {
    console.log(chalk.green('\n✅ Health check passed\n'))
  }
}

function printResults(results: HealthCheckResult[]): void {
  console.log('')

  for (const result of results) {
    const icon =
      result.status === 'pass' ? chalk.green('✅') : result.status === 'warn' ? chalk.yellow('⚠️') : chalk.red('❌')

    const message =
      result.status === 'pass'
        ? chalk.green(result.message)
        : result.status === 'warn'
          ? chalk.yellow(result.message)
          : chalk.red(result.message)

    console.log(`${icon} ${chalk.bold(result.category)}: ${message}`)

    if (result.details) {
      console.log(chalk.gray(`   ${result.details}`))
    }
  }
}
