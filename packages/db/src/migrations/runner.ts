/**
 * Migration runner
 *
 * Executes SQL migrations with version tracking.
 * Uses a schema_migrations table to track which migrations have been applied.
 */

import { sql } from '../client.js'
import { loadPublicMigrations, loadTenantMigrations } from './loader.js'
import type { Migration, MigrationOptions, MigrationRecord, MigrationResult } from './types.js'

/** Regex for validating tenant slugs: alphanumeric + underscore only */
const TENANT_SLUG_REGEX = /^[a-z0-9_]+$/

/**
 * Validate tenant slug format
 */
function validateTenantSlug(slug: string): void {
  if (!TENANT_SLUG_REGEX.test(slug)) {
    throw new Error(
      `Invalid tenant slug "${slug}". Must be lowercase alphanumeric with underscores only.`
    )
  }
}

/**
 * Ensure the schema_migrations table exists in a schema
 */
async function ensureMigrationTable(schema: string): Promise<void> {
  // Create the tracking table if it doesn't exist
  // IMPORTANT: With Neon's connection pooler, search_path must be in the same query
  // NOTE: We track by name (UNIQUE) because multiple migrations can share version numbers
  await sql.query(`
    SET search_path TO ${schema};
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER NOT NULL,
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

/**
 * Get applied migrations for a schema
 */
async function getAppliedMigrations(schema: string): Promise<MigrationRecord[]> {
  // Use raw query with schema-qualified table name
  // This avoids search_path issues with Neon's connection pooler
  const result = await sql.query<MigrationRecord>(
    `SELECT version, name, applied_at FROM ${schema}.schema_migrations ORDER BY version ASC`
  )

  return result.rows
}

/**
 * Apply a single migration
 */
async function applyMigration(
  migration: Migration,
  schema: string,
  dryRun: boolean
): Promise<MigrationResult> {
  const startTime = Date.now()

  try {
    if (dryRun) {
      return {
        migration,
        success: true,
        durationMs: Date.now() - startTime,
      }
    }

    // Execute the migration SQL with search_path prepended
    // IMPORTANT: With Neon's connection pooler, search_path must be in the same query
    // because each sql call may use a different connection from the pool
    const sqlWithSchema = `SET search_path TO ${schema};\n${migration.sql}`
    await sql.query(sqlWithSchema)

    // Record the migration (include SET search_path for pooler compatibility)
    // Use name as primary key since multiple migrations can share version numbers
    await sql.query(`
      SET search_path TO ${schema};
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (${migration.version}, '${migration.name}', NOW())
      ON CONFLICT (name) DO NOTHING
    `)

    return {
      migration,
      success: true,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      migration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Run migrations against a schema
 */
async function runMigrationsForSchema(
  migrations: Migration[],
  schema: string,
  options: MigrationOptions = {}
): Promise<MigrationResult[]> {
  const { dryRun = false, targetVersion, onProgress } = options
  const results: MigrationResult[] = []

  // Ensure migration table exists
  await ensureMigrationTable(schema)

  // Get already applied migrations
  const applied = await getAppliedMigrations(schema)
  const appliedNames = new Set(applied.map((m) => m.name))

  // Filter to pending migrations (by name, since multiple migrations can share version numbers)
  let pending = migrations.filter((m) => !appliedNames.has(m.name))

  // Filter to target version if specified
  if (targetVersion !== undefined) {
    pending = pending.filter((m) => m.version <= targetVersion)
  }

  // Apply each migration
  for (const migration of pending) {
    onProgress?.(migration, 'running')

    const result = await applyMigration(migration, schema, dryRun)
    results.push(result)

    if (result.success) {
      onProgress?.(migration, 'complete')
    } else {
      onProgress?.(migration, 'error')
      break // Stop on first failure
    }
  }

  // Note: No need to reset search_path since each query sets its own with Neon pooler

  return results
}

/**
 * Run public schema migrations
 *
 * These create platform-wide tables in the public schema:
 * - platform_config
 * - organizations
 * - users
 * - sessions
 * - api_keys
 * - billing
 * - magic_links
 */
export async function runPublicMigrations(
  options: MigrationOptions = {}
): Promise<MigrationResult[]> {
  const migrations = await loadPublicMigrations()
  return runMigrationsForSchema(migrations, 'public', options)
}

/**
 * Run tenant schema migrations
 *
 * These create tenant-specific tables in the tenant's schema:
 * - orders
 * - customers
 * - products
 * - creators
 * - payouts
 * - reviews
 * - blog_posts
 */
export async function runTenantMigrations(
  tenantSlug: string,
  options: MigrationOptions = {}
): Promise<MigrationResult[]> {
  validateTenantSlug(tenantSlug)
  const schemaName = `tenant_${tenantSlug}`
  const migrations = await loadTenantMigrations()
  return runMigrationsForSchema(migrations, schemaName, options)
}

/**
 * Create a new tenant schema and run all tenant migrations
 *
 * @param slug - Tenant slug (alphanumeric + underscore only)
 * @param options - Migration options
 * @returns Migration results
 */
export async function createTenantSchema(
  slug: string,
  options: MigrationOptions = {}
): Promise<MigrationResult[]> {
  validateTenantSlug(slug)
  const schemaName = `tenant_${slug}`

  // Create the schema if it doesn't exist
  // Using sql.query for DDL that can't use template parameters
  await sql.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

  // Run all tenant migrations
  return runTenantMigrations(slug, options)
}

/**
 * Check if a tenant schema exists
 */
export async function tenantSchemaExists(slug: string): Promise<boolean> {
  validateTenantSlug(slug)
  const schemaName = `tenant_${slug}`

  const result = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata
      WHERE schema_name = ${schemaName}
    ) AS exists
  `

  return result.rows[0]?.exists ?? false
}

/**
 * Get migration status for a schema
 */
export async function getMigrationStatus(
  schema: string
): Promise<{ applied: MigrationRecord[]; pending: Migration[] }> {
  const isPublic = schema === 'public'
  const migrations = isPublic ? await loadPublicMigrations() : await loadTenantMigrations()

  try {
    await ensureMigrationTable(schema)
    const applied = await getAppliedMigrations(schema)
    const appliedNames = new Set(applied.map((m) => m.name))
    const pending = migrations.filter((m) => !appliedNames.has(m.name))

    return { applied, pending }
  } catch {
    // Schema might not exist yet
    return { applied: [], pending: migrations }
  }
}
