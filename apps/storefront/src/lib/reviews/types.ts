/**
 * Review types and interfaces
 *
 * Defines types for product reviews and ratings.
 */

/**
 * Individual product review
 */
export interface Review {
  /** Unique review ID */
  id: string
  /** Product ID this review is for */
  productId: string
  /** Customer display name */
  authorName: string
  /** Review title */
  title: string
  /** Review body text */
  body: string
  /** Rating 1-5 */
  rating: number
  /** Verified purchase flag */
  verified: boolean
  /** Optional review images */
  images?: ReviewImage[]
  /** When review was submitted */
  createdAt: string
  /** Helpful votes count */
  helpfulCount: number
  /** Optional merchant response */
  response?: ReviewResponse
}

/**
 * Image attached to a review
 */
export interface ReviewImage {
  id: string
  url: string
  altText?: string
  width?: number
  height?: number
}

/**
 * Merchant response to a review
 */
export interface ReviewResponse {
  body: string
  createdAt: string
}

/**
 * Aggregate rating for a product
 */
export interface ProductRating {
  /** Product ID */
  productId: string
  /** Average rating (1-5 scale) */
  averageRating: number
  /** Total number of reviews */
  totalReviews: number
  /** Distribution by star rating */
  distribution: RatingDistribution
}

/**
 * Rating breakdown by stars
 */
export interface RatingDistribution {
  /** Count of 5-star reviews */
  five: number
  /** Count of 4-star reviews */
  four: number
  /** Count of 3-star reviews */
  three: number
  /** Count of 2-star reviews */
  two: number
  /** Count of 1-star reviews */
  one: number
}

/**
 * Options for fetching reviews
 */
export interface GetReviewsOptions {
  /** Number of reviews per page */
  limit?: number
  /** Pagination offset */
  offset?: number
  /** Sort order */
  sort?: ReviewSortOrder
  /** Filter by minimum rating */
  minRating?: number
  /** Filter verified purchases only */
  verifiedOnly?: boolean
}

/**
 * Sort order for reviews
 */
export type ReviewSortOrder = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'

/**
 * Paginated reviews response
 */
export interface PaginatedReviews {
  reviews: Review[]
  total: number
  hasMore: boolean
}

/**
 * Review provider configuration
 */
export interface ReviewProviderConfig {
  provider: 'internal' | 'yotpo'
  yotpo?: {
    appKey: string
    apiSecret?: string
  }
}
