/**
 * Internal reviews provider
 *
 * Fetches reviews from the tenant's PostgreSQL database.
 */

import { withTenant, sql } from '@cgk/db'

import type {
  Review,
  ProductRating,
  RatingDistribution,
  GetReviewsOptions,
  PaginatedReviews,
} from './types'

/**
 * Get reviews for a product from internal database
 */
export async function getInternalReviews(
  tenantSlug: string,
  productId: string,
  options: GetReviewsOptions = {}
): Promise<PaginatedReviews> {
  const { limit = 10, offset = 0, sort = 'newest', minRating, verifiedOnly } = options

  return withTenant(tenantSlug, async () => {
    // Build the ORDER BY clause based on sort option
    const orderBy = getOrderByClause(sort)

    // Execute query with appropriate filters
    const result = await executeReviewsQuery(productId, {
      limit,
      offset,
      orderBy,
      minRating,
      verifiedOnly,
    })

    // Get total count for pagination
    const countResult = await executeCountQuery(productId, { minRating, verifiedOnly })
    const total = countResult.rows[0]?.count ?? 0

    const reviews: Review[] = result.rows.map(mapRowToReview)

    return {
      reviews,
      total: Number(total),
      hasMore: offset + reviews.length < Number(total),
    }
  })
}

/**
 * Get aggregate rating for a product from internal database
 */
export async function getInternalRating(
  tenantSlug: string,
  productId: string
): Promise<ProductRating | null> {
  return withTenant(tenantSlug, async () => {
    // Get aggregate stats
    const statsResult = await sql<{
      avg_rating: string | null
      total_reviews: string
    }>`
      SELECT
        AVG(rating)::numeric(3,2) as avg_rating,
        COUNT(*)::int as total_reviews
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
    `

    const stats = statsResult.rows[0]
    if (!stats || !stats.avg_rating || Number(stats.total_reviews) === 0) {
      return null
    }

    // Get distribution
    const distResult = await sql<{
      rating: number
      count: string
    }>`
      SELECT
        rating,
        COUNT(*)::int as count
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
      GROUP BY rating
      ORDER BY rating DESC
    `

    const distribution: RatingDistribution = {
      five: 0,
      four: 0,
      three: 0,
      two: 0,
      one: 0,
    }

    for (const row of distResult.rows) {
      const rating = row?.rating
      const count = Number(row?.count ?? 0)
      if (rating === 5) distribution.five = count
      else if (rating === 4) distribution.four = count
      else if (rating === 3) distribution.three = count
      else if (rating === 2) distribution.two = count
      else if (rating === 1) distribution.one = count
    }

    return {
      productId,
      averageRating: parseFloat(stats.avg_rating),
      totalReviews: Number(stats.total_reviews),
      distribution,
    }
  })
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function getOrderByClause(sort: GetReviewsOptions['sort']): string {
  switch (sort) {
    case 'oldest':
      return 'created_at ASC'
    case 'highest':
      return 'rating DESC, created_at DESC'
    case 'lowest':
      return 'rating ASC, created_at DESC'
    case 'helpful':
      return 'helpful_count DESC, created_at DESC'
    case 'newest':
    default:
      return 'created_at DESC'
  }
}

interface QueryOptions {
  limit: number
  offset: number
  orderBy: string
  minRating?: number
  verifiedOnly?: boolean
}

interface ReviewRow {
  id: string
  product_id: string
  author_name: string
  title: string
  body: string
  rating: number
  verified: boolean
  images: ReviewImageRow[] | null
  created_at: string
  helpful_count: number
  response_body: string | null
  response_created_at: string | null
}

interface ReviewImageRow {
  id: string
  url: string
  alt_text?: string
  width?: number
  height?: number
}

async function executeReviewsQuery(
  productId: string,
  options: QueryOptions
) {
  const { limit, offset, minRating, verifiedOnly } = options

  // Use conditional queries based on filters
  if (minRating && verifiedOnly) {
    return sql<ReviewRow>`
      SELECT
        r.id,
        r.product_id,
        r.author_name,
        r.title,
        r.body,
        r.rating,
        r.verified,
        r.images,
        r.created_at,
        r.helpful_count,
        rr.body as response_body,
        rr.created_at as response_created_at
      FROM reviews r
      LEFT JOIN review_responses rr ON rr.review_id = r.id
      WHERE r.product_id = ${productId}
        AND r.status = 'approved'
        AND r.rating >= ${minRating}
        AND r.verified = true
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  if (minRating) {
    return sql<ReviewRow>`
      SELECT
        r.id,
        r.product_id,
        r.author_name,
        r.title,
        r.body,
        r.rating,
        r.verified,
        r.images,
        r.created_at,
        r.helpful_count,
        rr.body as response_body,
        rr.created_at as response_created_at
      FROM reviews r
      LEFT JOIN review_responses rr ON rr.review_id = r.id
      WHERE r.product_id = ${productId}
        AND r.status = 'approved'
        AND r.rating >= ${minRating}
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  if (verifiedOnly) {
    return sql<ReviewRow>`
      SELECT
        r.id,
        r.product_id,
        r.author_name,
        r.title,
        r.body,
        r.rating,
        r.verified,
        r.images,
        r.created_at,
        r.helpful_count,
        rr.body as response_body,
        rr.created_at as response_created_at
      FROM reviews r
      LEFT JOIN review_responses rr ON rr.review_id = r.id
      WHERE r.product_id = ${productId}
        AND r.status = 'approved'
        AND r.verified = true
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  // Default query with no filters
  return sql<ReviewRow>`
    SELECT
      r.id,
      r.product_id,
      r.author_name,
      r.title,
      r.body,
      r.rating,
      r.verified,
      r.images,
      r.created_at,
      r.helpful_count,
      rr.body as response_body,
      rr.created_at as response_created_at
    FROM reviews r
    LEFT JOIN review_responses rr ON rr.review_id = r.id
    WHERE r.product_id = ${productId}
      AND r.status = 'approved'
    ORDER BY r.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
}

async function executeCountQuery(
  productId: string,
  options: { minRating?: number; verifiedOnly?: boolean }
) {
  const { minRating, verifiedOnly } = options

  if (minRating && verifiedOnly) {
    return sql<{ count: string }>`
      SELECT COUNT(*)::int as count
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
        AND rating >= ${minRating}
        AND verified = true
    `
  }

  if (minRating) {
    return sql<{ count: string }>`
      SELECT COUNT(*)::int as count
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
        AND rating >= ${minRating}
    `
  }

  if (verifiedOnly) {
    return sql<{ count: string }>`
      SELECT COUNT(*)::int as count
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
        AND verified = true
    `
  }

  return sql<{ count: string }>`
    SELECT COUNT(*)::int as count
    FROM reviews
    WHERE product_id = ${productId}
      AND status = 'approved'
  `
}

function mapRowToReview(row: ReviewRow): Review {
  const review: Review = {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    title: row.title,
    body: row.body,
    rating: row.rating,
    verified: row.verified,
    createdAt: row.created_at,
    helpfulCount: row.helpful_count,
  }

  // Map images if present
  if (row.images && Array.isArray(row.images)) {
    review.images = row.images.map((img: ReviewImageRow) => ({
      id: img.id,
      url: img.url,
      altText: img.alt_text,
      width: img.width,
      height: img.height,
    }))
  }

  // Map response if present
  if (row.response_body) {
    review.response = {
      body: row.response_body,
      createdAt: row.response_created_at ?? row.created_at,
    }
  }

  return review
}
