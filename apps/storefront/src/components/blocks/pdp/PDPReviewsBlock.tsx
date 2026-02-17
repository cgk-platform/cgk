'use client'

/**
 * PDP Reviews Block Component
 *
 * Displays product reviews with filtering, sorting, and pagination.
 * Includes ratings summary and write review functionality.
 */

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, PDPReviewsConfig, ReviewItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Star rating component
 */
function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onChange,
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive
          ? star <= (hoverRating || rating)
          : star <= rating
        const halfFilled = !interactive && star <= Math.ceil(rating) && rating % 1 !== 0

        return (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange?.(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
            disabled={!interactive}
            className={cn(
              interactive && 'cursor-pointer transition-transform hover:scale-110',
              !interactive && 'cursor-default'
            )}
          >
            <LucideIcon
              name="Star"
              className={cn(
                sizeClasses[size],
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : halfFilled
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'fill-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted))]'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Ratings summary component
 */
function RatingsSummary({
  averageRating,
  totalReviews,
  reviews,
}: {
  averageRating: number
  totalReviews: number
  reviews: ReviewItem[]
}) {
  const distribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => Math.floor(r.rating) === stars).length
      return {
        stars,
        count,
        percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
      }
    })
  }, [reviews, totalReviews])

  return (
    <div className="flex flex-col gap-8 rounded-2xl bg-[hsl(var(--portal-card))] p-8 lg:flex-row lg:items-center lg:gap-16">
      {/* Average rating */}
      <div className="text-center lg:text-left">
        <div className="text-5xl font-bold text-[hsl(var(--portal-foreground))]">
          {averageRating.toFixed(1)}
        </div>
        <div className="mt-2">
          <StarRating rating={averageRating} size="lg" />
        </div>
        <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
          Based on {totalReviews.toLocaleString()} reviews
        </p>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-2">
        {distribution.map(({ stars, count, percentage }) => (
          <div key={stars} className="flex items-center gap-4">
            <span className="w-8 text-sm font-medium text-[hsl(var(--portal-foreground))]">
              {stars}
            </span>
            <LucideIcon name="Star" className="h-4 w-4 fill-amber-400 text-amber-400" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--portal-muted))]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm text-[hsl(var(--portal-muted-foreground))]">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Individual review card
 */
function ReviewCard({
  review,
  index,
}: {
  review: ReviewItem
  index: number
}) {
  const [helpful, setHelpful] = useState(false)

  return (
    <article
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/20 hover:shadow-md',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {review.avatar ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <Image
                src={review.avatar.src}
                alt={review.author}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
                'text-sm font-bold text-white'
              )}
            >
              {review.author.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-[hsl(var(--portal-foreground))]">
              {review.author}
            </p>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
              {review.verified && (
                <span className="flex items-center gap-1 text-[hsl(var(--portal-success))]">
                  <LucideIcon name="BadgeCheck" className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
              {review.date && <span>{review.date}</span>}
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      {/* Product name */}
      {review.productName && (
        <p className="mt-3 text-sm font-medium text-[hsl(var(--portal-primary))]">
          {review.productName}
        </p>
      )}

      {/* Content */}
      <p className="mt-4 text-[hsl(var(--portal-foreground))] leading-relaxed">
        {review.content}
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4 pt-4 border-t border-[hsl(var(--portal-border))]">
        <button
          onClick={() => setHelpful(!helpful)}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            helpful
              ? 'text-[hsl(var(--portal-primary))]'
              : 'text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))]'
          )}
        >
          <LucideIcon name="ThumbsUp" className={cn('h-4 w-4', helpful && 'fill-current')} />
          Helpful
        </button>
        <button
          className="flex items-center gap-1.5 text-sm text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
        >
          <LucideIcon name="Flag" className="h-4 w-4" />
          Report
        </button>
      </div>
    </article>
  )
}

/**
 * Filter/sort dropdown
 */
function ReviewsFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-[hsl(var(--portal-muted-foreground))]">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-3 py-1.5',
          'text-sm text-[hsl(var(--portal-foreground))]',
          'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20'
        )}
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

/**
 * PDP Reviews Block Component
 */
