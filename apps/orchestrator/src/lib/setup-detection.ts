import { sql } from '@cgk-platform/db'

/**
 * Setup Status Interface
 *
 * Tracks the configuration state of each platform component
 * for the first-run setup wizard.
 */
export interface SetupStatus {
  isConfigured: boolean
  steps: {
    database: boolean
    cache: boolean
    storage: boolean
    migrations: boolean
    admin: boolean
    config: boolean
  }
  errors: {
    database?: string
    cache?: string
    storage?: string
    migrations?: string
    admin?: string
    config?: string
  }
}

/**
 * Get the current setup status of the platform
 *
 * Checks each component to determine what's configured
 * and what still needs setup.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  const steps = {
    database: false,
    cache: false,
    storage: false,
    migrations: false,
    admin: false,
    config: false,
  }

  const errors: SetupStatus['errors'] = {}

  // Check database connection
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    try {
      await sql`SELECT 1`
      steps.database = true
    } catch (err) {
      errors.database = err instanceof Error ? err.message : 'Database connection failed'
    }
  } else {
    errors.database = 'No database URL configured'
  }

  // Check cache/KV connection
  if (process.env.KV_REST_API_URL || process.env.REDIS_URL) {
    steps.cache = true
  } else {
    errors.cache = 'No cache/KV URL configured'
  }

  // Check storage (optional - Vercel Blob)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    steps.storage = true
  }
  // No error for storage - it's optional

  // Check migrations have run
  if (steps.database) {
    try {
      const result = await sql`
        SELECT COUNT(*)::int as count FROM public.schema_migrations
      `
      const row = result.rows[0]
      steps.migrations = Boolean(row && (row.count as number) > 0)
      if (!steps.migrations) {
        errors.migrations = 'No migrations have been run'
      }
    } catch {
      errors.migrations = 'Migration tracking table not found'
    }
  }

  // Check super admin exists
  if (steps.migrations) {
    try {
      const result = await sql`
        SELECT COUNT(*)::int as count FROM public.users
        WHERE role = 'super_admin' AND status = 'active'
      `
      const row = result.rows[0]
      steps.admin = Boolean(row && (row.count as number) > 0)
      if (!steps.admin) {
        errors.admin = 'No super admin user exists'
      }
    } catch {
      errors.admin = 'Unable to check for admin user'
    }
  }

  // Check platform config
  if (steps.migrations) {
    try {
      const result = await sql`
        SELECT value FROM public.platform_config
        WHERE key = 'setup'
      `
      const row = result.rows[0]
      if (row) {
        const setup = row.value as { completed?: boolean }
        steps.config = setup?.completed === true
      }
      if (!steps.config) {
        errors.config = 'Platform setup not marked complete'
      }
    } catch {
      errors.config = 'Platform config table not accessible'
    }
  }

  // Platform is configured if all required steps are complete
  // Storage is optional, so we don't include it in the check
  const requiredSteps = [steps.database, steps.cache, steps.migrations, steps.admin, steps.config]
  const isConfigured = requiredSteps.every(Boolean)

  return {
    isConfigured,
    steps,
    errors,
  }
}

/**
 * Quick check if platform is fully configured
 *
 * Used by middleware to determine if setup redirect is needed.
 */
export async function isPlatformConfigured(): Promise<boolean> {
  try {
    const status = await getSetupStatus()
    return status.isConfigured
  } catch {
    // If we can't determine status, assume not configured
    return false
  }
}

/**
 * Check if this appears to be a fresh installation
 *
 * A fresh install has no database tables or no migrations run.
 */
export async function isFreshInstall(): Promise<boolean> {
  // No database URL = definitely fresh
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    return true
  }

  try {
    // Check if migrations table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
      ) as exists
    `
    const row = result.rows[0]
    return !(row?.exists as boolean)
  } catch {
    // Can't connect = fresh install
    return true
  }
}
