/**
 * Shopify Gift Card Product Operations
 *
 * Handles syncing gift card products from Shopify to local database
 */
import type { CreateGiftCardProductInput, GiftCardProduct } from './types'
import { upsertGiftCardProduct } from './db/products'

/**
 * Extract numeric ID from Shopify GID
 * @example extractNumericId('gid://shopify/ProductVariant/12345') => '12345'
 */
export function extractNumericId(gid: string): string {
  const match = gid.match(/\/(\d+)$/)
  return match?.[1] || gid
}

/**
 * Shopify product data from GraphQL
 */
export interface ShopifyProductData {
  id: string // GID
  title: string
  status: string
  featuredImage?: {
    url: string
  } | null
  variants: {
    edges: Array<{
      node: {
        id: string // GID
        sku: string | null
        price: string
      }
    }>
  }
}

/**
 * Parse Shopify product data into gift card product input
 */
export function parseShopifyProduct(product: ShopifyProductData): CreateGiftCardProductInput | null {
  const firstVariant = product.variants.edges[0]?.node
  if (!firstVariant) return null

  const priceInCents = Math.round(parseFloat(firstVariant.price) * 100)

  return {
    id: product.id,
    variant_id: firstVariant.id,
    variant_id_numeric: extractNumericId(firstVariant.id),
    title: product.title,
    sku: firstVariant.sku || undefined,
    amount_cents: priceInCents,
    shopify_status: product.status.toLowerCase(),
    image_url: product.featuredImage?.url || undefined,
  }
}

/**
 * Sync a single Shopify product to local database
 * Must be called within withTenant() context
 */
export async function syncShopifyProduct(
  product: ShopifyProductData
): Promise<GiftCardProduct | null> {
  const input = parseShopifyProduct(product)
  if (!input) return null

  return upsertGiftCardProduct(input)
}

/**
 * Sync multiple Shopify products to local database
 * Must be called within withTenant() context
 */
export async function syncShopifyProducts(
  products: ShopifyProductData[]
): Promise<GiftCardProduct[]> {
  const results: GiftCardProduct[] = []

  for (const product of products) {
    const synced = await syncShopifyProduct(product)
    if (synced) {
      results.push(synced)
    }
  }

  return results
}

/**
 * GraphQL query to fetch gift card products from Shopify
 * Products should be tagged with 'gift-card' or be of product type 'Gift Card'
 */
export const GIFT_CARD_PRODUCTS_QUERY = `
  query GetGiftCardProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "product_type:gift_card OR tag:gift-card") {
      edges {
        node {
          id
          title
          status
          featuredImage {
            url
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

/**
 * Placeholder for Shopify API call
 * In production, this would use @cgk-platform/shopify client
 */
export async function fetchGiftCardProductsFromShopify(
  _shopifyClient: unknown
): Promise<ShopifyProductData[]> {
  // This is a placeholder that returns an empty array
  // Real implementation would:
  // 1. Use the Shopify GraphQL client from @cgk-platform/shopify
  // 2. Execute GIFT_CARD_PRODUCTS_QUERY
  // 3. Handle pagination
  // 4. Return array of ShopifyProductData

  // For now, return empty array - integration with @cgk-platform/shopify would be done in Phase 3B
  console.log('fetchGiftCardProductsFromShopify: Shopify integration pending')
  return []
}

/**
 * Check if a line item is a gift card product
 * @param variantId - Shopify variant ID (GID or numeric)
 * @param giftCardVariantIds - Set of known gift card variant IDs
 */
export function isGiftCardLineItem(
  variantId: string,
  giftCardVariantIds: Set<string>
): boolean {
  // Check both GID and numeric formats
  const numericId = extractNumericId(variantId)
  return giftCardVariantIds.has(variantId) || giftCardVariantIds.has(numericId)
}

/**
 * Build a set of gift card variant IDs from products
 */
export function buildGiftCardVariantIdSet(products: GiftCardProduct[]): Set<string> {
  const ids = new Set<string>()
  for (const product of products) {
    ids.add(product.variant_id)
    ids.add(product.variant_id_numeric)
  }
  return ids
}
