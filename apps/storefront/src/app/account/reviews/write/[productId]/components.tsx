/**
 * Write Review Form Components
 *
 * Client form for creating/editing product reviews.
 */

'use client'

import { Button, cn } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

interface ExistingReview {
  id: string
  rating: number
  title: string
  body: string
  images: Array<{ id: string; url: string; altText?: string }>
}

interface WriteReviewFormProps {
  productId: string
  existingReview: ExistingReview | null
}

export function WriteReviewForm({ productId, existingReview }: WriteReviewFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState(existingReview?.title ?? '')
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (!title.trim()) {
      setError('Please add a title for your review')
      return
    }

    if (!body.trim()) {
      setError('Please write your review')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/account/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          body: body.trim(),
          images: [], // Image upload would be handled separately
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save review')
      }

      // Redirect to reviews page with success
      router.push('/account/reviews?tab=submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review')
      setIsSubmitting(false)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Rating Selection */}
      <div>
        <label className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-3">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] rounded"
            >
              <svg
                className={cn(
                  'h-8 w-8 transition-colors',
                  star <= displayRating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-stone-300 hover:text-amber-200'
                )}
                viewBox="0 0 24 24"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          ))}
          <span className="ml-3 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {displayRating === 0 && 'Click to rate'}
            {displayRating === 1 && 'Poor'}
            {displayRating === 2 && 'Fair'}
            {displayRating === 3 && 'Good'}
            {displayRating === 4 && 'Very Good'}
            {displayRating === 5 && 'Excellent'}
          </span>
        </div>
      </div>

      {/* Review Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2"
        >
          Review Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          className={cn(
            'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'py-3 px-4 text-sm',
            'placeholder:text-[hsl(var(--portal-muted-foreground))]',
            'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
            'transition-all duration-200'
          )}
        />
        <p className="mt-1 text-xs text-[hsl(var(--portal-muted-foreground))]">
          {title.length}/100 characters
        </p>
      </div>

      {/* Review Body */}
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2"
        >
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your experience with this product. What did you like or dislike? Would you recommend it to others?"
          rows={6}
          className={cn(
            'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'py-3 px-4 text-sm resize-none',
            'placeholder:text-[hsl(var(--portal-muted-foreground))]',
            'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
            'transition-all duration-200'
          )}
        />
        <p className="mt-1 text-xs text-[hsl(var(--portal-muted-foreground))]">
          Minimum 50 characters recommended for a helpful review
        </p>
      </div>

      {/* Guidelines */}
      <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-4">
        <h3 className="text-sm font-medium text-[hsl(var(--portal-foreground))] mb-2">
          Review Guidelines
        </h3>
        <ul className="space-y-1 text-xs text-[hsl(var(--portal-muted-foreground))]">
          <li className="flex items-start gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Focus on your personal experience with the product
          </li>
          <li className="flex items-start gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Be specific about what you liked or disliked
          </li>
          <li className="flex items-start gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Keep it respectful and relevant to the product
          </li>
          <li className="flex items-start gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Avoid including personal information or external links
          </li>
        </ul>
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={rating === 0 || !title.trim() || !body.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </>
          ) : existingReview ? (
            'Update Review'
          ) : (
            'Submit Review'
          )}
        </Button>
      </div>

      {/* Moderation Notice */}
      <p className="text-xs text-[hsl(var(--portal-muted-foreground))] text-center">
        Your review will be visible after it's been reviewed by our team. This usually takes 24-48 hours.
      </p>
    </form>
  )
}
