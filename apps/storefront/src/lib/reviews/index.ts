/**
 * Reviews Module
 *
 * Provides unified interface for product reviews, supporting both internal
 * database storage and Yotpo integration based on tenant configuration.
 */

import { getTenantConfig, getTenantSlug, isFeatureEnabled } from '../tenant'

import { getInternalRating, getInternalReviews } from './internal'
import type {
  GetReviewsOptions,
  PaginatedReviews,
  ProductRating,
  Review,
  ReviewProviderConfig,
} from './types'
import { getYotpoRating, getYotpoReviews } from './yotpo'

export * from './types'

/**
 * Get reviews for a product
 *
 * Automatically selects provider based on tenant configuration.
 *
 * @param productId - The product ID to get reviews for
 * @param options - Pagination and filtering options
 * @returns Paginated reviews
 */
export async function getProductReviews(
  productId: string,
  options: GetReviewsOptions = {}
): Promise<PaginatedReviews> {
  const config = await getReviewProviderConfig()
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return { reviews: [], total: 0, hasMore: false }
  }

  if (config.provider === 'yotpo' && config.yotpo) {
    return getYotpoReviews(config.yotpo, productId, options)
  }

  return getInternalReviews(tenantSlug, productId, options)
}

/**
 * Get aggregate rating for a product
 *
 * Automatically selects provider based on tenant configuration.
 *
 * @param productId - The product ID to get rating for
 * @returns Product rating or null if no reviews
 */
export async function getProductRating(productId: string): Promise<ProductRating | null> {
  const config = await getReviewProviderConfig()
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  if (config.provider === 'yotpo' && config.yotpo) {
    return getYotpoRating(config.yotpo, productId)
  }

  return getInternalRating(tenantSlug, productId)
}

/**
 * Get single review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return null
  }

  // For internal reviews, fetch from database
  // Yotpo reviews would need a different approach (not supported in widget API)
  const { withTenant, sql } = await import('@cgk/db')

  return withTenant(tenantSlug, async () => {
    const result = await sql<{
      id: string
      product_id: string
      author_name: string
      title: string
      body: string
      rating: number
      verified: boolean
      images: unknown
      created_at: string
      helpful_count: number
    }>`
      SELECT
        id,
        product_id,
        author_name,
        title,
        body,
        rating,
        verified,
        images,
        created_at,
        helpful_count
      FROM reviews
      WHERE id = ${reviewId}
        AND status = 'approved'
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) return null

    return {
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
  })
}

/**
 * Mark a review as helpful
 */
export async function markReviewHelpful(reviewId: string): Promise<void> {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return
  }

  const { withTenant, sql } = await import('@cgk/db')

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE reviews
      SET helpful_count = helpful_count + 1
      WHERE id = ${reviewId}
        AND status = 'approved'
    `
  })
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Get review provider configuration for current tenant
 */
async function getReviewProviderConfig(): Promise<ReviewProviderConfig> {
  const config = await getTenantConfig()
  const useYotpo = await isFeatureEnabled('reviews.yotpo')

  // Check for Yotpo feature flag and credentials
  if (useYotpo) {
    // Check tenant settings for Yotpo app key
    const yotpoAppKey = (config?.settings as { yotpo?: { appKey?: string } })?.yotpo?.appKey
      ?? process.env.YOTPO_APP_KEY

    if (yotpoAppKey) {
      return {
        provider: 'yotpo',
        yotpo: {
          appKey: yotpoAppKey,
        },
      }
    }
  }

  return { provider: 'internal' }
}
