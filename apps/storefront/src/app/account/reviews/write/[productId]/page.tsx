/**
 * Write Review Page
 *
 * Form to create or edit a product review.
 */

import { cn } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql, withTenant } from '@cgk-platform/db'
import { getTenantSlug } from '@/lib/tenant'
import { getCustomerSession } from '@/lib/customer-session'

import { WriteReviewForm } from './components'

export const metadata: Metadata = {
  title: 'Write a Review',
  description: 'Share your experience with this product',
}

export const dynamic = 'force-dynamic'

interface WriteReviewPageProps {
  params: Promise<{ productId: string }>
}

interface ProductInfo {
  id: string
  title: string
  handle: string
  imageUrl: string | null
}

interface ExistingReview {
  id: string
  rating: number
  title: string
  body: string
  images: Array<{ id: string; url: string; altText?: string }>
}

export default async function WriteReviewPage({ params }: WriteReviewPageProps) {
  const { productId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug || !session) {
    notFound()
  }

  // Get product info
  const productResult = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      title: string
      handle: string
      featured_image_url: string | null
    }>`
      SELECT id, title, handle, featured_image_url
      FROM products
      WHERE id = ${productId}
      LIMIT 1
    `
  })

  // Also check order_line_items if product not found in products table
  let product: ProductInfo | null = null

  if (productResult.rows[0]) {
    const row = productResult.rows[0]
    product = {
      id: row.id,
      title: row.title,
      handle: row.handle,
      imageUrl: row.featured_image_url,
    }
  } else {
    // Try to get product info from order line items
    const lineItemResult = await withTenant(tenantSlug, async () => {
      return sql<{
        product_id: string
        title: string
        image_url: string | null
      }>`
        SELECT DISTINCT ON (li.product_id)
          li.product_id,
          li.title,
          li.image_url
        FROM order_line_items li
        JOIN orders o ON o.id = li.order_id
        WHERE o.customer_id = ${session.customerId}
          AND li.product_id = ${productId}
        LIMIT 1
      `
    })

    if (lineItemResult.rows[0]) {
      const row = lineItemResult.rows[0]
      product = {
        id: row.product_id,
        title: row.title,
        handle: row.product_id,
        imageUrl: row.image_url,
      }
    }
  }

  if (!product) {
    notFound()
  }

  // Check if customer has purchased this product
  const purchaseCheck = await withTenant(tenantSlug, async () => {
    return sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1
        FROM order_line_items li
        JOIN orders o ON o.id = li.order_id
        WHERE o.customer_id = ${session.customerId}
          AND o.status = 'delivered'
          AND li.product_id = ${productId}
      ) as exists
    `
  })

  if (!purchaseCheck.rows[0]?.exists) {
    return (
      <div className="min-h-screen">
        <div className="mb-8">
          <Link
            href="/account/reviews"
            className="inline-flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))] mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reviews
          </Link>
        </div>

        <div className="max-w-md mx-auto text-center py-12">
          <svg
            className="mx-auto h-16 w-16 text-[hsl(var(--portal-muted-foreground))]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h2 className="mt-4 text-xl font-bold text-[hsl(var(--portal-foreground))]">
            Cannot Review This Product
          </h2>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            You can only review products that have been delivered to you.
          </p>
          <Link
            href="/account/reviews?tab=eligible"
            className={cn(
              'inline-flex items-center justify-center mt-6',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
            )}
          >
            View Eligible Products
          </Link>
        </div>
      </div>
    )
  }

  // Check for existing review
  let existingReview: ExistingReview | null = null
  const reviewResult = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      rating: number
      title: string
      body: string
      images: unknown[] | null
    }>`
      SELECT id, rating, title, body, images
      FROM reviews
      WHERE customer_id = ${session.customerId}
        AND product_id = ${productId}
      LIMIT 1
    `
  })

  if (reviewResult.rows[0]) {
    const row = reviewResult.rows[0]
    const images = (row.images ?? []) as Array<{
      id: string
      url: string
      altText?: string
    }>
    existingReview = {
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      images,
    }
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/account/reviews"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))] mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reviews
        </Link>

        <h1
          className="text-2xl font-bold tracking-tight lg:text-3xl"
          style={{ fontFamily: 'var(--portal-heading-font)' }}
        >
          {existingReview ? 'Edit Your Review' : 'Write a Review'}
        </h1>
      </div>

      {/* Product Info */}
      <div className="mb-8 flex gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-24 w-24 rounded-lg object-cover"
          />
        ) : (
          <div className="h-24 w-24 rounded-lg bg-[hsl(var(--portal-muted))] flex items-center justify-center">
            <svg className="h-10 w-10 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}
        <div>
          <h2 className="font-medium text-[hsl(var(--portal-foreground))]">
            {product.title}
          </h2>
          <Link
            href={`/products/${product.handle}`}
            className="text-sm text-[hsl(var(--portal-primary))] hover:underline"
          >
            View Product
          </Link>
        </div>
      </div>

      {/* Review Form */}
      <div className="max-w-2xl">
        <WriteReviewForm
          productId={product.id}
          existingReview={existingReview}
        />
      </div>
    </div>
  )
}
