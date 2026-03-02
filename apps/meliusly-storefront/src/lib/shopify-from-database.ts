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
  shop: string
  access_token_encrypted: string | null
  storefront_api_token_encrypted: string | null
  tenant_id: string
  status: string
  installed_at: Date
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
  // Query shopify_connections table
  const result = await sql`
    SELECT id, shop, access_token_encrypted, storefront_api_token_encrypted,
           tenant_id, status, installed_at, updated_at
    FROM public.shopify_connections
    WHERE tenant_id = ${tenantId}
    AND status = 'active'
    ORDER BY installed_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) {
    throw new Error(`No Shopify connection found for tenant: ${tenantId}`)
  }

  const row = result.rows[0]

  return {
    id: row.id as string,
    shop: row.shop as string,
    access_token_encrypted: row.access_token_encrypted as string | null,
    storefront_api_token_encrypted: row.storefront_api_token_encrypted as string | null,
    tenant_id: row.tenant_id as string,
    status: row.status as string,
    installed_at: new Date(row.installed_at as string),
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

  if (!installation.storefront_api_token_encrypted) {
    throw new Error(
      `No Storefront API Token found for tenant: ${tenantId}. ` +
        'Generate one using Admin API: storefrontAccessTokenCreate mutation'
    )
  }

  // Decrypt token (stored encrypted in database)
  const storefrontToken = decryptToken(installation.storefront_api_token_encrypted)

  // Create Storefront API client
  return createStorefrontClient({
    storeDomain: installation.shop,
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
    return installation.shop
  } catch {
    return null
  }
}
