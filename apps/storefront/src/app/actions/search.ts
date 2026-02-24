/**
 * Predictive Search Server Action
 *
 * Calls the Shopify Storefront predictive search API directly
 * (bypassing the commerce abstraction layer which does not expose it).
 */

'use server'

import { createStorefrontClient, predictiveSearch } from '@cgk-platform/shopify'
import { getTenantConfig } from '@/lib/tenant'

export async function performPredictiveSearch(query: string) {
  const config = await getTenantConfig()
  if (!config?.shopify) return null

  const client = createStorefrontClient({
    storeDomain: config.shopify.storeDomain,
    storefrontAccessToken: config.shopify.storefrontAccessToken,
  })

  try {
    const results = await predictiveSearch(client, {
      query,
      types: ['PRODUCT', 'COLLECTION', 'QUERY'],
      limit: 4,
    })

    return {
      products: results.products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        image: p.images.edges[0]?.node
          ? { url: p.images.edges[0].node.url, altText: p.images.edges[0].node.altText ?? undefined }
          : undefined,
        price: p.priceRange.minVariantPrice.amount,
        compareAtPrice: p.variants.edges[0]?.node.compareAtPrice?.amount ?? undefined,
        currencyCode: p.priceRange.minVariantPrice.currencyCode,
      })),
      collections: results.collections.map((c) => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
      })),
      queries: results.queries,
    }
  } catch (error) {
    console.error('Predictive search failed:', error)
    return null
  }
}
