/**
 * StarRating Component
 *
 * Displays star ratings with support for half-stars.
 * Used in product reviews and rating summaries.
 */

import { cn } from '@cgk/ui'

interface StarRatingProps {
  /** Rating value (0-5) */
  rating: number
  /** Maximum stars to display */
  maxStars?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show numeric rating alongside stars */
  showValue?: boolean
  /** Number of reviews (for display) */
  reviewCount?: number
  /** Custom class name */
  className?: string
  /** Interactive (for forms) */
  interactive?: boolean
  /** Callback when rating changes (only in interactive mode) */
  onRatingChange?: (rating: number) => void
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  reviewCount,
  className,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const clampedRating = Math.max(0, Math.min(rating, maxStars))

  const sizeClasses = {
    sm: { star: 'h-3.5 w-3.5', text: 'text-xs', gap: 'gap-0.5' },
    md: { star: 'h-4 w-4', text: 'text-sm', gap: 'gap-1' },
    lg: { star: 'h-5 w-5', text: 'text-base', gap: 'gap-1' },
  }[size]

  const renderStar = (index: number) => {
    const fill = Math.max(0, Math.min(1, clampedRating - index))

    const handleClick = () => {
      if (interactive && onRatingChange) {
        onRatingChange(index + 1)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (interactive && onRatingChange && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onRatingChange(index + 1)
      }
    }

    const StarIcon = (
      <div className="relative" key={index}>
        {/* Background star (empty) */}
        <svg
          className={cn(sizeClasses.star, 'text-gray-200')}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        {/* Filled star (overlaid with clip) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <svg
            className={cn(sizeClasses.star, 'text-amber-400')}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      </div>
    )

    if (interactive) {
      return (
        <button
          key={index}
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm transition-transform hover:scale-110"
          aria-label={`Rate ${index + 1} out of ${maxStars} stars`}
        >
          {StarIcon}
        </button>
      )
    }

    return StarIcon
  }

  return (
    <div
      className={cn('flex items-center', sizeClasses.gap, className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={
        interactive
          ? 'Rating selector'
          : `Rating: ${clampedRating.toFixed(1)} out of ${maxStars} stars${reviewCount !== undefined ? `, based on ${reviewCount} reviews` : ''}`
      }
    >
      <div className={cn('flex', sizeClasses.gap)}>
        {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      </div>

      {showValue && (
        <span className={cn('font-medium text-foreground', sizeClasses.text)}>
          {clampedRating.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className={cn('text-muted-foreground', sizeClasses.text)}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  )
}

/**
 * Compact star display for tight spaces
 */
interface CompactStarRatingProps {
  rating: number
  reviewCount?: number
  className?: string
}

export function CompactStarRating({
  rating,
  reviewCount,
  className,
}: CompactStarRatingProps) {
  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      <svg
        className="h-4 w-4 text-amber-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-muted-foreground">
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  )
}

export default StarRating
