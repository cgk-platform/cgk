/**
 * Product Detail Page (PDP)
 *
 * Displays full product information with gallery, variants, and add to cart.
 * Reads from local PostgreSQL database for fast performance.
 * Includes reviews, related products, and recently viewed sections.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
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
  MediaGallery,
  PriceDisplay,
  CompactStarRating,
  RelatedProductsSkeleton,
  CollapsibleTabs,
} from '@/components/products'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getCommerceProvider } from '@/lib/commerce'
import { getMetafields, parseBadges, parseVideoUrl } from '@/lib/metafields'
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
    title: product.seo?.title || `${product.title} | ${tenant?.name ?? 'Store'}`,
    description: product.seo?.description || product.description?.slice(0, 160),
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
    <div className="mx-auto max-w-store px-4 py-8">
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

  // Fetch metafields for badges and video
  const metafields = await getMetafields(handle, [
    { namespace: 'custom', key: 'badges' },
    { namespace: 'custom', key: 'video' },
  ])
  const badges = parseBadges(metafields.find(m => m.key === 'badges'))
  const videoUrl = parseVideoUrl(metafields.find(m => m.key === 'video'))

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

  // Build absolute URL for structured data
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const productUrl = `${protocol}://${host}/products/${handle}`
  const siteUrl = `${protocol}://${host}`

  // Fetch rating for structured data
  const rating = await getProductRating(product.id)

  // Build breadcrumb items for JSON-LD
  const breadcrumbItems = [
    { name: 'Home', url: siteUrl },
    { name: 'Products', url: `${siteUrl}/products` },
    ...(product.productType
      ? [{
          name: product.productType,
          url: `${siteUrl}/collections/${product.productType.toLowerCase().replace(/\s+/g, '-')}`,
        }]
      : []),
    { name: product.title, url: productUrl },
  ]

  return (
    <>
      {/* Structured Data */}
      <ProductJsonLd
        product={product}
        brandName={tenant?.name ?? 'Store'}
        url={productUrl}
        rating={rating && rating.totalReviews > 0
          ? { averageRating: rating.averageRating, totalReviews: rating.totalReviews }
          : null}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/" className="hover:text-cgk-navy">Home</a>
          </li>
          <li>/</li>
          <li>
            <a href="/products" className="hover:text-cgk-navy">Products</a>
          </li>
          {product.productType && (
            <>
              <li>/</li>
              <li>
                <a
                  href={`/collections/${product.productType.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-cgk-navy"
                >
                  {product.productType}
                </a>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-cgk-navy">{product.title}</li>
        </ol>
      </nav>

      {/* Main Product Layout */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: Gallery */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <MediaGallery images={product.images} productTitle={product.title} />
        </div>

        {/* Right: Product Info */}
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-2xl font-bold text-cgk-navy md:text-3xl">{product.title}</h1>

          {/* Product Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: badge.color + '20', color: badge.color }}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}

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

          {/* Free Shipping Note */}
          <p className="text-sm font-semibold text-cgk-gold">
            FREE 3-DAY DELIVERY FOR ORDERS OVER $50
          </p>

          {/* Collapsible Tabs */}
          <CollapsibleTabs
            tabs={[
              ...(product.descriptionHtml
                ? [{ title: 'Description', content: product.descriptionHtml }]
                : product.description
                  ? [{ title: 'Description', content: `<p>${product.description}</p>` }]
                  : []),
              {
                title: 'Size Guide',
                content: `
                  <table class="w-full text-sm">
                    <thead><tr class="border-b"><th class="py-2 text-left">Size</th><th class="py-2 text-left">Flat Sheet</th><th class="py-2 text-left">Fitted Sheet</th><th class="py-2 text-left">Pillowcases</th></tr></thead>
                    <tbody>
                      <tr class="border-b"><td class="py-2">Twin</td><td>66" x 96"</td><td>39" x 75" x 21"</td><td>1 Standard</td></tr>
                      <tr class="border-b"><td class="py-2">Full</td><td>81" x 96"</td><td>54" x 75" x 21"</td><td>2 Standard</td></tr>
                      <tr class="border-b"><td class="py-2">Queen</td><td>90" x 102"</td><td>60" x 80" x 21"</td><td>2 Standard</td></tr>
                      <tr class="border-b"><td class="py-2">King</td><td>108" x 102"</td><td>78" x 80" x 21"</td><td>2 King</td></tr>
                      <tr><td class="py-2">Cal King</td><td>108" x 102"</td><td>72" x 84" x 21"</td><td>2 King</td></tr>
                    </tbody>
                  </table>
                `,
              },
              {
                title: 'Shipping & Returns',
                content: '<p>Free standard shipping on orders over $50. Express 2-3 day shipping available. 30-day hassle-free returns — if you\'re not satisfied, we\'ll make it right.</p>',
              },
              {
                title: 'Care Instructions',
                content: '<p>Machine wash cold on a gentle cycle. Tumble dry low. Remove promptly to minimize wrinkles. Do not bleach. Iron on low if needed.</p>',
              },
            ]}
          />

          {/* Product Video */}
          {videoUrl && (
            <div className="mt-4 overflow-hidden rounded-lg">
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-lg"
                poster={product.images[0]?.url}
              >
                Your browser does not support the video tag.
              </video>
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
