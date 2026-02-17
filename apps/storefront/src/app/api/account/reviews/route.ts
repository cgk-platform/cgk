/**
 * Customer Reviews API
 *
 * Handles fetching reviews submitted by the current customer.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import type { PaginatedResult } from '@/lib/account/types'

export interface CustomerReview {
  id: string
  productId: string
  productTitle: string
  productImageUrl: string | null
  productHandle: string
  rating: number
  title: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  images: ReviewImage[]
  createdAt: string
  updatedAt: string
  helpfulCount: number
  response: {
    body: string
    createdAt: string
  } | null
}

interface ReviewImage {
  id: string
  url: string
  altText?: string
}

interface ReviewRow {
  id: string
  product_id: string
  rating: number
  title: string
  body: string
  status: string
  images: unknown[] | null
  created_at: string
  updated_at: string
  helpful_count: number
  response_body: string | null
  response_created_at: string | null
  product_title: string | null
  product_image_url: string | null
  product_handle: string | null
}

function mapReviewRow(row: ReviewRow): CustomerReview {
  const images = (row.images ?? []) as Array<{
    id: string
    url: string
    altText?: string
  }>

  return {
    id: row.id,
    productId: row.product_id,
    productTitle: row.product_title ?? 'Unknown Product',
    productImageUrl: row.product_image_url,
    productHandle: row.product_handle ?? row.product_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status as 'pending' | 'approved' | 'rejected',
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    helpfulCount: row.helpful_count,
    response: row.response_body
      ? {
          body: row.response_body,
          createdAt: row.response_created_at ?? row.updated_at,
        }
      : null,
  }
}

/**
 * GET /api/account/reviews
 * Returns paginated list of reviews submitted by the customer
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
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)))
  const status = searchParams.get('status')
  const offset = (page - 1) * pageSize

  // Get total count
  const countResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql<{ count: string }>`
        SELECT COUNT(*) as count
        FROM reviews
        WHERE customer_id = ${session.customerId}
          AND status = ${status}
      `
    }
    return sql<{ count: string }>`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE customer_id = ${session.customerId}
    `
  })

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10)

  // Get reviews with product info
  const reviewsResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql<ReviewRow>`
        SELECT
          r.id,
          r.product_id,
          r.rating,
          r.title,
          r.body,
          r.status,
          r.images,
          r.created_at,
          r.updated_at,
          r.helpful_count,
          r.response_body,
          r.response_created_at,
          p.title as product_title,
          p.featured_image_url as product_image_url,
          p.handle as product_handle
        FROM reviews r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE r.customer_id = ${session.customerId}
          AND r.status = ${status}
        ORDER BY r.created_at DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `
    }

    return sql<ReviewRow>`
      SELECT
        r.id,
        r.product_id,
        r.rating,
        r.title,
        r.body,
        r.status,
        r.images,
        r.created_at,
        r.updated_at,
        r.helpful_count,
        r.response_body,
        r.response_created_at,
        p.title as product_title,
        p.featured_image_url as product_image_url,
        p.handle as product_handle
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.customer_id = ${session.customerId}
      ORDER BY r.created_at DESC
      OFFSET ${offset}
      LIMIT ${pageSize}
    `
  })

  const reviews = reviewsResult.rows.map(mapReviewRow)

  const response: PaginatedResult<CustomerReview> = {
    items: reviews,
    total,
    page,
    pageSize,
    hasMore: offset + reviews.length < total,
  }

  return NextResponse.json(response)
}
