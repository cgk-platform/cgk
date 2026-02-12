/**
 * Product Detail Page (PDP)
 *
 * Displays full product information with gallery, variants, and add to cart.
 * Reads from local PostgreSQL database for fast performance.
 * Includes reviews, related products, and recently viewed sections.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProductInfo, ProductSkeleton } from './components'
import {
  ProductReviewsSection,
  RelatedProductsSection,
  RecentlyViewedSection,
  ProductViewTracker,
} from './sections'

import {
  ProductGallery,
  PriceDisplay,
  CompactStarRating,
  RelatedProductsSkeleton,
} from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getProductRating } from '@/lib/reviews'
import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProductPageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const commerce = await getCommerceProvider()
  const tenant = await getTenantConfig()

  if (!commerce) {
    return {
      title: 'Product | Store',
    }
  }

  const product = await commerce.products.getByHandle(handle)

  if (!product) {
    return {
      title: 'Product Not Found | Store',
    }
  }

  const image = product.images[0]

  return {
    title: `${product.title} | ${tenant?.name ?? 'Store'}`,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.title,
      description: product.description ?? '',
      images: image
        ? [
            {
              url: image.url,
              width: image.width ?? 1200,
              height: image.height ?? 630,
              alt: image.altText ?? product.title,
            },
          ]
        : [],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent handle={handle} />
      </Suspense>
    </div>
  )
}

interface ProductContentProps {
  handle: string
}

async function ProductContent({ handle }: ProductContentProps) {
  const [commerce, tenant, ] = await Promise.all([
    getCommerceProvider(),
    getTenantConfig(),
  ])

  const tenantSlug = tenant?.slug ?? 'unknown'

  if (!commerce) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Store not configured</h2>
        <p className="mt-2 text-muted-foreground">
          Please configure your store settings to display products.
        </p>
      </div>
    )
  }

  const product = await commerce.products.getByHandle(handle)

  if (!product) {
    notFound()
  }

  const hasMultipleVariants = product.variants.length > 1

  // Build options from variants
  const options: Array<{ name: string; values: string[] }> = []
  const optionMap = new Map<string, Set<string>>()

  for (const variant of product.variants) {
    for (const option of variant.selectedOptions) {
      if (!optionMap.has(option.name)) {
        optionMap.set(option.name, new Set())
      }
      optionMap.get(option.name)!.add(option.value)
    }
  }

  for (const [name, values] of optionMap) {
    options.push({ name, values: Array.from(values) })
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <a href="/" className="hover:text-foreground">
              Home
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/products" className="hover:text-foreground">
              Products
            </a>
          </li>
          {product.productType && (
            <>
              <li>/</li>
              <li>
                <a
                  href={`/collections/${product.productType.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-foreground"
                >
                  {product.productType}
                </a>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-foreground">{product.title}</li>
        </ol>
      </nav>

      {/* Main Product Layout */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: Gallery */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ProductGallery images={product.images} productTitle={product.title} />
        </div>

        {/* Right: Product Info */}
        <div className="space-y-6">
          {/* Vendor */}
          {product.vendor && (
            <a
              href={`/collections/vendor/${product.vendor.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {product.vendor}
            </a>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold md:text-3xl">{product.title}</h1>

          {/* Rating Summary (if reviews exist) */}
          <Suspense fallback={null}>
            <ProductRatingSummary productId={product.id} />
          </Suspense>

          {/* Price */}
          <PriceDisplay
            price={product.priceRange.minVariantPrice}
            compareAtPrice={
              product.variants[0]?.compareAtPrice &&
              parseFloat(product.variants[0].compareAtPrice.amount) >
                parseFloat(product.variants[0].price.amount)
                ? product.variants[0].compareAtPrice
                : undefined
            }
            isRange={
              product.priceRange.minVariantPrice.amount !==
              product.priceRange.maxVariantPrice.amount
            }
            maxPrice={product.priceRange.maxVariantPrice}
            size="xl"
            showSavings
          />

          {/* Product Info Client Component (handles variant selection) */}
          <ProductInfo
            product={product}
            options={options}
            hasMultipleVariants={hasMultipleVariants}
            tenantSlug={tenant?.slug ?? 'unknown'}
          />

          {/* Description */}
          {product.description && (
            <div className="border-t pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              {product.descriptionHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              ) : (
                <p className="text-muted-foreground">{product.description}</p>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="border-t pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <a
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Track Product View */}
      <ProductViewTracker
        product={{
          id: product.id,
          handle: product.handle,
          title: product.title,
        }}
      />

      {/* Reviews Section */}
      <section className="mt-16 border-t pt-8">
        <Suspense
          fallback={
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded bg-muted" />
              <div className="h-32 w-full rounded bg-muted" />
            </div>
          }
        >
          <ProductReviewsSection productId={product.id} />
        </Suspense>
      </section>

      {/* Related Products */}
      {product.productType && (
        <section className="mt-16 border-t pt-8">
          <h2 className="mb-6 text-xl font-bold">You May Also Like</h2>
          <Suspense fallback={<RelatedProductsSkeleton count={4} />}>
            <RelatedProductsSection
              productType={product.productType}
              currentProductId={product.id}
              tenantSlug={tenantSlug}
            />
          </Suspense>
        </section>
      )}

      {/* Recently Viewed Products */}
      <section className="mt-16 border-t pt-8">
        <RecentlyViewedSection
          currentProductId={product.id}
          tenantSlug={tenantSlug}
        />
      </section>
    </>
  )
}

/**
 * Product Rating Summary (shown below title)
 */
async function ProductRatingSummary({ productId }: { productId: string }) {
  const rating = await getProductRating(productId)

  if (!rating || rating.totalReviews === 0) {
    return null
  }

  return (
    <a
      href="#reviews-heading"
      className="inline-flex items-center gap-2 text-sm hover:underline"
    >
      <CompactStarRating
        rating={rating.averageRating}
        reviewCount={rating.totalReviews}
      />
    </a>
  )
}
