/**
 * Request utilities for tenant context extraction
 *
 * Extracts tenant information from HTTP requests using:
 * 1. x-tenant-id header (API requests)
 * 2. Subdomain extraction (browser requests)
 */

import { sql } from './client.js'

/**
 * Tenant context extracted from request
 */
export interface TenantContext {
  /** Tenant slug (e.g., "rawdog") */
  slug: string
  /** Tenant ID (UUID) */
  id: string
  /** Tenant name */
  name: string
  /** Database schema name (e.g., "tenant_rawdog") */
  schemaName: string
}

/**
 * Error thrown when tenant context is required but not found
 */
export class TenantRequiredError extends Error {
  constructor(message = 'Tenant context required') {
    super(message)
    this.name = 'TenantRequiredError'
  }
}

/** Regex for validating tenant slugs */
const TENANT_SLUG_REGEX = /^[a-z0-9_]+$/

/**
 * Extract subdomain from hostname
 *
 * @example
 * extractSubdomain('rawdog.myplatform.com') // 'rawdog'
 * extractSubdomain('www.myplatform.com') // null
 * extractSubdomain('localhost:3000') // null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0] ?? ''

  // Skip localhost and IP addresses
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null
  }

  // Split by dots
  const parts = host.split('.')

  // Need at least 3 parts (subdomain.domain.tld)
  // Skip 'www' subdomain
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0] ?? null
  }

  return null
}

/**
 * Look up tenant by slug from the database
 */
async function lookupTenant(slug: string): Promise<TenantContext | null> {
  if (!TENANT_SLUG_REGEX.test(slug)) {
    return null
  }

  try {
    const result = await sql<{ id: string; slug: string; name: string }>`
      SELECT id, slug, name
      FROM public.organizations
      WHERE slug = ${slug}
        AND status = 'active'
      LIMIT 1
    `

    const org = result.rows[0]
    if (!org) {
      return null
    }

    return {
      slug: org.slug,
      id: org.id,
      name: org.name,
      schemaName: `tenant_${org.slug}`,
    }
  } catch {
    // Table might not exist yet during setup
    return null
  }
}

/**
 * Get tenant context from a Request object
 *
 * Extraction priority:
 * 1. x-tenant-id header (for API calls)
 * 2. x-tenant-slug header (alternative header)
 * 3. Subdomain from Host header
 *
 * Returns null if no tenant context found.
 *
 * @example
 * ```ts
 * const tenant = await getTenantFromRequest(request)
 * if (tenant) {
 *   await withTenant(tenant.slug, async () => {
 *     // ... queries run in tenant schema
 *   })
 * }
 * ```
 */
export async function getTenantFromRequest(request: Request): Promise<TenantContext | null> {
  // 1. Check x-tenant-id header (UUID format)
  const tenantIdHeader = request.headers.get('x-tenant-id')
  if (tenantIdHeader) {
    // Look up by ID
    try {
      const result = await sql<{ id: string; slug: string; name: string }>`
        SELECT id, slug, name
        FROM public.organizations
        WHERE id = ${tenantIdHeader}
          AND status = 'active'
        LIMIT 1
      `

      const org = result.rows[0]
      if (org) {
        return {
          slug: org.slug,
          id: org.id,
          name: org.name,
          schemaName: `tenant_${org.slug}`,
        }
      }
    } catch {
      // Continue to other methods
    }
  }

  // 2. Check x-tenant-slug header
  const tenantSlugHeader = request.headers.get('x-tenant-slug')
  if (tenantSlugHeader) {
    return lookupTenant(tenantSlugHeader)
  }

  // 3. Extract from subdomain
  const hostHeader = request.headers.get('host')
  if (hostHeader) {
    const subdomain = extractSubdomain(hostHeader)
    if (subdomain) {
      return lookupTenant(subdomain)
    }
  }

  return null
}

/**
 * Get tenant context, throwing if not found
 *
 * Use this in API routes where tenant context is required.
 *
 * @example
 * ```ts
 * export async function GET(request: Request) {
 *   const tenant = await requireTenant(request)
 *   // tenant is guaranteed to exist here
 * }
 * ```
 */
export async function requireTenant(request: Request): Promise<TenantContext> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    throw new TenantRequiredError()
  }

  return tenant
}

/**
 * Create a Response for tenant not found errors
 */
export function tenantNotFoundResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Tenant not found',
      message: 'Could not determine tenant from request. Provide x-tenant-id header or use subdomain.',
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
