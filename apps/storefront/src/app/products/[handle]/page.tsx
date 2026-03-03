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
  ProductSelectorTabs,
  ProductSelectorGuide,
  SocialShare,
  SleepSaverGallery,
  TrustBadges,
  ShopPayInstallment,
  DeliveryEstimate,
  ProductComparisonTable,
} from '@/components/products'
import type { ComparisonFeature } from '@/components/products'
import { Check } from 'lucide-react'
import { MarqueeLogos } from '@/components/sections'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getCommerceProvider } from '@/lib/commerce'
import { getMetafields, parseBadges, parseVideoUrl } from '@/lib/metafields'
import { getProductRating } from '@/lib/reviews'
import { getTenantConfig } from '@/lib/tenant'
import type { Product } from '@cgk-platform/commerce'

const PRESS_LOGOS: { src: string; alt: string; width?: number }[] = [
  {
    src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Vector.svg',
    alt: 'Good Housekeeping',
    width: 110,
  },
  {
    src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Group_3662.svg',
    alt: 'New York Magazine',
    width: 275,
  },
  {
    src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Vector_1.svg',
    alt: 'Esquire',
    width: 110,
  },
  {
    src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Group.svg',
    alt: 'NBC Select',
    width: 185,
  },
  {
    src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Mens_Health.svg',
    alt: "Men's Health",
    width: 125,
  },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProductPageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
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
  const [commerce, tenant] = await Promise.all([getCommerceProvider(), getTenantConfig()])

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

  // Fetch metafields for badges, video, and favorite sheets badge
  const metafields = await getMetafields(handle, [
    { namespace: 'custom', key: 'badges' },
    { namespace: 'custom', key: 'video' },
    { namespace: 'custom', key: 'favorite_sheets' },
  ])
  const badges = parseBadges(metafields.find((m) => m.key === 'badges'))
  const videoUrl = parseVideoUrl(metafields.find((m) => m.key === 'video'))
  const favoriteSheetsMeta = metafields.find((m) => m.key === 'favorite_sheets')
  const showFavoriteSheetsBadge =
    favoriteSheetsMeta?.value === 'true' ||
    product.tags?.some(
      (t: string) =>
        t.toLowerCase() === "internet's favorite sheets" || t.toLowerCase() === 'favorite-sheets'
    )

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
      ? [
          {
            name: product.productType,
            url: `${siteUrl}/collections/${product.productType.toLowerCase().replace(/\s+/g, '-')}`,
          },
        ]
      : []),
    { name: product.title, url: productUrl },
  ]

  // Check if this is the SleepSaver product
  const isSleepSaver =
    handle ===
    'sleepersaver-sofa-support-board-permanently-installed-sleeper-sofa-support-board-for-sofa-bed'

  return (
    <>
      {/* Structured Data */}
      <ProductJsonLd
        product={product}
        brandName={tenant?.name ?? 'Store'}
        url={productUrl}
        rating={
          rating && rating.totalReviews > 0
            ? { averageRating: rating.averageRating, totalReviews: rating.totalReviews }
            : null
        }
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      {/* Product Selector Guide (SleepSaver only) */}
      {isSleepSaver && <ProductSelectorGuide />}

      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/" className="hover:text-meliusly-primary">
              Home
            </a>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li>
            <a href="/products" className="hover:text-meliusly-primary">
              Products
            </a>
          </li>
          {product.productType && (
            <>
              <li className="text-gray-400">&gt;</li>
              <li>
                <a
                  href={`/collections/${product.productType.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-meliusly-primary"
                >
                  {product.productType}
                </a>
              </li>
            </>
          )}
          <li className="text-gray-400">&gt;</li>
          <li className="text-meliusly-primary">{product.title}</li>
        </ol>
      </nav>

      {/* Main Product Layout */}
      <div
        className={
          isSleepSaver
            ? 'flex flex-col gap-8 lg:flex-row lg:gap-8'
            : 'grid gap-8 lg:grid-cols-2 lg:gap-12'
        }
      >
        {/* Left: Gallery */}
        <div className={isSleepSaver ? 'lg:max-w-[752px]' : 'lg:sticky lg:top-20 lg:self-start'}>
          {isSleepSaver ? (
            <SleepSaverGallery images={product.images} productTitle={product.title} />
          ) : (
            <MediaGallery images={product.images} productTitle={product.title} />
          )}
        </div>

        {/* Right: Product Info */}
        <div className={isSleepSaver ? 'space-y-4 lg:max-w-[588px]' : 'space-y-4'}>
          {isSleepSaver ? (
            <>
              {/* Rating Summary ABOVE title for SleepSaver */}
              <Suspense fallback={null}>
                <ProductRatingSummary productId={product.id} />
              </Suspense>

              {/* Title - SleepSaver styling */}
              <h1 className="font-manrope text-2xl font-semibold text-meliusly-dark lg:text-4xl">
                {product.title}
              </h1>
            </>
          ) : (
            <>
              {/* Internet's Favorite Sheets Badge */}
              {showFavoriteSheetsBadge && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-cgk-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cgk-gold">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  The Internet&apos;s Favorite Sheets
                </div>
              )}

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
            </>
          )}

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

          {/* Shop Pay Installment (SleepSaver only) */}
          {isSleepSaver && <ShopPayInstallment price={product.priceRange.minVariantPrice} />}

          {/* Product Description Bullets (SleepSaver only) */}
          {isSleepSaver && (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-meliusly-primary" strokeWidth={2} />
                <span className="font-manrope text-[15px] font-medium text-meliusly-dark">
                  Blocks metal bars across the entire sleeping surface
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-meliusly-primary" strokeWidth={2} />
                <span className="font-manrope text-[15px] font-medium text-meliusly-dark">
                  Stays in place and folds with the sofa bed
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-meliusly-primary" strokeWidth={2} />
                <span className="font-manrope text-[15px] font-medium text-meliusly-dark">
                  Installs easily without drilling or hardware
                </span>
              </div>
            </div>
          )}

          {/* Shipping / Tax Notice (non-SleepSaver) */}
          {!isSleepSaver && (
            <p className="text-xs text-muted-foreground">Shipping calculated at checkout</p>
          )}

          {/* SKU Display (non-SleepSaver) */}
          {!isSleepSaver && product.variants[0]?.sku && (
            <p className="text-xs text-muted-foreground">SKU: {product.variants[0].sku}</p>
          )}

          {/* Product Info Client Component (handles variant selection) */}
          <ProductInfo
            product={product}
            options={options}
            hasMultipleVariants={hasMultipleVariants}
            tenantSlug={tenant?.slug ?? 'unknown'}
            isSleepSaver={isSleepSaver}
          />

          {/* Trust Badges - Conditional rendering */}
          {isSleepSaver ? (
            <TrustBadges />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-2 rounded-lg bg-cgk-light-blue/20 px-3 py-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-cgk-charcoal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <span className="text-xs font-medium text-cgk-charcoal">Best Seller</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-cgk-light-blue/20 px-3 py-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-cgk-charcoal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.5 12c2-4 5-6 8.5-6s6.5 2 8.5 6c-2 4-5 6-8.5 6s-6.5-2-8.5-6z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 8c1.5-1 3-1.5 4.5-1.5M18 8c-1.5-1-3-1.5-4.5-1.5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 16c1 .5 2 .8 3 .8s2-.3 3-.8"
                    />
                  </svg>
                  <span className="text-xs font-medium text-cgk-charcoal">Breathable</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-cgk-light-blue/20 px-3 py-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-cgk-charcoal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 7h16M4 12h16M4 17h16"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 7v10M18 7v10"
                    />
                  </svg>
                  <span className="text-xs font-medium text-cgk-charcoal">Deep Pockets</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-cgk-light-blue/20 px-3 py-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-cgk-charcoal"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.5} />
                    <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v1.5M12 13.5V15M9.5 11H9M15 11h-.5M10 10l.5.5M14 14l.5-.5M14 10l-.5.5M10 14l-.5-.5"
                    />
                  </svg>
                  <span className="text-xs font-medium text-cgk-charcoal">Easy Care</span>
                </div>
              </div>

              {/* Inline Testimonial */}
              <div className="rounded-lg bg-cgk-light-blue/20 px-5 py-4">
                <div className="mb-1 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-4 w-4 text-cgk-gold"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm italic text-cgk-charcoal">
                  &ldquo;These sheets are absolutely fantastic! From the moment we put them on the
                  bed, they felt like true hotel-quality linens.&rdquo;
                </p>
                <p className="mt-1 text-xs font-semibold text-cgk-charcoal/70">
                  &mdash; Guy and Brandy
                </p>
              </div>

              {/* Free Shipping Note */}
              <p className="text-sm font-semibold text-cgk-gold">
                FREE 3-DAY DELIVERY FOR ORDERS OVER $50
              </p>
            </>
          )}

          {/* Product Information Tabs */}
          {isSleepSaver ? (
            <ProductSelectorTabs
              tabs={[
                {
                  title: 'Features',
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">SleeperSaver Features</h3>
                      <ul class="space-y-2 text-gray-600">
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Full coverage support across the entire sleeping surface</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Permanently installed solution that folds with your sofa bed</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Provides firm, even support without sagging or pressure points</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Compatible with most sleeper sofa brands and mattress pad sizes</span>
                        </li>
                      </ul>
                    </div>
                  `,
                },
                {
                  title: 'Installation',
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">Easy Installation</h3>
                      <ol class="space-y-2 text-gray-600 list-decimal list-inside">
                        <li>Open your sleeper sofa mattress pad and locate the metal bars</li>
                        <li>Position the SleeperSaver board under the mattress pad</li>
                        <li>Use the included hook and loop fasteners to secure in place</li>
                        <li>Fold the sofa bed closed to test - the board folds with the frame</li>
                      </ol>
                      <p class="text-sm text-gray-500 mt-4">No drilling or hardware required. Installation takes less than 5 minutes.</p>
                    </div>
                  `,
                },
                {
                  title: 'Sizing & Fit',
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">Size Guide</h3>
                      <table class="w-full text-sm border-collapse">
                        <thead>
                          <tr class="border-b border-gray-200">
                            <th class="py-2 px-3 text-left font-semibold">Size</th>
                            <th class="py-2 px-3 text-left font-semibold">Board Dimensions</th>
                            <th class="py-2 px-3 text-left font-semibold">Fits Mattress</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-600">
                          <tr class="border-b border-gray-100">
                            <td class="py-2 px-3">Twin</td>
                            <td class="py-2 px-3">36" x 72"</td>
                            <td class="py-2 px-3">Twin sleeper sofas</td>
                          </tr>
                          <tr class="border-b border-gray-100">
                            <td class="py-2 px-3">Full</td>
                            <td class="py-2 px-3">52" x 72"</td>
                            <td class="py-2 px-3">Full sleeper sofas</td>
                          </tr>
                          <tr class="border-b border-gray-100">
                            <td class="py-2 px-3">Queen</td>
                            <td class="py-2 px-3">58" x 72"</td>
                            <td class="py-2 px-3">Queen sleeper sofas</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  `,
                },
                {
                  title: 'Care',
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">Care Instructions</h3>
                      <ul class="space-y-2 text-gray-600">
                        <li>Wipe clean with a damp cloth as needed</li>
                        <li>Do not machine wash or submerge in water</li>
                        <li>Allow to air dry completely if it gets wet</li>
                        <li>Store flat when not in use (though it stays permanently installed)</li>
                      </ul>
                    </div>
                  `,
                },
                {
                  title: "What's Included",
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">Package Contents</h3>
                      <ul class="space-y-2 text-gray-600">
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>1x SleeperSaver Support Board (size selected)</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Hook and loop fastener strips for secure attachment</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <svg class="h-5 w-5 text-meliusly-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>Installation guide with step-by-step instructions</span>
                        </li>
                      </ul>
                    </div>
                  `,
                },
                {
                  title: 'Help',
                  content: `
                    <div class="space-y-3">
                      <h3 class="font-semibold text-meliusly-dark mb-2">Frequently Asked Questions</h3>
                      <div class="space-y-4">
                        <div>
                          <h4 class="font-medium text-meliusly-dark mb-1">Will this work with my sofa bed?</h4>
                          <p class="text-sm text-gray-600">The SleeperSaver works with most sleeper sofas. Measure your mattress pad to ensure proper fit.</p>
                        </div>
                        <div>
                          <h4 class="font-medium text-meliusly-dark mb-1">Can I remove it easily?</h4>
                          <p class="text-sm text-gray-600">Yes! The hook and loop fasteners allow for easy removal if needed.</p>
                        </div>
                        <div>
                          <h4 class="font-medium text-meliusly-dark mb-1">What if I need help?</h4>
                          <p class="text-sm text-gray-600">Contact our support team at support@meliusly.com for assistance.</p>
                        </div>
                      </div>
                    </div>
                  `,
                },
              ]}
            />
          ) : (
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
                        <tr class="border-b"><td class="py-2">Twin XL</td><td>66" x 102"</td><td>39" x 80" x 21"</td><td>1 Standard</td></tr>
                        <tr class="border-b"><td class="py-2">Full</td><td>81" x 96"</td><td>54" x 75" x 21"</td><td>2 Standard</td></tr>
                        <tr class="border-b"><td class="py-2">Queen</td><td>90" x 102"</td><td>60" x 80" x 21"</td><td>2 Standard</td></tr>
                        <tr class="border-b"><td class="py-2">King</td><td>108" x 102"</td><td>78" x 80" x 21"</td><td>2 King</td></tr>
                        <tr class="border-b"><td class="py-2">Cal King</td><td>108" x 102"</td><td>72" x 84" x 21"</td><td>2 King</td></tr>
                        <tr><td class="py-2">Split King</td><td>108" x 102"</td><td>2x 39" x 80" x 21"</td><td>2 King</td></tr>
                      </tbody>
                    </table>
                  `,
                },
                {
                  title: 'Shipping & Returns',
                  content:
                    "<p>Free standard shipping on orders over $50. Express 2-3 day shipping available. 30-day hassle-free returns — if you're not satisfied, we'll make it right.</p>",
                },
                {
                  title: 'Care Instructions',
                  content:
                    '<p>Machine wash cold on a gentle cycle. Tumble dry low. Remove promptly to minimize wrinkles. Do not bleach. Iron on low if needed.</p>',
                },
              ]}
            />
          )}

          {/* Social Share */}
          <SocialShare url={productUrl} title={product.title} image={product.images[0]?.url} />

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

      {/* Product Comparison Section (SleepSaver only) */}
      {isSleepSaver && (
        <section className="mt-20 md:mt-24">
          <Suspense
            fallback={
              <div className="animate-pulse space-y-4">
                <div className="mx-auto h-8 w-64 rounded bg-muted" />
                <div className="h-96 w-full rounded bg-muted" />
              </div>
            }
          >
            <ProductComparisonSection currentProduct={product} productType={product.productType} />
          </Suspense>
        </section>
      )}

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

      {/* Press Logos Marquee */}
      <div className="mt-16">
        <MarqueeLogos logos={PRESS_LOGOS} title="As Seen In" />
      </div>

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
        <RecentlyViewedSection currentProductId={product.id} tenantSlug={tenantSlug} />
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
    <a href="#reviews-heading" className="inline-flex items-center gap-2 text-sm hover:underline">
      <CompactStarRating rating={rating.averageRating} reviewCount={rating.totalReviews} />
    </a>
  )
}

/**
 * Product Comparison Section
 *
 * Shows current product compared to alternatives in the same category.
 * Fetches related products and displays them in a comparison table.
 */
async function ProductComparisonSection({
  currentProduct,
  productType,
}: {
  currentProduct: Product
  productType?: string
}) {
  const commerce = await getCommerceProvider()

  if (!commerce || !productType) {
    return null
  }

  // Fetch related products (same product type)
  const relatedProductsResult = await commerce.products.search(`product_type:${productType}`, {
    first: 6,
  })

  // Filter out current product and limit to 3 total products
  const alternativeProducts = relatedProductsResult.items
    .filter((p) => p.id !== currentProduct.id)
    .slice(0, 2)

  // If we don't have enough alternatives, don't show comparison
  if (alternativeProducts.length === 0) {
    return null
  }

  // Build products array: current product + alternatives
  const comparisonProducts = [currentProduct, ...alternativeProducts]

  // Define comparison features based on product type
  // For SleepSaver sofa bed support boards
  const features: ComparisonFeature[] = [
    {
      label: 'Installation Type',
      values: ['Permanently installed', 'Removable insert', 'Top layer pad'],
    },
    {
      label: 'Stays in Place',
      values: [true, false, false],
    },
    {
      label: 'Blocks Metal Bars',
      values: [true, true, false],
    },
    {
      label: 'Folds with Sofa Bed',
      values: [true, false, false],
    },
    {
      label: 'Supports Full Weight',
      values: [true, true, false],
    },
    {
      label: 'Installation Time',
      values: ['5 minutes', '10-15 minutes', '2 minutes'],
    },
    {
      label: 'Hardware Required',
      values: [false, true, false],
    },
    {
      label: 'Warranty',
      values: ['Lifetime', '1 year', '90 days'],
    },
  ]

  return (
    <ProductComparisonTable
      products={comparisonProducts}
      features={features}
      sectionTitle="Compare Our Sofa Bed Support Boards"
      currentProductId={currentProduct.id}
    />
  )
}
