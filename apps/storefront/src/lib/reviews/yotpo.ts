/**
 * Yotpo reviews provider
 *
 * Fetches reviews from Yotpo API when tenant has Yotpo enabled.
 */

import type {
  Review,
  ProductRating,
  RatingDistribution,
  GetReviewsOptions,
  PaginatedReviews,
} from './types'

const YOTPO_API_BASE = 'https://api.yotpo.com/v1'

interface YotpoConfig {
  appKey: string
}

interface YotpoReviewResponse {
  status: { code: number; message: string }
  response: {
    reviews: YotpoReview[]
    pagination: {
      page: number
      per_page: number
      total: number
    }
    bottomline: {
      total_review: number
      average_score: number
      star_distribution: Record<string, number>
    }
  }
}

interface YotpoReview {
  id: number
  score: number
  votes_up: number
  votes_down: number
  content: string
  title: string
  created_at: string
  verified_buyer: boolean
  source_review_id: string | null
  sentiment: number
  user: {
    display_name: string
    email?: string
    user_type: string
  }
  images_data?: Array<{
    id: number
    thumb_url: string
    original_url: string
  }>
  comment?: {
    id: number
    content: string
    created_at: string
  }
}

/**
 * Get reviews for a product from Yotpo
 */
export async function getYotpoReviews(
  config: YotpoConfig,
  productId: string,
  options: GetReviewsOptions = {}
): Promise<PaginatedReviews> {
  const { limit = 10, offset = 0, sort = 'newest', minRating, verifiedOnly } = options

  const page = Math.floor(offset / limit) + 1
  const sortParam = mapSortToYotpo(sort)

  const url = new URL(`${YOTPO_API_BASE}/widget/${config.appKey}/products/${encodeURIComponent(productId)}/reviews.json`)
  url.searchParams.set('per_page', String(limit))
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', sortParam)

  if (minRating) {
    url.searchParams.set('star', String(minRating))
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`Yotpo API error: ${response.status} ${response.statusText}`)
      return { reviews: [], total: 0, hasMore: false }
    }

    const data: YotpoReviewResponse = await response.json()

    if (data.status.code !== 200) {
      console.error(`Yotpo API error: ${data.status.message}`)
      return { reviews: [], total: 0, hasMore: false }
    }

    let reviews = data.response.reviews.map((r) => mapYotpoReview(r, productId))

    // Client-side filter for verified only (Yotpo doesn't support this in API)
    if (verifiedOnly) {
      reviews = reviews.filter((r) => r.verified)
    }

    return {
      reviews,
      total: data.response.pagination.total,
      hasMore: page * limit < data.response.pagination.total,
    }
  } catch (error) {
    console.error('Failed to fetch Yotpo reviews:', error)
    return { reviews: [], total: 0, hasMore: false }
  }
}

/**
 * Get aggregate rating for a product from Yotpo
 */
export async function getYotpoRating(
  config: YotpoConfig,
  productId: string
): Promise<ProductRating | null> {
  const url = new URL(`${YOTPO_API_BASE}/widget/${config.appKey}/products/${encodeURIComponent(productId)}/reviews.json`)
  url.searchParams.set('per_page', '1')
  url.searchParams.set('page', '1')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`Yotpo API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: YotpoReviewResponse = await response.json()

    if (data.status.code !== 200 || data.response.bottomline.total_review === 0) {
      return null
    }

    const { bottomline } = data.response

    // Yotpo star_distribution is keyed by "1", "2", "3", "4", "5"
    const distribution: RatingDistribution = {
      five: bottomline.star_distribution['5'] ?? 0,
      four: bottomline.star_distribution['4'] ?? 0,
      three: bottomline.star_distribution['3'] ?? 0,
      two: bottomline.star_distribution['2'] ?? 0,
      one: bottomline.star_distribution['1'] ?? 0,
    }

    return {
      productId,
      averageRating: bottomline.average_score,
      totalReviews: bottomline.total_review,
      distribution,
    }
  } catch (error) {
    console.error('Failed to fetch Yotpo rating:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSortToYotpo(sort: GetReviewsOptions['sort']): string {
  switch (sort) {
    case 'oldest':
      return 'date'
    case 'highest':
      return 'rating'
    case 'lowest':
      return 'rating' // Yotpo doesn't support reverse
    case 'helpful':
      return 'votes_up'
    case 'newest':
    default:
      return 'date'
  }
}

function mapYotpoReview(yotpo: YotpoReview, productId: string): Review {
  const review: Review = {
    id: `yotpo_${yotpo.id}`,
    productId,
    authorName: yotpo.user.display_name || 'Anonymous',
    title: yotpo.title || '',
    body: yotpo.content,
    rating: yotpo.score,
    verified: yotpo.verified_buyer,
    createdAt: yotpo.created_at,
    helpfulCount: yotpo.votes_up,
  }

  // Map images
  if (yotpo.images_data && yotpo.images_data.length > 0) {
    review.images = yotpo.images_data.map((img) => ({
      id: `yotpo_img_${img.id}`,
      url: img.original_url,
      altText: 'Customer review image',
    }))
  }

  // Map merchant response
  if (yotpo.comment) {
    review.response = {
      body: yotpo.comment.content,
      createdAt: yotpo.comment.created_at,
    }
  }

  return review
}
