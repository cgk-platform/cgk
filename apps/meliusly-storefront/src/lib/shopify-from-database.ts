/**
 * Database-driven Shopify client creation
 *
 * Fetches Shopify credentials from database instead of environment variables.
 * Enables multi-tenant architecture where each tenant has their own Shopify store.
 */

import { sql } from '@vercel/postgres'
import { createStorefrontClient, type StorefrontClient } from '@cgk-platform/shopify'
import { decryptToken } from '@cgk-platform/shopify'

export interface ShopifyInstallation {
  id: string
  shop_domain: string
  access_token: string
  storefront_access_token: string | null
  scope: string | null
  organization_id: string
  created_at: Date
  updated_at: Date
}

/**
 * Get Shopify installation for tenant
 *
 * @param tenantId - Tenant organization ID
 * @returns Shopify installation record
 * @throws Error if no installation found
 */
export async function getShopifyInstallation(tenantId: string): Promise<ShopifyInstallation> {
  // Query public schema table (not tenant-scoped - multi-tenant installations table)
  const result = await sql`
    SELECT id, shop_domain, access_token, storefront_access_token, scope, organization_id, created_at, updated_at
    FROM public.shopify_app_installations
    WHERE organization_id = ${tenantId} AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `

  if (result.rows.length === 0) {
    throw new Error(`No Shopify installation found for tenant: ${tenantId}`)
  }

  const row = result.rows[0]

  return {
    id: row.id as string,
    shop_domain: row.shop_domain as string,
    access_token: row.access_token as string,
    storefront_access_token: row.storefront_access_token as string | null,
    scope: row.scope as string | null,
    organization_id: row.organization_id as string,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

/**
 * Create Shopify Storefront API client using database credentials
 *
 * @param tenantId - Tenant organization ID
 * @returns Configured Storefront API client
 * @throws Error if installation not found or storefront token missing
 */
export async function getShopifyClientForTenant(tenantId: string): Promise<StorefrontClient> {
  const installation = await getShopifyInstallation(tenantId)

  if (!installation.storefront_access_token) {
    throw new Error(
      `No Storefront Access Token found for tenant: ${tenantId}. ` +
        'Generate one using Admin API: storefrontAccessTokenCreate mutation'
    )
  }

  // Decrypt token (stored encrypted in database)
  const storefrontToken = decryptToken(installation.storefront_access_token)

  // Create Storefront API client
  return createStorefrontClient({
    storeDomain: installation.shop_domain,
    storefrontAccessToken: storefrontToken,
    apiVersion: '2026-01',
  })
}

/**
 * Check if tenant has Shopify connected
 *
 * @param tenantId - Tenant organization ID
 * @returns True if Shopify installation exists
 */
export async function isShopifyConnected(tenantId: string): Promise<boolean> {
  try {
    await getShopifyInstallation(tenantId)
    return true
  } catch {
    return false
  }
}

/**
 * Get shop domain for tenant (lightweight lookup)
 *
 * @param tenantId - Tenant organization ID
 * @returns Shop domain (e.g., "meliusly.myshopify.com")
 */
export async function getShopDomain(tenantId: string): Promise<string | null> {
  try {
    const installation = await getShopifyInstallation(tenantId)
    return installation.shop_domain
  } catch {
    return null
  }
}
