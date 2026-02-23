export const dynamic = 'force-dynamic'

import { createCommerceProvider, type Product } from '@cgk-platform/commerce'
import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Shopify product variant type for the SendProductModal
 */
interface ShopifyVariant {
  id: string
  title: string
  sku: string
  price: string
  inventoryQuantity: number
  availableForSale: boolean
}

/**
 * Shopify product type for the SendProductModal
 */
interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  images: { url: string; altText?: string }[]
  variants: ShopifyVariant[]
  status: string
}

/**
 * Transform commerce Product to ShopifyProduct format for the modal
 */
function transformProduct(product: Product): ShopifyProduct {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    images: product.images.map((img) => ({
      url: img.url,
      altText: img.altText ?? undefined,
    })),
    status: product.availableForSale ? 'active' : 'draft',
    variants: product.variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku || '',
      price: v.price.amount,
      // Inventory quantity not available from storefront API; use availability flag
      inventoryQuantity: v.availableForSale ? 1 : 0,
      availableForSale: v.availableForSale,
    })),
  }
}

/**
 * Get tenant's Shopify configuration from database
 */
async function getTenantShopifyConfig(tenantSlug: string): Promise<{
  storeDomain: string
  storefrontAccessToken: string
} | null> {
  // Read from shopify_connections (where the OAuth flow stores credentials)
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT shop, storefront_api_token_encrypted
      FROM shopify_connections
      WHERE status = 'active'
      LIMIT 1
    `
  })

  const row = result.rows[0]
  if (!row || !row.shop || !row.storefront_api_token_encrypted) {
    return null
  }

  return {
    storeDomain: row.shop as string,
    storefrontAccessToken: row.storefront_api_token_encrypted as string,
  }
}

/**
 * GET /api/admin/products/available
 * Returns active products with variants from Shopify for the SendProductModal
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    // Get tenant's Shopify configuration
    const shopifyConfig = await getTenantShopifyConfig(tenantSlug)

    if (!shopifyConfig) {
      return NextResponse.json(
        {
          products: [],
          error: 'Shopify is not configured for this tenant. Please configure Shopify credentials in Settings.',
        },
        { status: 200 }
      )
    }

    // Create commerce provider with tenant's Shopify credentials
    const commerce = createCommerceProvider({
      provider: 'shopify',
      storeDomain: shopifyConfig.storeDomain,
      storefrontAccessToken: shopifyConfig.storefrontAccessToken,
    })

    // Fetch products from Shopify via commerce provider
    const result = search
      ? await commerce.products.search(search, { first: limit })
      : await commerce.products.list({ first: limit })

    // Transform to expected format
    const products: ShopifyProduct[] = result.items.map(transformProduct)

    return NextResponse.json({ products })
  } catch (error) {
    console.error('[products/available] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
