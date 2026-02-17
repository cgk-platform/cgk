/**
 * Reviews Page Components
 *
 * Client components for reviews page interactivity.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/account/EmptyState'
import type { PaginatedResult } from '@/lib/account/types'

import type { CustomerReview } from '@/app/api/account/reviews/route'
import type { EligibleProduct } from '@/app/api/account/reviews/eligible/route'

interface ReviewsTabsProps {
  activeTab: string
}

export function ReviewsTabs({ activeTab }: ReviewsTabsProps) {
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      <Link
        href="/account/reviews?tab=submitted"
        className={cn(
          'rounded-full border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
          activeTab === 'submitted'
            ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] border-transparent'
            : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:bg-[hsl(var(--portal-muted))]'
        )}
      >
        My Reviews
      </Link>
      <Link
        href="/account/reviews?tab=eligible"
        className={cn(
          'rounded-full border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
          activeTab === 'eligible'
            ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] border-transparent'
            : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:bg-[hsl(var(--portal-muted))]'
        )}
      >
        Write a Review
      </Link>
    </div>
  )
}

interface ReviewsListClientProps {
  page: number
}

export function ReviewsListClient({ page }: ReviewsListClientProps) {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReviews() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/account/reviews?page=${page}&pageSize=10`)
        if (!res.ok) throw new Error('Failed to fetch reviews')
        const data: PaginatedResult<CustomerReview> = await res.json()
        setReviews(data.items)
        setTotal(data.total)
        setHasMore(data.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews')
      } finally {
        setIsLoading(false)
      }
    }
    fetchReviews()
  }, [page])

  if (isLoading) {
    return <ReviewsSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--portal-muted-foreground))]">{error}</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        }
        title="No reviews yet"
        description="You haven't written any reviews yet. Share your experience with products you've purchased!"
        action={
          <Link
            href="/account/reviews?tab=eligible"
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
            )}
          >
            Write a Review
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Link
            href={`/account/reviews?tab=submitted&page=${page + 1}`}
            className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
          >
            Load more reviews
          </Link>
        </div>
      )}

      {total > 0 && (
        <p className="text-center text-sm text-[hsl(var(--portal-muted-foreground))] pt-4">
          Showing {reviews.length} of {total} reviews
        </p>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: CustomerReview }) {
  const statusColors = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
      <div className="flex gap-4">
        {/* Product Image */}
        <Link
          href={`/products/${review.productHandle}`}
          className="flex-shrink-0"
        >
          {review.productImageUrl ? (
            <img
              src={review.productImageUrl}
              alt={review.productTitle}
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-[hsl(var(--portal-muted))] flex items-center justify-center">
              <svg className="h-8 w-8 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Product Title & Status */}
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/products/${review.productHandle}`}
              className="font-medium text-[hsl(var(--portal-foreground))] hover:underline line-clamp-1"
            >
              {review.productTitle}
            </Link>
            <span className={cn(
              'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
              statusColors[review.status]
            )}>
              {review.status === 'pending' ? 'Pending Review' :
               review.status === 'approved' ? 'Published' : 'Rejected'}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={cn(
                  'h-4 w-4',
                  star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'
                )}
                viewBox="0 0 24 24"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            ))}
            <span className="ml-1 text-xs text-[hsl(var(--portal-muted-foreground))]">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Review Title & Body */}
          <h4 className="mt-2 font-medium text-sm text-[hsl(var(--portal-foreground))]">
            {review.title}
          </h4>
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))] line-clamp-2">
            {review.body}
          </p>

          {/* Review Images */}
          {review.images.length > 0 && (
            <div className="flex gap-2 mt-2">
              {review.images.slice(0, 3).map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.altText ?? 'Review image'}
                  className="h-12 w-12 rounded object-cover"
                />
              ))}
              {review.images.length > 3 && (
                <div className="h-12 w-12 rounded bg-[hsl(var(--portal-muted))] flex items-center justify-center text-xs text-[hsl(var(--portal-muted-foreground))]">
                  +{review.images.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Merchant Response */}
          {review.response && (
            <div className="mt-3 rounded-lg bg-[hsl(var(--portal-muted))]/30 p-3">
              <p className="text-xs font-medium text-[hsl(var(--portal-foreground))]">
                Merchant Response
              </p>
              <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                {review.response.body}
              </p>
            </div>
          )}

          {/* Edit link for pending reviews */}
          {review.status === 'pending' && (
            <Link
              href={`/account/reviews/write/${review.productId}`}
              className="inline-flex items-center gap-1 mt-3 text-sm text-[hsl(var(--portal-primary))] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Review
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

interface EligibleProductsClientProps {
  page: number
}

export function EligibleProductsClient({ page }: EligibleProductsClientProps) {
  const [products, setProducts] = useState<EligibleProduct[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/account/reviews/eligible?page=${page}&pageSize=20`)
        if (!res.ok) throw new Error('Failed to fetch eligible products')
        const data: PaginatedResult<EligibleProduct> = await res.json()
        setProducts(data.items)
        setTotal(data.total)
        setHasMore(data.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [page])

  if (isLoading) {
    return <EligibleSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--portal-muted-foreground))]">{error}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="All caught up!"
        description="You've reviewed all your delivered purchases. Thank you for sharing your feedback!"
        action={
          <Link
            href="/products"
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
            )}
          >
            Continue Shopping
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <p className="text-sm text-[hsl(var(--portal-muted-foreground))] mb-4">
        {total} product{total !== 1 ? 's' : ''} awaiting your review
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <EligibleProductCard key={`${product.productId}-${product.orderId}`} product={product} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Link
            href={`/account/reviews?tab=eligible&page=${page + 1}`}
            className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
          >
            Load more products
          </Link>
        </div>
      )}
    </div>
  )
}

function EligibleProductCard({ product }: { product: EligibleProduct }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] overflow-hidden">
      {/* Product Image */}
      <Link href={`/products/${product.handle}`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="h-40 w-full bg-[hsl(var(--portal-muted))] flex items-center justify-center">
            <svg className="h-12 w-12 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}
      </Link>

      <div className="p-4">
        <Link
          href={`/products/${product.handle}`}
          className="font-medium text-[hsl(var(--portal-foreground))] hover:underline line-clamp-2"
        >
          {product.title}
        </Link>
        {product.variantTitle && (
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {product.variantTitle}
          </p>
        )}
        <p className="text-xs text-[hsl(var(--portal-muted-foreground))] mt-1">
          Purchased {new Date(product.purchasedAt).toLocaleDateString()}
        </p>

        <Link
          href={`/account/reviews/write/${product.productId}`}
          className={cn(
            'mt-4 w-full inline-flex items-center justify-center gap-2',
            'rounded-lg bg-[hsl(var(--portal-primary))] px-4 py-2',
            'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
            'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Write Review
        </Link>
      </div>
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4"
        >
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-lg bg-[hsl(var(--portal-muted))]" />
            <div className="flex-1">
              <div className="h-5 w-48 rounded bg-[hsl(var(--portal-muted))] mb-2" />
              <div className="h-4 w-32 rounded bg-[hsl(var(--portal-muted))] mb-2" />
              <div className="h-4 w-full rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EligibleSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] overflow-hidden"
        >
          <div className="h-40 w-full bg-[hsl(var(--portal-muted))]" />
          <div className="p-4">
            <div className="h-5 w-full rounded bg-[hsl(var(--portal-muted))] mb-2" />
            <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))] mb-4" />
            <div className="h-10 w-full rounded-lg bg-[hsl(var(--portal-muted))]" />
          </div>
        </div>
      ))}
    </div>
  )
}
