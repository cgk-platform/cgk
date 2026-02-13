export const dynamic = 'force-dynamic'

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
 * GET /api/admin/products/available
 * Returns active products with variants from Shopify for the SendProductModal
 *
 * In a full implementation, this would:
 * 1. Get tenant's Shopify credentials from tenant_settings
 * 2. Use @cgk-platform/shopify package to fetch products
 * 3. Filter to only active products with available inventory
 * 4. Implement pagination for large catalogs
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
    // In production, this would fetch from Shopify:
    // const shopifyClient = await getShopifyClient(tenantSlug)
    // const products = await shopifyClient.product.list({
    //   status: 'active',
    //   limit,
    //   query: search,
    // })

    // Placeholder products for development
    const mockProducts: ShopifyProduct[] = [
      {
        id: 'gid://shopify/Product/1',
        title: 'Daily Cleanser',
        handle: 'daily-cleanser',
        description: 'Gentle daily face cleanser for all skin types',
        images: [{ url: '/placeholder-product.jpg', altText: 'Daily Cleanser' }],
        status: 'active',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/101',
            title: '4oz',
            sku: 'CLN-001-4',
            price: '18.00',
            inventoryQuantity: 50,
            availableForSale: true,
          },
          {
            id: 'gid://shopify/ProductVariant/102',
            title: '8oz',
            sku: 'CLN-001-8',
            price: '28.00',
            inventoryQuantity: 35,
            availableForSale: true,
          },
        ],
      },
      {
        id: 'gid://shopify/Product/2',
        title: 'Hydrating Moisturizer',
        handle: 'hydrating-moisturizer',
        description: 'Deep hydration for dry and combination skin',
        images: [{ url: '/placeholder-product.jpg', altText: 'Hydrating Moisturizer' }],
        status: 'active',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/201',
            title: 'Regular',
            sku: 'MOI-002',
            price: '42.00',
            inventoryQuantity: 28,
            availableForSale: true,
          },
        ],
      },
      {
        id: 'gid://shopify/Product/3',
        title: 'Eye Cream',
        handle: 'eye-cream',
        description: 'Anti-aging eye cream with peptides',
        images: [{ url: '/placeholder-product.jpg', altText: 'Eye Cream' }],
        status: 'active',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/301',
            title: '15ml',
            sku: 'EYE-003',
            price: '38.00',
            inventoryQuantity: 42,
            availableForSale: true,
          },
        ],
      },
      {
        id: 'gid://shopify/Product/4',
        title: 'Vitamin C Serum',
        handle: 'vitamin-c-serum',
        description: 'Brightening serum with 20% Vitamin C',
        images: [{ url: '/placeholder-product.jpg', altText: 'Vitamin C Serum' }],
        status: 'active',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/401',
            title: '30ml',
            sku: 'SER-004',
            price: '55.00',
            inventoryQuantity: 22,
            availableForSale: true,
          },
        ],
      },
      {
        id: 'gid://shopify/Product/5',
        title: 'SPF 50 Sunscreen',
        handle: 'spf-50-sunscreen',
        description: 'Lightweight daily sunscreen',
        images: [{ url: '/placeholder-product.jpg', altText: 'SPF 50 Sunscreen' }],
        status: 'active',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/501',
            title: '50ml',
            sku: 'SUN-005',
            price: '32.00',
            inventoryQuantity: 60,
            availableForSale: true,
          },
        ],
      },
    ]

    // Filter by search if provided
    let filteredProducts = mockProducts
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProducts = mockProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(searchLower))
      )
    }

    // Apply limit
    const products = filteredProducts.slice(0, limit)

    return NextResponse.json({ products })
  } catch (error) {
    console.error('[products/available] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
