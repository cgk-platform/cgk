/**
 * Auto-Migration System
 *
 * Automatically runs missing migrations on existing tenants.
 * This ensures that when new migrations are added to the codebase,
 * existing tenants get updated automatically.
 */

import { sql } from '../client.js'
import { getMigrationStatus, runTenantMigrations } from './runner.js'

// Simple logger for CLI output (no dependency on @cgk-platform/logging to avoid circular deps)
const logger = {
  debug: (msg: string, ctx?: object) => console.log(`[DEBUG] ${msg}`, ctx || ''),
  info: (msg: string, ctx?: object) => console.log(`[INFO] ${msg}`, ctx || ''),
  warn: (msg: string, ctx?: object) => console.warn(`[WARN] ${msg}`, ctx || ''),
  error: (msg: string, err?: Error, ctx?: object) =>
    console.error(`[ERROR] ${msg}`, err, ctx || ''),
}

/**
 * Check if a tenant has pending migrations
 */
export async function hasPendingMigrations(tenantSlug: string): Promise<boolean> {
  try {
    const schemaName = `tenant_${tenantSlug}`
    const status = await getMigrationStatus(schemaName)
    return status.pending.length > 0
  } catch {
    return false
  }
}

/**
 * Auto-migrate a single tenant if it has pending migrations
 */
export async function autoMigrateTenant(
  tenantSlug: string,
  options: {
    dryRun?: boolean
  } = {}
): Promise<{ applied: number; errors: number }> {
  const { dryRun = false } = options

  try {
    const schemaName = `tenant_${tenantSlug}`
    const status = await getMigrationStatus(schemaName)

    if (status.pending.length === 0) {
      logger.debug('No pending migrations', { tenant: tenantSlug })
      return { applied: 0, errors: 0 }
    }

    logger.info('Running pending migrations', {
      tenant: tenantSlug,
      pending: status.pending.length,
      dryRun,
    })

    const results = await runTenantMigrations(tenantSlug, {
      dryRun,
      onProgress: (migration, state) => {
        logger.debug('Migration progress', {
          tenant: tenantSlug,
          migration: migration.name,
          state,
        })
      },
    })

    const applied = results.filter((r) => r.success).length
    const errors = results.filter((r) => !r.success).length

    logger.info('Auto-migration completed', {
      tenant: tenantSlug,
      applied,
      errors,
      dryRun,
    })

    return { applied, errors }
  } catch (error) {
    logger.error('Auto-migration failed', error instanceof Error ? error : undefined, {
      tenant: tenantSlug,
    })
    return { applied: 0, errors: 1 }
  }
}

/**
 * Auto-migrate all tenants
 *
 * Runs pending migrations on all active tenants.
 * Call this on platform startup or via a cron job.
 */
export async function autoMigrateAllTenants(
  options: {
    dryRun?: boolean
  } = {}
): Promise<{
  total: number
  succeeded: number
  failed: number
  details: Array<{ slug: string; applied: number; errors: number }>
}> {
  const { dryRun = false } = options

  logger.info('Starting auto-migration for all tenants', { dryRun })

  // Get all active organizations/tenants
  const result = await sql`
    SELECT slug
    FROM public.organizations
    WHERE status IN ('active', 'onboarding')
    ORDER BY slug ASC
  `

  const tenants = result.rows as Array<{ slug: string }>

  logger.info('Found tenants', { count: tenants.length })

  const details: Array<{ slug: string; applied: number; errors: number }> = []
  let succeeded = 0
  let failed = 0

  // Process each tenant
  for (const tenant of tenants) {
    const result = await autoMigrateTenant(tenant.slug, { dryRun })
    details.push({ slug: tenant.slug, ...result })

    if (result.errors > 0) {
      failed++
    } else if (result.applied > 0) {
      succeeded++
    }
  }

  const summary = {
    total: tenants.length,
    succeeded,
    failed,
    details,
  }

  logger.info('Auto-migration completed for all tenants', summary)

  return summary
}

/**
 * Middleware to check and run migrations before request processing
 *
 * @example
 * ```typescript
 * // In admin portal middleware
 * import { checkAndMigrate } from '@cgk-platform/db/migrations/auto-migrate'
 *
 * export async function middleware(request: Request) {
 *   const tenantSlug = getTenantSlugFromRequest(request)
 *   if (tenantSlug) {
 *     await checkAndMigrate(tenantSlug)
 *   }
 *   return next()
 * }
 * ```
 */
export async function checkAndMigrate(tenantSlug: string): Promise<void> {
  // Check if migrations are needed (quick check)
  const hasPending = await hasPendingMigrations(tenantSlug)

  if (hasPending) {
    logger.warn('Tenant has pending migrations, auto-migrating', { tenant: tenantSlug })

    // Run migrations in background (don't block request)
    autoMigrateTenant(tenantSlug).catch((error) => {
      logger.error('Background auto-migration failed', error instanceof Error ? error : undefined, {
        tenant: tenantSlug,
      })
    })
  }
}
