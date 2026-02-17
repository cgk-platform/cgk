export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import {
  createAdminClient,
  getShopifyCredentials,
  isShopifyConnected,
} from '@cgk-platform/shopify'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { syncShopifyProducts, type ShopifyProductData } from '@/lib/gift-card'

/**
 * GraphQL query to fetch gift card products from Shopify
 */
const GIFT_CARD_PRODUCTS_QUERY = `
  query giftCardProducts($first: Int!) {
    products(first: $first, query: "product_type:Gift Card") {
      edges {
        node {
          id
          title
          handle
          productType
          status
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                price
              }
            }
          }
        }
      }
    }
  }
`

interface ShopifyProductNode {
  id: string
  title: string
  handle: string
  productType: string
  status: string
  variants: {
    edges: Array<{
      node: {
        id: string
        title: string
        sku: string | null
        price: string
      }
    }>
  }
}

interface GiftCardProductsResponse {
  products: {
    edges: Array<{ node: ShopifyProductNode }>
  }
}

/**
 * POST /api/admin/gift-cards/products/sync
 * Sync gift card products from Shopify
 *
 * Fetches products with product_type "Gift Card" from Shopify Admin API.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    products?: ShopifyProductData[]
  }

  try {
    body = await request.json()
  } catch {
    // Allow empty body for auto-fetch mode
    body = {}
  }

  // If products are provided directly, sync them
  if (body.products && Array.isArray(body.products) && body.products.length > 0) {
    const products = await withTenant(tenantSlug, async () => {
      return syncShopifyProducts(body.products!)
    })

    return NextResponse.json({
      synced_count: products.length,
      products,
      message: `Synced ${products.length} products from request body`,
    })
  }

  // Otherwise, fetch from Shopify
  try {
    // Check if Shopify is connected
    const connected = await isShopifyConnected(tenantSlug)
    if (!connected) {
      return NextResponse.json({
        synced_count: 0,
        products: [],
        error: 'Shopify is not connected. Please connect your Shopify store in Settings.',
      })
    }

    // Get Shopify credentials
    const credentials = await getShopifyCredentials(tenantSlug)

    // Create Admin API client
    const admin = createAdminClient({
      storeDomain: credentials.shop,
      adminAccessToken: credentials.accessToken,
      apiVersion: credentials.apiVersion,
    })

    // Fetch gift card products from Shopify
    const result = await admin.query<GiftCardProductsResponse>(GIFT_CARD_PRODUCTS_QUERY, {
      first: 50,
    })

    // Transform Shopify products to the expected ShopifyProductData format
    const shopifyProducts: ShopifyProductData[] = result.products.edges
      .filter(({ node }) => node.status === 'ACTIVE')
      .map(({ node }) => ({
        id: node.id,
        title: node.title,
        status: node.status,
        variants: {
          edges: node.variants.edges.map(({ node: variant }) => ({
            node: {
              id: variant.id,
              sku: variant.sku,
              price: variant.price,
            },
          })),
        },
      }))

    // Sync to database
    const products = await withTenant(tenantSlug, async () => {
      return syncShopifyProducts(shopifyProducts)
    })

    return NextResponse.json({
      synced_count: products.length,
      products,
      message: `Synced ${products.length} gift card products from Shopify`,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[gift-cards/products/sync] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('NOT_CONNECTED')) {
      return NextResponse.json({
        synced_count: 0,
        products: [],
        error: 'Shopify is not connected. Please connect your Shopify store in Settings.',
      })
    }

    return NextResponse.json(
      { error: 'Failed to sync gift card products from Shopify' },
      { status: 500 }
    )
  }
}
