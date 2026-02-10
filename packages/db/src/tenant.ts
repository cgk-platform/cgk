import { sql } from './client'

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
  const schemaName = `tenant_${tenantSlug}`
  await sql`SELECT set_config('search_path', ${`${schemaName}, public`}, true)`
}
