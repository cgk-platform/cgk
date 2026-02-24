/**
 * Product metafield utilities
 *
 * Direct Shopify Storefront API access for metafields
 * that aren't included in the standard product fragment.
 */

import { createStorefrontClient, getProductMetafields, type ShopifyMetafield } from '@cgk-platform/shopify'
import { cache } from 'react'
import { getTenantConfig } from './tenant'

/**
 * Get product metafields for a product handle
 * Cached per request
 */
export const getMetafields = cache(async (
  handle: string,
  identifiers: Array<{ namespace: string; key: string }>
): Promise<ShopifyMetafield[]> => {
  const config = await getTenantConfig()
  if (!config?.shopify) return []

  const client = createStorefrontClient({
    storeDomain: config.shopify.storeDomain,
    storefrontAccessToken: config.shopify.storefrontAccessToken,
  })

  return getProductMetafields(client, handle, identifiers)
})

/**
 * Parse badges metafield value
 * Expected format: JSON array of { text: string, color: string }
 */
export function parseBadges(metafield: ShopifyMetafield | undefined): Array<{ text: string; color: string }> {
  if (!metafield?.value) return []
  try {
    return JSON.parse(metafield.value)
  } catch {
    return []
  }
}

/**
 * Parse video metafield value
 * Expected format: URL string or JSON with url field
 */
export function parseVideoUrl(metafield: ShopifyMetafield | undefined): string | null {
  if (!metafield?.value) return null
  try {
    const parsed = JSON.parse(metafield.value)
    return typeof parsed === 'string' ? parsed : parsed.url ?? null
  } catch {
    // If it's not JSON, treat as raw URL
    return metafield.value
  }
}
