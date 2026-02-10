import { sql } from './client.js'

/** Regex for validating tenant slugs: alphanumeric + underscore only */
const TENANT_SLUG_REGEX = /^[a-z0-9_]+$/

/**
 * Validate tenant slug format
 * @throws Error if slug is invalid
 */
export function validateTenantSlug(slug: string): void {
  if (!TENANT_SLUG_REGEX.test(slug)) {
    throw new Error(
      `Invalid tenant slug "${slug}". Must be lowercase alphanumeric with underscores only (pattern: ${TENANT_SLUG_REGEX}).`
    )
  }
}

/**
 * Check if a string is a valid tenant slug
 */
export function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_REGEX.test(slug)
}

/**
 * Get the schema name for a tenant slug
 */
export function getTenantSchemaName(tenantSlug: string): string {
  validateTenantSlug(tenantSlug)
  return `tenant_${tenantSlug}`
}

/**
 * Execute a function within a tenant's database schema
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always wrap database operations in this
 * @ai-gotcha Schema is set via search_path, not connection switching
 *
 * @example
 * ```ts
 * const orders = await withTenant('rawdog', async () => {
 *   return sql`SELECT * FROM orders`
 * })
 * ```
 */
export async function withTenant<T>(
  tenantSlug: string,
  operation: () => Promise<T>
): Promise<T> {
  validateTenantSlug(tenantSlug)

  // Set search_path to tenant schema, then public for shared tables
  const schemaName = `tenant_${tenantSlug}`
  await sql`SELECT set_config('search_path', ${`${schemaName}, public`}, true)`

  try {
    return await operation()
  } finally {
    // Reset to public schema
    await sql`SELECT set_config('search_path', 'public', true)`
  }
}

/**
 * Set the tenant schema for subsequent queries
 *
 * @ai-pattern tenant-isolation
 * @ai-gotcha Prefer withTenant() which handles cleanup
 */
export async function setTenantSchema(tenantSlug: string): Promise<void> {
  validateTenantSlug(tenantSlug)
  const schemaName = `tenant_${tenantSlug}`
  await sql`SELECT set_config('search_path', ${`${schemaName}, public`}, true)`
}

/**
 * Reset search_path to public schema
 */
export async function resetToPublicSchema(): Promise<void> {
  await sql`SELECT set_config('search_path', 'public', true)`
}
