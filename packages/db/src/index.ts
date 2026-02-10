/**
 * @cgk/db - Database client and tenant utilities
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for tenant-scoped queries
 */

// Client
export { sql } from './client'

// Tenant utilities
export { withTenant, setTenantSchema } from './tenant'

// Types
export type { QueryResult, QueryConfig } from './types'
