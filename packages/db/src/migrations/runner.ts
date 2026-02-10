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
  // Set search path to target schema
  await sql`SELECT set_config('search_path', ${schema}, true)`

  // Create the tracking table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

/**
 * Get applied migrations for a schema
 */
async function getAppliedMigrations(schema: string): Promise<MigrationRecord[]> {
  await sql`SELECT set_config('search_path', ${schema}, true)`

  const result = await sql<MigrationRecord>`
    SELECT version, name, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `

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
    // Set search path
    await sql`SELECT set_config('search_path', ${schema}, true)`

    if (dryRun) {
      return {
        migration,
        success: true,
        durationMs: Date.now() - startTime,
      }
    }

    // Execute the migration SQL
    // Note: We use sql.query for raw SQL execution
    await sql.query(migration.sql)

    // Record the migration
    await sql`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (${migration.version}, ${migration.name}, NOW())
      ON CONFLICT (version) DO NOTHING
    `

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
  const appliedVersions = new Set(applied.map((m) => m.version))

  // Filter to pending migrations
  let pending = migrations.filter((m) => !appliedVersions.has(m.version))

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

  // Reset search path to public
  await sql`SELECT set_config('search_path', 'public', true)`

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
    const appliedVersions = new Set(applied.map((m) => m.version))
    const pending = migrations.filter((m) => !appliedVersions.has(m.version))

    // Reset search path
    await sql`SELECT set_config('search_path', 'public', true)`

    return { applied, pending }
  } catch {
    // Schema might not exist yet
    await sql`SELECT set_config('search_path', 'public', true)`
    return { applied: [], pending: migrations }
  }
}
