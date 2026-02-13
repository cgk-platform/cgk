/**
 * Product Detail Page Sections
 *
 * Server and client components for product page sections:
 * - Reviews section with ratings and pagination
 * - Related products section
 * - Recently viewed products section
 */

import type { Product } from '@cgk-platform/commerce'

import {
  ProductReviews,
  RelatedProducts,
  RecentlyViewedProducts,
  TrackProductView,
} from '@/components/products'
import { getProductRating, getProductReviews, markReviewHelpful } from '@/lib/reviews'
import type { ReviewSortOrder } from '@/lib/reviews'
import { getRelatedProducts, getProductsByHandles } from '@/lib/products-db'

// ---------------------------------------------------------------------------
// Product Reviews Section
// ---------------------------------------------------------------------------

interface ProductReviewsSectionProps {
  productId: string
}

export async function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const [reviews, rating] = await Promise.all([
    getProductReviews(productId, { limit: 10 }),
    getProductRating(productId),
  ])

  // Server action to fetch more reviews
  async function fetchReviewsAction(
    productIdParam: string,
    options: { offset: number; limit: number; sort: ReviewSortOrder }
  ) {
    'use server'
    return getProductReviews(productIdParam, options)
  }

  // Server action to mark review as helpful
  async function markHelpfulAction(reviewId: string) {
    'use server'
    await markReviewHelpful(reviewId)
  }

  return (
    <ProductReviews
      productId={productId}
      initialReviews={reviews}
      rating={rating}
      fetchReviewsAction={fetchReviewsAction}
      markHelpfulAction={markHelpfulAction}
    />
  )
}

// ---------------------------------------------------------------------------
// Related Products Section
// ---------------------------------------------------------------------------

interface RelatedProductsSectionProps {
  productType: string
  currentProductId: string
  tenantSlug: string
}

export async function RelatedProductsSection({
  productType,
  currentProductId,
  tenantSlug,
}: RelatedProductsSectionProps) {
  const products = await getRelatedProducts(
    tenantSlug,
    productType,
    currentProductId,
    4
  )

  if (products.length === 0) {
    return null
  }

  return <RelatedProducts products={products} title="You May Also Like" />
}

// ---------------------------------------------------------------------------
// Recently Viewed Section
// ---------------------------------------------------------------------------

interface RecentlyViewedSectionProps {
  currentProductId: string
  tenantSlug: string
}

export function RecentlyViewedSection({
  currentProductId,
  tenantSlug,
}: RecentlyViewedSectionProps) {
  // Server action to fetch products by handles
  async function fetchProductsAction(handles: string[]): Promise<Product[]> {
    'use server'
    return getProductsByHandles(tenantSlug, handles)
  }

  return (
    <RecentlyViewedProducts
      currentProductId={currentProductId}
      maxDisplay={4}
      fetchProductsAction={fetchProductsAction}
      title="Recently Viewed"
    />
  )
}

// ---------------------------------------------------------------------------
// Product View Tracker
// ---------------------------------------------------------------------------

interface ProductViewTrackerProps {
  product: {
    id: string
    handle: string
    title: string
  }
}

export function ProductViewTracker({ product }: ProductViewTrackerProps) {
  return <TrackProductView product={product} />
}