export function PDPReviewsBlock({ block, className }: BlockProps<PDPReviewsConfig>) {
  const {
    headline,
    subheadline,
    reviews = [],
    showWriteReview = true,
    showFilters = true,
    showSortOptions = true,
    showRatingsSummary = true,
    averageRating = 0,
    totalReviews = 0,
    layout = 'list',
    initialDisplayCount = 5,
    backgroundColor,
  } = block.config

  const [sortBy, setSortBy] = useState('recent')
  const [filterRating, setFilterRating] = useState('all')
  const [displayCount, setDisplayCount] = useState(initialDisplayCount)

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews]

    // Filter by rating
    if (filterRating !== 'all') {
      const rating = parseInt(filterRating, 10)
      result = result.filter((r) => Math.floor(r.rating) === rating)
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        // Assuming newer reviews have higher IDs or we could use date
        result.sort((a, b) => b.id.localeCompare(a.id))
        break
      case 'highest':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating)
        break
    }

    return result
  }, [reviews, sortBy, filterRating])

  const displayedReviews = filteredReviews.slice(0, displayCount)
  const hasMore = displayCount < filteredReviews.length

  // Calculate average if not provided
  const calculatedAverage =
    averageRating ||
    (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0)
  const calculatedTotal = totalReviews || reviews.length

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mb-10">
            {subheadline && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Ratings Summary */}
        {showRatingsSummary && reviews.length > 0 && (
          <div className="mb-10">
            <RatingsSummary
              averageRating={calculatedAverage}
              totalReviews={calculatedTotal}
              reviews={reviews}
            />
          </div>
        )}

        {/* Filters and Actions */}
        {(showFilters || showSortOptions || showWriteReview) && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {showFilters && (
                <ReviewsFilter
                  label="Filter"
                  value={filterRating}
                  onChange={setFilterRating}
                  options={[
                    { value: 'all', label: 'All Ratings' },
                    { value: '5', label: '5 Stars' },
                    { value: '4', label: '4 Stars' },
                    { value: '3', label: '3 Stars' },
                    { value: '2', label: '2 Stars' },
                    { value: '1', label: '1 Star' },
                  ]}
                />
              )}
              {showSortOptions && (
                <ReviewsFilter
                  label="Sort by"
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'recent', label: 'Most Recent' },
                    { value: 'highest', label: 'Highest Rated' },
                    { value: 'lowest', label: 'Lowest Rated' },
                  ]}
                />
              )}
            </div>

            {showWriteReview && (
              <button
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                  'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                  'font-medium transition-all duration-200',
                  'hover:bg-[hsl(var(--portal-primary))]/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--portal-primary))]'
                )}
              >
                <LucideIcon name="Pencil" className="h-4 w-4" />
                Write a Review
              </button>
            )}
          </div>
        )}

        {/* Reviews List/Grid */}
        {displayedReviews.length > 0 ? (
          <>
            <div
              className={cn(
                layout === 'grid' && 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
                layout === 'list' && 'space-y-6',
                layout === 'masonry' && 'columns-1 gap-6 sm:columns-2 lg:columns-3'
              )}
            >
              {displayedReviews.map((review, index) => (
                <div key={review.id} className={layout === 'masonry' ? 'mb-6 break-inside-avoid' : ''}>
                  <ReviewCard review={review} index={index} />
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setDisplayCount((prev) => prev + initialDisplayCount)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-6 py-3',
                    'border border-[hsl(var(--portal-border))]',
                    'text-[hsl(var(--portal-foreground))] font-medium',
                    'transition-all duration-200',
                    'hover:border-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary))]'
                  )}
                >
                  <LucideIcon name="ChevronDown" className="h-4 w-4" />
                  Load More Reviews ({filteredReviews.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-12 text-center">
            <LucideIcon
              name="MessageSquare"
              className="mx-auto h-12 w-12 text-[hsl(var(--portal-muted-foreground))]"
            />
            <p className="mt-4 text-lg font-medium text-[hsl(var(--portal-foreground))]">
              No reviews yet
            </p>
            <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
              Be the first to share your experience with this product.
            </p>
            {showWriteReview && (
              <button
                className={cn(
                  'mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2',
                  'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                  'font-medium transition-all duration-200',
                  'hover:bg-[hsl(var(--portal-primary))]/90'
                )}
              >
                <LucideIcon name="Pencil" className="h-4 w-4" />
                Write the First Review
              </button>
            )}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
