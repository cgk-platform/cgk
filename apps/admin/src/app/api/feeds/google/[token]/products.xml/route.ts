export const dynamic = 'force-dynamic'

import { sql } from '@cgk/db'
import { NextResponse } from 'next/server'

import { generateGoogleFeed, type ShopifyProductData } from '@cgk/commerce'

/**
 * GET /api/feeds/google/[token]/products.xml
 *
 * Public feed endpoint for Google Merchant Center
 * Authenticated by unique feed token per tenant
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Invalid feed token' }, { status: 401 })
  }

  try {
    // Find tenant by feed token
    // Note: This queries across tenants, so we need to find the right schema first
    const tenantResult = await sql`
      SELECT
        o.id,
        o.slug,
        gfs.feed_name as "feedName",
        gfs.target_country as "targetCountry",
        gfs.language,
        gfs.currency,
        gfs.default_brand as "defaultBrand",
        gfs.default_availability as "defaultAvailability",
        gfs.default_condition as "defaultCondition",
        gfs.exclusion_rules as "exclusionRules",
        gfs.category_mapping as "categoryMapping",
        gfs.custom_label_rules as "customLabelRules",
        gfs.include_variants as "includeVariants",
        gfs.include_out_of_stock as "includeOutOfStock",
        gfs.minimum_price_cents as "minimumPriceCents",
        gfs.tax_settings as "taxSettings",
        gfs.shipping_overrides as "shippingOverrides"
      FROM public.organizations o
      CROSS JOIN LATERAL (
        SELECT * FROM pg_catalog.pg_tables
        WHERE schemaname = 'tenant_' || o.slug
          AND tablename = 'google_feed_settings'
        LIMIT 1
      ) schema_check
      CROSS JOIN LATERAL (
        SELECT *
        FROM tenant_${sql.unsafe('$1')}.google_feed_settings
        WHERE feed_token = ${token}
        LIMIT 1
      ) gfs
      WHERE o.is_active = true
      LIMIT 1
    `

    // Fallback: Search through known tenants
    // In production, this should use a more efficient lookup
    const orgsResult = await sql`
      SELECT slug FROM public.organizations WHERE is_active = true
    `

    let settings = null
    let tenantSlug = null

    for (const org of orgsResult.rows) {
      const slug = (org as { slug: string }).slug
      try {
        const settingsResult = await sql`
          SELECT
            id,
            merchant_id as "merchantId",
            feed_name as "feedName",
            feed_token as "feedToken",
            target_country as "targetCountry",
            language,
            currency,
            default_brand as "defaultBrand",
            default_availability as "defaultAvailability",
            default_condition as "defaultCondition",
            exclusion_rules as "exclusionRules",
            category_mapping as "categoryMapping",
            custom_label_rules as "customLabelRules",
            include_variants as "includeVariants",
            include_out_of_stock as "includeOutOfStock",
            minimum_price_cents as "minimumPriceCents",
            tax_settings as "taxSettings",
            shipping_overrides as "shippingOverrides"
          FROM tenant_${sql.unsafe(slug)}.google_feed_settings
          WHERE feed_token = ${token}
          LIMIT 1
        `

        if (settingsResult.rows.length > 0) {
          settings = settingsResult.rows[0]
          tenantSlug = slug
          break
        }
      } catch {
        // Schema doesn't exist or table not found, continue
        continue
      }
    }

    if (!settings || !tenantSlug) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
    }

    // Set schema for tenant queries
    await sql`SELECT set_config('search_path', ${`tenant_${tenantSlug}, public`}, true)`

    // Fetch products
    const productsResult = await sql`
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
        inventory_quantity as "inventoryQuantity"
      FROM products
      WHERE status = 'active'
    `

    // Fetch overrides
    const overridesResult = await sql`SELECT * FROM google_feed_products`
    const overridesMap = new Map(
      overridesResult.rows.map((o: { shopify_product_id: string }) => [o.shopify_product_id, o])
    )

    // Get storefront URL
    const storefrontUrl = process.env.STOREFRONT_URL || `https://${tenantSlug}.example.com`

    // Transform and generate feed
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
      settings: settings as Parameters<typeof generateGoogleFeed>[0]['settings'],
      products,
      storefrontUrl,
    })

    return new Response(feed.xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Feed generation error:', error)
    return NextResponse.json(
      { error: 'Feed generation failed' },
      { status: 500 }
    )
  }
}
