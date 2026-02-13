/**
 * ReviewCard Component
 *
 * Displays an individual product review with author, rating, content,
 * and optional images and merchant response.
 */

'use client'

import type { Review } from '@/lib/reviews'
import { cn } from '@cgk-platform/ui'
import Image from 'next/image'
import { useState } from 'react'

import { StarRating } from './StarRating'

interface ReviewCardProps {
  review: Review
  /** Show the review's product info (for account pages) */
  showProduct?: boolean
  /** Callback when helpful button is clicked */
  onHelpful?: (reviewId: string) => void
  /** Custom class name */
  className?: string
}

export function ReviewCard({
  review,
  showProduct: _showProduct = false, // Reserved for future use (account pages)
  onHelpful,
  className,
}: ReviewCardProps) {
  void _showProduct // Suppress unused warning
  const [hasVoted, setHasVoted] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleHelpful = () => {
    if (hasVoted || !onHelpful) return
    setHasVoted(true)
    onHelpful(review.id)
  }

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index)
    setIsImageModalOpen(true)
  }

  return (
    <article
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm sm:p-6',
        className
      )}
    >
      {/* Header: Author, Rating, Date */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(review.authorName)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{review.authorName}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <time
              dateTime={review.createdAt}
              className="text-sm text-muted-foreground"
            >
              {formattedDate}
            </time>
          </div>
        </div>

        <StarRating rating={review.rating} size="sm" />
      </header>

      {/* Title */}
      {review.title && (
        <h3 className="mt-3 text-base font-semibold">{review.title}</h3>
      )}

      {/* Body */}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {review.body}
      </p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openImageModal(index)}
              className="relative h-16 w-16 overflow-hidden rounded-md border transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-20 sm:w-20"
            >
              <Image
                src={image.url}
                alt={image.altText ?? 'Review image'}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Merchant Response */}
      {review.response && (
        <div className="mt-4 rounded-md border-l-4 border-primary/30 bg-muted/50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span className="text-sm font-medium">Response from the store</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {review.response.body}
          </p>
        </div>
      )}

      {/* Footer: Helpful */}
      <footer className="mt-4 flex items-center gap-4 border-t pt-3">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={hasVoted}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            hasVoted
              ? 'cursor-default text-muted-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={hasVoted ? 'Marked as helpful' : 'Mark as helpful'}
        >
          <svg
            className={cn('h-4 w-4', hasVoted && 'text-primary')}
            fill={hasVoted ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>
            {hasVoted ? 'Thanks!' : 'Helpful'}
            {review.helpfulCount > 0 && ` (${review.helpfulCount})`}
          </span>
        </button>
      </footer>

      {/* Image Modal */}
      {isImageModalOpen && review.images && (
        <ReviewImageModal
          images={review.images}
          selectedIndex={selectedImageIndex}
          onClose={() => setIsImageModalOpen(false)}
          onNavigate={setSelectedImageIndex}
        />
      )}
    </article>
  )
}

/**
 * Image Modal for viewing review images
 */
interface ReviewImageModalProps {
  images: NonNullable<Review['images']>
  selectedIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

function ReviewImageModal({
  images,
  selectedIndex,
  onClose,
  onNavigate,
}: ReviewImageModalProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && selectedIndex > 0) {
      onNavigate(selectedIndex - 1)
    }
    if (e.key === 'ArrowRight' && selectedIndex < images.length - 1) {
      onNavigate(selectedIndex + 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Review image viewer"
      tabIndex={0}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Image */}
      <div
        className="relative h-[80vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[selectedIndex]!.url}
          alt={images[selectedIndex]!.altText ?? 'Review image'}
          fill
          sizes="(max-width: 1024px) 100vw, 80vw"
          className="object-contain"
        />
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (selectedIndex > 0) onNavigate(selectedIndex - 1)
            }}
            disabled={selectedIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            aria-label="Previous image"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (selectedIndex < images.length - 1)
                onNavigate(selectedIndex + 1)
            }}
            disabled={selectedIndex === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            aria-label="Next image"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate(index)
                }}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  index === selectedIndex ? 'bg-white' : 'bg-white/50'
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default ReviewCard
