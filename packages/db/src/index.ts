/**
 * @cgk-platform/db - Database client and tenant utilities
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for tenant-scoped queries
 */

// Client
export { sql } from './client.js'

// Tenant utilities
export {
  getTenantSchemaName,
  isValidTenantSlug,
  resetToPublicSchema,
  setTenantSchema,
  validateTenantSlug,
  withTenant,
} from './tenant.js'

// Request utilities
export {
  getTenantFromRequest,
  requireTenant,
  tenantNotFoundResponse,
  TenantRequiredError,
  type TenantContext,
} from './request.js'

// Cache utilities
export {
  createGlobalCache,
  createTenantCache,
  type CacheEntry,
  type CacheOptions,
  type TenantCache,
} from './cache.js'

// Migration utilities are intentionally NOT exported here.
// They use Node.js fs/path modules which break in Edge Runtime (middleware).
// Import from '@cgk-platform/db/migrations' instead for migration functions.
// See: packages/db/src/migrations.ts

// Types
export type { QueryConfig, QueryResult } from './types.js'

