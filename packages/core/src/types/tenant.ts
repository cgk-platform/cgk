/**
 * Tenant-related type definitions
 */

/** Branded type for tenant IDs */
export type TenantId = string & { readonly __brand: 'TenantId' }

/** Branded type for user IDs */
export type UserId = string & { readonly __brand: 'UserId' }

/** Branded type for organization IDs */
export type OrganizationId = string & { readonly __brand: 'OrganizationId' }

/**
 * Tenant context available in all requests
 */
export interface TenantContext {
  /** The tenant's unique identifier */
  tenantId: TenantId
  /** The tenant's URL-safe slug (used in schema names) */
  tenantSlug: string
  /** The database schema name: tenant_{slug} */
  schemaName: string
}
