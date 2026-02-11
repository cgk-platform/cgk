export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import type {
  GoogleFeedProductListParams,
  GoogleFeedProductListResponse,
} from '@/lib/google-feed/types'

/**
 * GET /api/admin/google-feed/products
 *
 * List products with their Google Feed status
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const params: GoogleFeedProductListParams = {
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
    status: (searchParams.get('status') as 'all' | 'included' | 'excluded' | 'errors') || 'all',
    productType: searchParams.get('productType') || undefined,
    availability: searchParams.get('availability') || undefined,
    search: searchParams.get('search') || undefined,
    sort: searchParams.get('sort') || 'updated_at',
    direction: (searchParams.get('direction') as 'asc' | 'desc') || 'desc',
  }

  const result = await withTenant(tenantSlug, async (): Promise<GoogleFeedProductListResponse> => {
    const offset = (params.page! - 1) * params.limit!

    // Build query conditions
    const conditions: string[] = ["p.status = 'active'"]
    const values: unknown[] = []
    let paramIndex = 0

    // Search
    if (params.search) {
      paramIndex++
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.handle ILIKE $${paramIndex})`)
      values.push(`%${params.search}%`)
    }

    // Product type filter
    if (params.productType) {
      paramIndex++
      conditions.push(`p.product_type = $${paramIndex}`)
      values.push(params.productType)
    }

    // Status filter
    if (params.status === 'excluded') {
      conditions.push('gfp.is_excluded = true')
    } else if (params.status === 'included') {
      conditions.push('(gfp.is_excluded IS NULL OR gfp.is_excluded = false)')
    } else if (params.status === 'errors') {
      conditions.push(`gfp.merchant_status = 'disapproved' OR gfp.sync_status = 'error'`)
    }

    // Availability filter
    if (params.availability) {
      if (params.availability === 'in_stock') {
        conditions.push('COALESCE(p.inventory_quantity, 0) > 0')
      } else if (params.availability === 'out_of_stock') {
        conditions.push('COALESCE(p.inventory_quantity, 0) <= 0')
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Determine sort column
    const sortColumns: Record<string, string> = {
      title: 'p.title',
      price: 'p.price_cents',
      updated_at: 'COALESCE(gfp.updated_at, p.updated_at)',
      status: 'gfp.sync_status',
    }
    const sortCol = sortColumns[params.sort || 'updated_at'] || 'p.updated_at'
    const sortDir = params.direction === 'asc' ? 'ASC' : 'DESC'

    // Add pagination params
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(params.limit, offset)

    // Query products with feed data
    const dataQuery = `
      SELECT
        p.id,
        p.shopify_product_id as "shopifyProductId",
        p.title,
        p.handle,
        p.featured_image_url as "thumbnail",
        p.price_cents as "priceCents",
        p.currency,
        p.product_type as "productType",
        p.inventory_quantity as "inventoryQuantity",
        p.updated_at as "productUpdatedAt",
        p.variants,
        gfp.id as "feedProductId",
        gfp.is_excluded as "isExcluded",
        gfp.exclude_reason as "excludeReason",
        gfp.title_override as "titleOverride",
        gfp.description_override as "descriptionOverride",
        gfp.sync_status as "syncStatus",
        gfp.merchant_status as "merchantStatus",
        gfp.merchant_issues as "merchantIssues",
        gfp.updated_at as "feedUpdatedAt"
      FROM products p
      LEFT JOIN google_feed_products gfp ON gfp.shopify_product_id = p.shopify_product_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    const countQuery = `
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN google_feed_products gfp ON gfp.shopify_product_id = p.shopify_product_id
      ${whereClause}
    `

    const [dataResult, countResult] = await Promise.all([
      sql.query(dataQuery, values),
      sql.query(countQuery, values.slice(0, -2)),
    ])

    const total = Number(countResult.rows[0]?.count || 0)

    interface ProductRow {
      id: string
      shopifyProductId: string
      title: string
      handle: string
      thumbnail: string | null
      priceCents: number
      currency: string
      productType: string | null
      inventoryQuantity: number | null
      productUpdatedAt: string
      variants: Array<{ sku?: string }>
      feedProductId: string | null
      isExcluded: boolean | null
      excludeReason: string | null
      titleOverride: string | null
      descriptionOverride: string | null
      syncStatus: string | null
      merchantStatus: string | null
      merchantIssues: Array<{ severity: string; description: string }> | null
      feedUpdatedAt: string | null
    }

    const products = (dataResult.rows as ProductRow[]).map((row): GoogleFeedProductListResponse['products'][number] => {
      // Determine effective status
      let effectiveStatus: 'included' | 'excluded' | 'error' = 'included'
      if (row.isExcluded) {
        effectiveStatus = 'excluded'
      } else if (row.syncStatus === 'error' || row.merchantStatus === 'disapproved') {
        effectiveStatus = 'error'
      }

      // Get SKU from first variant
      const sku = row.variants?.[0]?.sku || null

      // Determine availability
      const availability = (row.inventoryQuantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock'

      return {
        id: row.feedProductId || row.id,
        shopifyProductId: row.shopifyProductId || row.id,
        shopifyVariantId: null,
        isExcluded: row.isExcluded ?? false,
        excludeReason: row.excludeReason,
        titleOverride: row.titleOverride,
        descriptionOverride: row.descriptionOverride,
        gtin: null,
        mpn: null,
        brandOverride: null,
        googleCategoryId: null,
        productType: row.productType,
        conditionOverride: null,
        adult: false,
        ageGroup: null,
        gender: null,
        color: null,
        material: null,
        pattern: null,
        size: null,
        customLabel0: null,
        customLabel1: null,
        customLabel2: null,
        customLabel3: null,
        customLabel4: null,
        shippingWeightGrams: null,
        shippingLengthCm: null,
        shippingWidthCm: null,
        shippingHeightCm: null,
        shippingLabel: null,
        salePriceCents: null,
        salePriceEffectiveStart: null,
        salePriceEffectiveEnd: null,
        additionalImageUrls: [],
        syncStatus: (row.syncStatus || 'pending') as 'pending' | 'synced' | 'error' | 'excluded',
        lastSyncAt: null,
        merchantStatus: row.merchantStatus as 'pending' | 'approved' | 'disapproved' | 'warning' | null,
        merchantIssues: (row.merchantIssues || []) as Array<{ severity: 'critical' | 'error' | 'warning' | 'info'; description: string }>,
        merchantLastCheckedAt: null,
        createdAt: row.productUpdatedAt,
        updatedAt: row.feedUpdatedAt || row.productUpdatedAt,
        // Extended fields for list view
        shopifyTitle: row.title,
        shopifyHandle: row.handle,
        shopifySku: sku,
        shopifyPrice: row.priceCents,
        shopifyAvailability: availability,
        shopifyImageUrl: row.thumbnail,
        effectiveTitle: row.titleOverride || row.title,
        effectiveDescription: row.descriptionOverride || row.title,
        effectiveStatus,
      }
    })

    return {
      products,
      pagination: {
        page: params.page!,
        limit: params.limit!,
        total,
        totalPages: Math.ceil(total / params.limit!),
      },
    }
  })

  return NextResponse.json(result)
}
