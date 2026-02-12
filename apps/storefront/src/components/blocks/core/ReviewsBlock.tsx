/**
 * Reviews Block Component
 *
 * Displays customer reviews in various layouts: grid, carousel, or masonry.
 * Includes rating stars, reviewer info, and optional ratings summary.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@cgk/ui'
import type { BlockProps, ReviewsConfig, ReviewItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Star rating component
 */
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <LucideIcon
          key={star}
          name="Star"
          className={cn(
            sizeClasses[size],
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : star <= Math.ceil(rating) && rating % 1 !== 0
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted))]'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Individual review card
 */
function ReviewCard({
  review,
  index,
  layout,
}: {
  review: ReviewItem
  index: number
  layout: 'grid' | 'carousel' | 'masonry'
}) {
  return (
    <article
      className={cn(
        'group relative rounded-2xl p-6',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/20',
        'hover:shadow-lg',
        layout === 'carousel' && 'min-w-[320px] snap-center sm:min-w-[380px]',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Quote decoration */}
      <div className="absolute -top-3 left-6">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            'bg-[hsl(var(--portal-primary))]',
            'shadow-lg shadow-[hsl(var(--portal-primary))]/20'
          )}
        >
          <svg
            className="h-4 w-4 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-4 mt-2">
        <StarRating rating={review.rating} />
      </div>

      {/* Review content */}
      <p className="mb-6 text-[hsl(var(--portal-foreground))] leading-relaxed">
        {review.content}
      </p>

      {/* Product name if present */}
      {review.productName && (
        <p className="mb-4 text-sm font-medium text-[hsl(var(--portal-primary))]">
          {review.productName}
        </p>
      )}

      {/* Reviewer info */}
      <div className="flex items-center gap-3 border-t border-[hsl(var(--portal-border))] pt-4">
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
          <p className="font-medium text-[hsl(var(--portal-foreground))]">
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
    </article>
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
  // Calculate distribution
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.floor(r.rating) === stars).length
    return {
      stars,
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    }
  })

  return (
    <div className="flex flex-col gap-8 rounded-2xl bg-[hsl(var(--portal-card))] p-8 lg:flex-row lg:items-center lg:gap-16">
      {/* Average rating */}
      <div className="text-center">
        <div className="text-6xl font-bold text-[hsl(var(--portal-foreground))]">
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
      <div className="flex-1 space-y-3">
        {distribution.map(({ stars, count, percentage }) => (
          <div key={stars} className="flex items-center gap-4">
            <span className="w-12 text-sm font-medium text-[hsl(var(--portal-foreground))]">
              {stars} star
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--portal-muted))]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-12 text-right text-sm text-[hsl(var(--portal-muted-foreground))]">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Carousel navigation button
 */
function CarouselButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]',
        'hover:text-white hover:shadow-lg',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[hsl(var(--portal-card))]',
        'disabled:hover:border-[hsl(var(--portal-border))] disabled:hover:text-inherit'
      )}
      aria-label={direction === 'prev' ? 'Previous reviews' : 'Next reviews'}
    >
      <LucideIcon
        name={direction === 'prev' ? 'ChevronLeft' : 'ChevronRight'}
        className="h-5 w-5"
      />
    </button>
  )
}

/**
 * Reviews Block Component
 */
export function ReviewsBlock({ block, className }: BlockProps<ReviewsConfig>) {
  const {
    headline,
    subheadline,
    reviews,
    layout = 'grid',
    showRatingsSummary = false,
    averageRating = 0,
    totalReviews = 0,
    backgroundColor,
  } = block.config

  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    updateScrollButtons()
    const carousel = carouselRef.current
    if (carousel && layout === 'carousel') {
      carousel.addEventListener('scroll', updateScrollButtons)
      return () => carousel.removeEventListener('scroll', updateScrollButtons)
    }
  }, [layout])

  const scroll = (direction: 'prev' | 'next') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'next' ? 400 : -400
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Calculate average if not provided
  const calculatedAverage =
    averageRating ||
    (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0)
  const calculatedTotal = totalReviews || reviews.length

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
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
          <div className="mb-12">
            <RatingsSummary
              averageRating={calculatedAverage}
              totalReviews={calculatedTotal}
              reviews={reviews}
            />
          </div>
        )}

        {/* Reviews - Grid Layout */}
        {layout === 'grid' && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <ReviewCard
                key={review.id}
                review={review}
                index={index}
                layout={layout}
              />
            ))}
          </div>
        )}

        {/* Reviews - Carousel Layout */}
        {layout === 'carousel' && (
          <div className="relative">
            <div
              ref={carouselRef}
              className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 scrollbar-hide sm:-mx-8 sm:px-8"
            >
              {reviews.map((review, index) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  index={index}
                  layout={layout}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="mt-8 flex justify-center gap-4">
              <CarouselButton
                direction="prev"
                onClick={() => scroll('prev')}
                disabled={!canScrollLeft}
              />
              <CarouselButton
                direction="next"
                onClick={() => scroll('next')}
                disabled={!canScrollRight}
              />
            </div>
          </div>
        )}

        {/* Reviews - Masonry Layout */}
        {layout === 'masonry' && (
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {reviews.map((review, index) => (
              <div key={review.id} className="mb-6 break-inside-avoid">
                <ReviewCard review={review} index={index} layout={layout} />
              </div>
            ))}
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
