/**
 * Tenant resolution for Meliusly Storefront
 *
 * Resolves tenant from domain/subdomain to enable multi-tenant architecture.
 * Each tenant has isolated database schema and Shopify credentials.
 */

import { sql } from '@vercel/postgres'

export interface Tenant {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
}

/**
 * Domain to tenant slug mapping
 *
 * Maps custom domains and subdomains to tenant slugs.
 * In production, this could be replaced with database lookup.
 */
const DOMAIN_TENANT_MAP: Record<string, string> = {
  'meliusly.com': 'meliusly',
  'www.meliusly.com': 'meliusly',
  'cgk-meliusly-storefront.vercel.app': 'meliusly', // Vercel deployment
  'localhost:3300': 'meliusly', // Local development
  localhost: 'meliusly', // Alternative local
}

/**
 * Resolve tenant from request domain
 *
 * @param host - Request host header (e.g., "meliusly.com", "localhost:3300")
 * @returns Tenant object from database
 * @throws Error if tenant not found or domain not mapped
 */
export async function resolveTenantFromDomain(host: string | null): Promise<Tenant> {
  if (!host) {
    throw new Error('Host header is required for tenant resolution')
  }

  // Remove port from host if present (except for localhost)
  const normalizedHost = host.includes('localhost') ? host : host.split(':')[0] || host

  // Get tenant slug from domain mapping
  const tenantSlug = DOMAIN_TENANT_MAP[normalizedHost]

  if (!tenantSlug) {
    throw new Error(`No tenant found for domain: ${normalizedHost}`)
  }

  // Fetch tenant from public.organizations table
  const result = await sql`
    SELECT id, name, slug, settings
    FROM public.organizations
    WHERE slug = ${tenantSlug}
    LIMIT 1
  `

  if (result.rows.length === 0) {
    throw new Error(`Tenant not found in database: ${tenantSlug}`)
  }

  const row = result.rows[0]

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    settings: (row.settings || {}) as Record<string, unknown>,
  }
}

/**
 * Get tenant ID from domain (lightweight version)
 *
 * @param host - Request host header
 * @returns Tenant ID or null if not found
 */
export async function getTenantIdFromDomain(host: string | null): Promise<string | null> {
  try {
    const tenant = await resolveTenantFromDomain(host)
    return tenant.id
  } catch {
    return null
  }
}
