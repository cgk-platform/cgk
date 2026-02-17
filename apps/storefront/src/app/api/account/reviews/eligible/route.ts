/**
 * Eligible Products for Review API
 *
 * Returns products the customer has purchased but not yet reviewed.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import type { PaginatedResult } from '@/lib/account/types'

export interface EligibleProduct {
  productId: string
  variantId: string | null
  title: string
  variantTitle: string | null
  imageUrl: string | null
  handle: string
  orderId: string
  orderNumber: string
  purchasedAt: string
}

interface EligibleProductRow {
  product_id: string
  variant_id: string | null
  title: string
  variant_title: string | null
  image_url: string | null
  handle: string
  order_id: string
  order_number: string
  purchased_at: string
}

/**
 * GET /api/account/reviews/eligible
 * Returns products eligible for review (purchased but not reviewed)
 */
export async function GET(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const offset = (page - 1) * pageSize

  // Get total count of eligible products
  // Products in delivered orders that haven't been reviewed yet
  const countResult = await withTenant(tenantSlug, async () => {
    return sql<{ count: string }>`
      SELECT COUNT(DISTINCT li.product_id) as count
      FROM order_line_items li
      JOIN orders o ON o.id = li.order_id
      WHERE o.customer_id = ${session.customerId}
        AND o.status = 'delivered'
        AND NOT EXISTS (
          SELECT 1 FROM reviews r
          WHERE r.customer_id = ${session.customerId}
            AND r.product_id = li.product_id
        )
    `
  })

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

  // Get eligible products with order info
  const productsResult = await withTenant(tenantSlug, async () => {
    return sql<EligibleProductRow>`
      SELECT DISTINCT ON (li.product_id)
        li.product_id,
        li.variant_id,
        COALESCE(p.title, li.title) as title,
        li.variant_title,
        COALESCE(p.featured_image_url, li.image_url) as image_url,
        COALESCE(p.handle, li.product_id) as handle,
        o.id as order_id,
        o.order_number,
        o.order_placed_at as purchased_at
      FROM order_line_items li
      JOIN orders o ON o.id = li.order_id
      LEFT JOIN products p ON p.id = li.product_id
      WHERE o.customer_id = ${session.customerId}
        AND o.status = 'delivered'
        AND NOT EXISTS (
          SELECT 1 FROM reviews r
          WHERE r.customer_id = ${session.customerId}
            AND r.product_id = li.product_id
        )
      ORDER BY li.product_id, o.order_placed_at DESC
      OFFSET ${offset}
      LIMIT ${pageSize}
    `
  })

  const products: EligibleProduct[] = productsResult.rows.map((row) => ({
    productId: row.product_id,
    variantId: row.variant_id,
    title: row.title,
    variantTitle: row.variant_title,
    imageUrl: row.image_url,
    handle: row.handle,
    orderId: row.order_id,
    orderNumber: row.order_number,
    purchasedAt: row.purchased_at,
  }))

  const response: PaginatedResult<EligibleProduct> = {
    items: products,
    total,
    page,
    pageSize,
    hasMore: offset + products.length < total,
  }

  return NextResponse.json(response)
}
