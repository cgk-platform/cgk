/**
 * ProductReviews Component
 *
 * Displays product reviews with rating summary, filters, and pagination.
 * Supports both internal and Yotpo review sources.
 */

'use client'

import type {
  PaginatedReviews,
  ProductRating,
  Review,
  ReviewSortOrder,
} from '@/lib/reviews'
import { cn } from '@cgk-platform/ui'
import { useCallback, useState, useTransition } from 'react'

import { ReviewCard } from './ReviewCard'
import { StarRating } from './StarRating'

interface ProductReviewsProps {
  /** Product ID */
  productId: string
  /** Initial reviews data (from server) */
  initialReviews: PaginatedReviews
  /** Product rating data */
  rating: ProductRating | null
  /** Server action to fetch more reviews */
  fetchReviewsAction: (
    productId: string,
    options: { offset: number; limit: number; sort: ReviewSortOrder }
  ) => Promise<PaginatedReviews>
  /** Server action to mark review as helpful */
  markHelpfulAction?: (reviewId: string) => Promise<void>
  /** Custom class name */
  className?: string
}

export function ProductReviews({
  productId,
  initialReviews,
  rating,
  fetchReviewsAction,
  markHelpfulAction,
  className,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews.reviews)
  const [hasMore, setHasMore] = useState(initialReviews.hasMore)
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>('newest')
  const [isPending, startTransition] = useTransition()

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const result = await fetchReviewsAction(productId, {
        offset: reviews.length,
        limit: 10,
        sort: sortOrder,
      })
      setReviews((prev) => [...prev, ...result.reviews])
      setHasMore(result.hasMore)
    })
  }, [productId, reviews.length, sortOrder, fetchReviewsAction])

  const handleSortChange = useCallback(
    (newSort: ReviewSortOrder) => {
      setSortOrder(newSort)
      startTransition(async () => {
        const result = await fetchReviewsAction(productId, {
          offset: 0,
          limit: 10,
          sort: newSort,
        })
        setReviews(result.reviews)
        setHasMore(result.hasMore)
      })
    },
    [productId, fetchReviewsAction]
  )

  const handleHelpful = useCallback(
    async (reviewId: string) => {
      if (markHelpfulAction) {
        await markHelpfulAction(reviewId)
        // Optimistically update the count
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
          )
        )
      }
    },
    [markHelpfulAction]
  )

  if (!rating || rating.totalReviews === 0) {
    return (
      <section className={cn('py-8', className)} aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-xl font-bold">
          Customer Reviews
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to review this product
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={cn('py-8', className)} aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-bold">
        Customer Reviews
      </h2>

      {/* Rating Summary */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr]">
        <RatingSummary rating={rating} />

        {/* Reviews List */}
        <div className="space-y-6">
          {/* Sort Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {reviews.length} of {rating.totalReviews} reviews
            </p>
            <SortSelect value={sortOrder} onChange={handleSortChange} />
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onHelpful={handleHelpful}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isPending}
                className="rounded-lg border px-6 py-3 font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  'Load More Reviews'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Rating Summary Component
 */
interface RatingSummaryProps {
  rating: ProductRating
}

function RatingSummary({ rating }: RatingSummaryProps) {
  const distribution = [
    { stars: 5, count: rating.distribution.five },
    { stars: 4, count: rating.distribution.four },
    { stars: 3, count: rating.distribution.three },
    { stars: 2, count: rating.distribution.two },
    { stars: 1, count: rating.distribution.one },
  ]

  const maxCount = Math.max(...distribution.map((d) => d.count))

  return (
    <div className="rounded-lg border bg-card p-6">
      {/* Average Rating */}
      <div className="text-center">
        <div className="text-5xl font-bold">{rating.averageRating.toFixed(1)}</div>
        <StarRating
          rating={rating.averageRating}
          size="lg"
          className="mt-2 justify-center"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Based on {rating.totalReviews.toLocaleString()} review
          {rating.totalReviews !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Distribution */}
      <div className="mt-6 space-y-2">
        {distribution.map(({ stars, count }) => {
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
          const actualPercentage =
            rating.totalReviews > 0
              ? Math.round((count / rating.totalReviews) * 100)
              : 0

          return (
            <div key={stars} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right">{stars}</span>
              <svg
                className="h-4 w-4 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-right text-muted-foreground">
                {actualPercentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Sort Select Component
 */
interface SortSelectProps {
  value: ReviewSortOrder
  onChange: (value: ReviewSortOrder) => void
}

function SortSelect({ value, onChange }: SortSelectProps) {
  const options: Array<{ value: ReviewSortOrder; label: string }> = [
    { value: 'newest', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'highest', label: 'Highest Rated' },
    { value: 'lowest', label: 'Lowest Rated' },
    { value: 'helpful', label: 'Most Helpful' },
  ]

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="review-sort" className="text-sm text-muted-foreground">
        Sort by:
      </label>
      <select
        id="review-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as ReviewSortOrder)}
        className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ProductReviews
