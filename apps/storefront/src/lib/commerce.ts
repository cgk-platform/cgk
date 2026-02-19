/**
 * Commerce Provider integration for storefront
 *
 * Provides cached access to the Commerce Provider with tenant context.
 * Product reads go to local PostgreSQL database first, with fallback to Shopify API.
 */

import { createCommerceProvider } from '@cgk-platform/commerce'
import type { CommerceProvider, ListParams, PaginatedResult, Product } from '@cgk-platform/commerce'
import { sendJob } from '@cgk-platform/jobs'
import { cache } from 'react'

import { getProductByHandleFromLocalDB, getProductsFromLocalDB, searchProductsInLocalDB } from './products-db'
import { getCommerceProviderType, getTenantConfig } from './tenant'


/**
 * Extended Commerce Provider with local DB integration
 * Products are read from local DB for speed, with Shopify fallback
 */
export interface StorefrontCommerceProvider extends CommerceProvider {
  /** Tenant slug for this provider instance */
  tenantSlug: string
}

/**
 * Get the commerce provider for the current tenant
 * Cached per request to avoid recreating clients
 */
export const getCommerceProvider = cache(async (): Promise<StorefrontCommerceProvider | null> => {
  const config = await getTenantConfig()

  if (!config) {
    return null
  }

  const providerType = await getCommerceProviderType()

  // For Shopify provider, we need Shopify config
  if (providerType === 'shopify') {
    if (!config.shopify) {
      console.error('Shopify provider requested but no Shopify config found')
      return null
    }

    const baseProvider = createCommerceProvider({
      provider: 'shopify',
      storeDomain: config.shopify.storeDomain,
      storefrontAccessToken: config.shopify.storefrontAccessToken,
    })

    // Wrap product operations to use local DB first
    return {
      ...baseProvider,
      tenantSlug: config.slug,
      products: createLocalDBProductOperations(config.slug, baseProvider),
    }
  }

  // Custom provider not yet implemented
  throw new Error('Custom commerce provider not yet implemented')
})

/**
 * Require commerce provider
 * Throws if not available
 */
export async function requireCommerceProvider(): Promise<StorefrontCommerceProvider> {
  const provider = await getCommerceProvider()

  if (!provider) {
    throw new Error('Commerce provider not available')
  }

  return provider
}

/**
 * Create product operations that read from local DB first
 */
function createLocalDBProductOperations(
  tenantSlug: string,
  fallbackProvider: CommerceProvider
) {
  return {
    /**
     * List products from local DB with pagination
     */
    async list(params?: ListParams): Promise<PaginatedResult<Product>> {
      try {
        const result = await getProductsFromLocalDB(tenantSlug, {
          first: params?.first ?? 20,
          after: params?.after,
          query: params?.query,
          sortKey: params?.sortKey,
          reverse: params?.reverse,
        })

        if (result.items.length > 0) {
          return result
        }

        // Fallback to Shopify if local DB is empty
        console.warn('Local DB empty, falling back to Shopify API')
        return fallbackProvider.products.list(params)
      } catch (error) {
        console.error('Error fetching products from local DB:', error)
        return fallbackProvider.products.list(params)
      }
    },

    /**
     * Get product by ID - try local DB first
     */
    async get(id: string): Promise<Product | null> {
      // For now, delegate to Shopify since local DB uses handles
      return fallbackProvider.products.get(id)
    },

    /**
     * Get product by handle from local DB
     */
    async getByHandle(handle: string): Promise<Product | null> {
      try {
        const product = await getProductByHandleFromLocalDB(tenantSlug, handle)

        if (product) {
          return product
        }

        // Fallback to Shopify API if not in local DB
        // This handles race conditions where product was just added
        console.warn(`Product ${handle} not in local DB, falling back to Shopify API`)
        const shopifyProduct = await fallbackProvider.products.getByHandle(handle)

        if (shopifyProduct) {
          // Trigger async sync to local DB (fire and forget)
          triggerProductSync(tenantSlug, handle).catch(console.error)
        }

        return shopifyProduct
      } catch (error) {
        console.error(`Error fetching product ${handle} from local DB:`, error)
        return fallbackProvider.products.getByHandle(handle)
      }
    },

    /**
     * Search products using local DB full-text search
     */
    async search(query: string, params?: ListParams): Promise<PaginatedResult<Product>> {
      try {
        const result = await searchProductsInLocalDB(tenantSlug, query, {
          first: params?.first ?? 20,
          after: params?.after,
        })

        if (result.items.length > 0) {
          return result
        }

        // Fallback to Shopify search if no local results
        return fallbackProvider.products.search(query, params)
      } catch (error) {
        console.error('Error searching products in local DB:', error)
        return fallbackProvider.products.search(query, params)
      }
    },
  }
}

/**
 * Trigger async product sync to local DB via background job.
 * This is fire-and-forget — dispatches product.sync event and returns immediately.
 */
async function triggerProductSync(tenantSlug: string, _handle: string): Promise<void> {
  await sendJob('product.sync', { tenantId: tenantSlug })
}
