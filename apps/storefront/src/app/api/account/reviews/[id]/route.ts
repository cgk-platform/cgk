/**
 * Review Create/Update API
 *
 * Handles creating and updating reviews for products.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import type { CustomerReview } from '../route'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface CreateReviewRequest {
  rating: number
  title: string
  body: string
  images?: Array<{
    url: string
    altText?: string
  }>
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
 * GET /api/account/reviews/[id]
 * Get a specific review (id is the product ID for checking existing review)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: productId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get existing review for this product
  const reviewResult = await withTenant(tenantSlug, async () => {
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
        AND r.product_id = ${productId}
      LIMIT 1
    `
  })

  const row = reviewResult.rows[0]
  if (!row) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  return NextResponse.json(mapReviewRow(row))
}

/**
 * POST /api/account/reviews/[id]
 * Create or update a review (id is the product ID)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: productId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: CreateReviewRequest = await request.json()
    const { rating, title, body: reviewBody, images = [] } = body

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!reviewBody || !reviewBody.trim()) {
      return NextResponse.json({ error: 'Review body is required' }, { status: 400 })
    }

    // Verify customer has purchased this product
    const purchaseCheck = await withTenant(tenantSlug, async () => {
      return sql<{ exists: boolean }>`
        SELECT EXISTS (
          SELECT 1
          FROM order_line_items li
          JOIN orders o ON o.id = li.order_id
          WHERE o.customer_id = ${session.customerId}
            AND o.status = 'delivered'
            AND li.product_id = ${productId}
        ) as exists
      `
    })

    if (!purchaseCheck.rows[0]?.exists) {
      return NextResponse.json(
        { error: 'You must purchase this product before reviewing it' },
        { status: 403 }
      )
    }

    // Check for existing review
    const existingReview = await withTenant(tenantSlug, async () => {
      return sql<{ id: string }>`
        SELECT id
        FROM reviews
        WHERE customer_id = ${session.customerId}
          AND product_id = ${productId}
        LIMIT 1
      `
    })

    const now = new Date().toISOString()
    const imagesJson = JSON.stringify(
      images.map((img, i) => ({
        id: `img_${i}`,
        url: img.url,
        altText: img.altText ?? '',
      }))
    )

    let reviewId: string

    if (existingReview.rows[0]) {
      // Update existing review
      reviewId = existingReview.rows[0].id
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE reviews
          SET
            rating = ${rating},
            title = ${title.trim()},
            body = ${reviewBody.trim()},
            images = ${imagesJson}::jsonb,
            status = 'pending',
            updated_at = ${now}
          WHERE id = ${reviewId}
        `
      })
    } else {
      // Create new review
      reviewId = crypto.randomUUID()
      const authorName = session.firstName
        ? `${session.firstName} ${session.lastName ?? ''}`.trim()
        : session.email.split('@')[0]

      await withTenant(tenantSlug, async () => {
        await sql`
          INSERT INTO reviews (
            id,
            product_id,
            customer_id,
            author_name,
            rating,
            title,
            body,
            status,
            verified,
            images,
            helpful_count,
            created_at,
            updated_at
          ) VALUES (
            ${reviewId},
            ${productId},
            ${session.customerId},
            ${authorName},
            ${rating},
            ${title.trim()},
            ${reviewBody.trim()},
            'pending',
            true,
            ${imagesJson}::jsonb,
            0,
            ${now},
            ${now}
          )
        `
      })
    }

    // Return the created/updated review
    const reviewResult = await withTenant(tenantSlug, async () => {
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
        WHERE r.id = ${reviewId}
        LIMIT 1
      `
    })

    const row = reviewResult.rows[0]
    if (!row) {
      throw new Error('Failed to fetch created review')
    }

    return NextResponse.json(mapReviewRow(row), {
      status: existingReview.rows[0] ? 200 : 201,
    })
  } catch (error) {
    console.error('Failed to save review:', error)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
