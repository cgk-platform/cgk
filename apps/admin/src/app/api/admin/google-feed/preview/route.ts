export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGoogleFeedSettings } from '@/lib/google-feed/db'
import { generateGoogleFeed, type ShopifyProductData } from '@cgk-platform/commerce'
import type { GoogleFeedPreviewResponse } from '@/lib/google-feed/types'

/**
 * GET /api/admin/google-feed/preview
 *
 * Preview the feed content before publishing
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') as 'xml' | 'json' | 'table') || 'table'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
  const productId = searchParams.get('productId') || undefined

  const result = await withTenant(tenantSlug, async (): Promise<GoogleFeedPreviewResponse | { error: string; status: number }> => {
    const settings = await getGoogleFeedSettings()
    if (!settings) {
      return { error: 'Google Feed not configured', status: 400 }
    }

    // Build query conditions
    const conditions: string[] = ["p.status = 'active'"]
    const values: unknown[] = []

    if (productId) {
      conditions.push(`(p.id = $1 OR p.shopify_product_id = $1 OR p.handle = $1)`)
      values.push(productId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM products p ${whereClause}`,
      values
    )
    const totalCount = Number(countResult.rows[0]?.count || 0)

    // Fetch sample products
    values.push(limit)
    const productsResult = await sql.query(
      `SELECT
        p.id,
        p.shopify_product_id as "shopifyProductId",
        p.title,
        p.description,
        p.handle,
        p.vendor,
        p.product_type as "productType",
        p.price_cents as "priceCents",
        p.compare_at_price_cents as "compareAtPriceCents",
        p.currency,
        p.featured_image_url as "featuredImageUrl",
        p.images,
        p.variants,
        p.tags,
        p.inventory_quantity as "inventoryQuantity"
      FROM products p
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT $${values.length}`,
      values
    )

    // Fetch overrides
    const overridesResult = await sql`SELECT * FROM google_feed_products`
    const overridesMap = new Map(
      overridesResult.rows.map((o) => [(o as { shopify_product_id: string }).shopify_product_id, o])
    )

    // Get storefront URL
    const storefrontUrl = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL
    if (!storefrontUrl) {
      return { error: 'STOREFRONT_URL not configured', status: 500 }
    }

    // Transform products
    interface ProductRow {
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
      images: Array<{ url: string }>
      variants: Array<{ id?: string; sku?: string; barcode?: string; weight?: number; weight_unit?: string }>
      tags: string[]
      inventoryQuantity: number | null
    }

    interface OverrideRow {
      shopify_product_id: string
      shopify_variant_id: string | null
      is_excluded: boolean
      exclude_reason: string | null
      title_override: string | null
      description_override: string | null
      gtin: string | null
      mpn: string | null
      brand_override: string | null
      google_category_id: string | null
      product_type: string | null
      condition_override: string | null
      adult: boolean
      age_group: string | null
      gender: string | null
      color: string | null
      material: string | null
      pattern: string | null
      size: string | null
      custom_label_0: string | null
      custom_label_1: string | null
      custom_label_2: string | null
      custom_label_3: string | null
      custom_label_4: string | null
      shipping_weight_grams: number | null
      shipping_length_cm: number | null
      shipping_width_cm: number | null
      shipping_height_cm: number | null
      shipping_label: string | null
      sale_price_cents: number | null
      sale_price_effective_start: string | null
      sale_price_effective_end: string | null
      additional_image_urls: string[]
      sync_status: string
      merchant_status: string | null
      merchant_issues: unknown[]
    }

    const products = (productsResult.rows as ProductRow[]).map((p) => {
      const variant = p.variants?.[0] || {}
      const shopifyData: ShopifyProductData = {
        id: p.shopifyProductId || p.id,
        title: p.title,
        description: p.description || '',
        handle: p.handle,
        vendor: p.vendor,
        productType: p.productType,
        priceCents: p.priceCents || 0,
        compareAtPriceCents: p.compareAtPriceCents,
        currency: p.currency || 'USD',
        sku: variant.sku || null,
        barcode: variant.barcode || null,
        availableForSale: (p.inventoryQuantity ?? 0) > 0,
        inventoryQuantity: p.inventoryQuantity,
        imageUrl: p.featuredImageUrl,
        additionalImages: p.images?.map((i) => i.url) || [],
        weight: variant.weight || null,
        weightUnit: variant.weight_unit || null,
        tags: p.tags || [],
      }

      const override = overridesMap.get(p.shopifyProductId || p.id) as OverrideRow | undefined

      return {
        shopify: shopifyData,
        overrides: override
          ? {
              id: '',
              shopifyProductId: override.shopify_product_id,
              shopifyVariantId: override.shopify_variant_id,
              isExcluded: override.is_excluded,
              excludeReason: override.exclude_reason,
              titleOverride: override.title_override,
              descriptionOverride: override.description_override,
              gtin: override.gtin,
              mpn: override.mpn,
              brandOverride: override.brand_override,
              googleCategoryId: override.google_category_id,
              productType: override.product_type,
              conditionOverride: override.condition_override as 'new' | 'refurbished' | 'used' | null,
              adult: override.adult,
              ageGroup: override.age_group as 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult' | null,
              gender: override.gender as 'male' | 'female' | 'unisex' | null,
              color: override.color,
              material: override.material,
              pattern: override.pattern,
              size: override.size,
              customLabel0: override.custom_label_0,
              customLabel1: override.custom_label_1,
              customLabel2: override.custom_label_2,
              customLabel3: override.custom_label_3,
              customLabel4: override.custom_label_4,
              shippingWeightGrams: override.shipping_weight_grams,
              shippingLengthCm: override.shipping_length_cm,
              shippingWidthCm: override.shipping_width_cm,
              shippingHeightCm: override.shipping_height_cm,
              shippingLabel: override.shipping_label,
              salePriceCents: override.sale_price_cents,
              salePriceEffectiveStart: override.sale_price_effective_start,
              salePriceEffectiveEnd: override.sale_price_effective_end,
              additionalImageUrls: override.additional_image_urls || [],
              syncStatus: override.sync_status as 'pending' | 'synced' | 'error' | 'excluded',
              lastSyncAt: null,
              merchantStatus: override.merchant_status as 'pending' | 'approved' | 'disapproved' | 'warning' | null,
              merchantIssues: override.merchant_issues as Array<{ severity: 'critical' | 'error' | 'warning' | 'info'; description: string }>,
              merchantLastCheckedAt: null,
              createdAt: '',
              updatedAt: '',
            }
          : null,
      }
    })

    // Generate feed
    const feed = generateGoogleFeed({
      settings,
      products,
      storefrontUrl,
    })

    return {
      format,
      products: feed.products,
      totalCount,
      sampleSize: feed.products.length,
      lastPublished: settings.lastSyncAt,
      changes: undefined, // Would compare with last published if available
    }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
