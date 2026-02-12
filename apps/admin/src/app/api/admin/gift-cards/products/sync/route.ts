export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { syncShopifyProducts, type ShopifyProductData } from '@/lib/gift-card'

/**
 * POST /api/admin/gift-cards/products/sync
 * Sync gift card products from Shopify
 *
 * In production, this would call the Shopify GraphQL API to fetch gift card products.
 * For now, it accepts an array of products to sync.
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

  const products = await withTenant(tenantSlug, async () => {
    // If products are provided, sync them directly
    if (body.products && Array.isArray(body.products)) {
      return syncShopifyProducts(body.products)
    }

    // Otherwise, this would fetch from Shopify
    // For now, return empty array with a message
    console.log('Gift card sync: No products provided, Shopify fetch not yet implemented')
    return []
  })

  return NextResponse.json({
    synced_count: products.length,
    products,
    message: body.products
      ? `Synced ${products.length} products`
      : 'Automatic Shopify sync not yet implemented. Provide products in request body.',
  })
}
