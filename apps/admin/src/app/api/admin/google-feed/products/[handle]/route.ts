export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGoogleFeedProduct, upsertGoogleFeedProduct } from '@/lib/google-feed/db'
import type { GoogleFeedProductUpdateRequest } from '@/lib/google-feed/types'

/**
 * GET /api/admin/google-feed/products/[handle]
 *
 * Get product details with Google Feed data
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Get product from products table
    const productResult = await sql`
      SELECT
        id,
        shopify_product_id as "shopifyProductId",
        title,
        description,
        handle,
        vendor,
        product_type as "productType",
        price_cents as "priceCents",
        compare_at_price_cents as "compareAtPriceCents",
        currency,
        featured_image_url as "featuredImageUrl",
        images,
        variants,
        tags,
        inventory_quantity as "inventoryQuantity",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `

    if (productResult.rows.length === 0) {
      return { error: 'Product not found', status: 404 }
    }

    const product = productResult.rows[0] as {
      id: string
      shopifyProductId: string
      title: string
      description: string
      handle: string
      vendor: string | null
      productType: string | null
      priceCents: number
      compareAtPriceCents: number | null
      currency: string
      featuredImageUrl: string | null
      images: Array<{ url: string; alt?: string }>
      variants: Array<{ id?: string; sku?: string; barcode?: string; title?: string }>
      tags: string[]
      inventoryQuantity: number | null
      status: string
      createdAt: string
      updatedAt: string
    }

    // Get feed override data
    const feedProduct = await getGoogleFeedProduct(product.shopifyProductId || product.id)

    return {
      product: {
        ...product,
        // Computed availability
        availability: (product.inventoryQuantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
        // First variant SKU/barcode
        sku: product.variants?.[0]?.sku || null,
        barcode: product.variants?.[0]?.barcode || null,
      },
      feedData: feedProduct,
      effectiveData: {
        title: feedProduct?.titleOverride || product.title,
        description: feedProduct?.descriptionOverride || product.description,
        brand: feedProduct?.brandOverride || product.vendor,
        gtin: feedProduct?.gtin || product.variants?.[0]?.barcode,
        mpn: feedProduct?.mpn || product.variants?.[0]?.sku,
        googleCategoryId: feedProduct?.googleCategoryId,
        productType: feedProduct?.productType || product.productType,
        condition: feedProduct?.conditionOverride || 'new',
        availability: (product.inventoryQuantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
        isExcluded: feedProduct?.isExcluded || false,
      },
    }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}

/**
 * PUT /api/admin/google-feed/products/[handle]
 *
 * Update product Google Feed data
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: GoogleFeedProductUpdateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Get product to find shopify_product_id
    const productResult = await sql`
      SELECT shopify_product_id as "shopifyProductId", id
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `

    if (productResult.rows.length === 0) {
      return { error: 'Product not found', status: 404 }
    }

    const { shopifyProductId, id } = productResult.rows[0] as { shopifyProductId: string; id: string }
    const productId = shopifyProductId || id

    // Upsert feed product data
    const feedProduct = await upsertGoogleFeedProduct(productId, null, body)

    return { feedProduct }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
