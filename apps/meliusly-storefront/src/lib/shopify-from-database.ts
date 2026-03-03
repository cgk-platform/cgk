/**
 * Database-driven Shopify client creation
 *
 * Fetches Shopify credentials from database instead of environment variables.
 * Enables multi-tenant architecture where each tenant has their own Shopify store.
 *
 * Now uses @shopify/hydrogen-react with dual token source pattern.
 */

import { sql } from '@vercel/postgres'
import { createHydrogenClient } from '@cgk-platform/shopify'

/**
 * Create Shopify Storefront API client using Hydrogen React
 *
 * Uses dual token source pattern:
 * 1. Primary: Database (multi-tenant, encrypted)
 * 2. Fallback: NEXT_PUBLIC env var (debugging)
 *
 * @param tenantId - Tenant organization ID
 * @returns Configured Hydrogen React Storefront client
 */
export async function getShopifyClientForTenant(tenantId: string) {
  // Fetch shop domain from database (public schema - no tenant wrapper needed)
  // tenant-isolation-skip: public schema query
  const result = await sql`
    SELECT shop
    FROM shopify_connections
    WHERE tenant_id = ${tenantId}
    AND status = 'active'
    LIMIT 1
  `

  const shopDomain =
    (result.rows[0]?.shop as string | undefined) || 'meliusly.myshopify.com' // Fallback for meliusly

  // createHydrogenClient handles token resolution (database primary + env fallback)
  return createHydrogenClient({
    tenantId,
    shopDomain
  })
}
