/**
 * @cgk/db - Database client and tenant utilities
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

// Migration utilities
export {
  createTenantSchema,
  getMigrationStatus,
  loadMigrations,
  loadPublicMigrations,
  loadTenantMigrations,
  runPublicMigrations,
  runTenantMigrations,
  tenantSchemaExists,
  type Migration,
  type MigrationOptions,
  type MigrationRecord,
  type MigrationResult,
  type SchemaType,
} from './migrations/index.js'

// Types
export type { QueryConfig, QueryResult } from './types.js'

