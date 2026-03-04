/**
 * Homepage
 *
 * CGK Linens landing page with hero, best sellers, collections,
 * press logos, testimonials, and Instagram feed.
 */

import { headers } from 'next/headers'
import { Suspense } from 'react'

import { ProductGrid } from '@/components/products'
import { OrganizationJsonLd } from '@/components/seo/JsonLd'
import { getCommerceProvider } from '@/lib/commerce'
import {
  HeroBanner,
  ImageTextBlock,
  CollectionGrid,
  TestimonialCarousel,
  MarqueeLogos,
  PressSlider,
  InstagramFeed,
  IconTextBar,
  ReviewsSection,
} from '@/components/sections'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import { loadThemeForSSR, createTheme } from '@/lib/theme'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Real CGK customer reviews from Dawn Shopify theme
const TESTIMONIALS = [
  {
    name: 'Lauren K.',
    rating: 5,
    text: "I don't normally write reviews unless something is either really good or terrible. These sheets are AMAZING!! They are so soft & very comfortable. I have a mattress topper so finding Queen sheets that fit is so hard but these fit perfectly. I highly recommend them!",
    product: '6-Piece Sheet Set',
  },
  {
    name: 'Sara T.',
    rating: 5,
    text: 'Found these sheets while staying at a vacation rental. Never have we slept so good. Came home and ordered a set. Great price for the quality of the sheet!',
    product: '6-Piece Sheet Set',
  },
  {
    name: 'John C.',
    rating: 5,
    text: "My boyfriend has always preferred warm jersey or flannel sheets while I tend to sleep hot and love the feel of cooler, hotel-style bedding, but every set we tried would eventually pill and stretch out over the week. I ordered these on a whim and was immediately impressed by how soft, comfortable, and well-fitted they felt, and even after three months of regular washing and drying, they've stayed smooth with no pilling, shrinking, or signs of wear.",
    product: '6-Piece Sheet Set',
  },
  {
    name: 'Aria W.',
    rating: 5,
    text: 'I love these sheets! They are so soft and luxurious and wash up perfectly. They are thinner, however that is a bonus for me. We have a down comforter in the winter and in the summer they are nice and cooling.',
    product: '6-Piece Sheet Set',
  },
  {
    name: 'Gabi & Chaya',
    rating: 5,
    text: "These sheets are absolutely fantastic! From the moment I put them on the bed, they felt like true hotel-quality linens. The fabric is incredibly soft, breathable, and genuinely cooling — perfect for a comfortable night's sleep without overheating.",
    product: '6-Piece Sheet Set',
  },
]

/**
 * Fallback collection data when the commerce provider is unavailable.
 * When Shopify is connected, collections are fetched server-side with images.
 */
const FALLBACK_COLLECTIONS = [
  { title: '6-Piece Sheet Sets', href: '/collections/6-piece-sheet-sets' },
  { title: 'Bedding', href: '/collections/bedding' },
  { title: 'Featured', href: '/collections/featured' },
  { title: 'Blankets', href: '/collections/blankets' },
  { title: 'Comforters', href: '/collections/comforters' },
]

/** Handles to fetch from Shopify, in display order */
const COLLECTION_HANDLES = ['6-piece-sheet-sets', 'bedding', 'featured', 'blankets', 'comforters-1']

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

const PRESS_ITEMS: { publication: string; logoSrc?: string; quote: string; url?: string }[] = [
  {
    publication: 'Good Housekeeping',
    logoSrc: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Group_3686.webp',
    quote:
      'CGK Linens makes some of the most popular bedding, and this particular sheet set is the crown jewel in its lineup.',
  },
  {
    publication: 'Esquire',
    logoSrc: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Esquire_logo__1993_1.png',
    quote: 'Top-rated for the reason that they fit around almost anything.',
  },
  {
    publication: 'NBC Select',
    logoSrc: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Group_1.webp',
    quote: 'Fond of this set for its cooling effects, durability and anti-wrinkle properties.',
  },
  {
    publication: 'Real Simple',
    logoSrc: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Group_2.webp',
    quote:
      'If your current set feels scratchy or worn out, consider upgrading to the CGK Unlimited 4-Piece Sheet Set.',
  },
]

export default async function HomePage() {
  // Load tenant and theme for Organization structured data
  const tenant = await getTenantConfig()
  const tenantSlug = await getTenantSlug()
  let theme = createTheme(tenantSlug ?? 'default')
  if (tenantSlug) {
    try {
      theme = await loadThemeForSSR(tenantSlug)
    } catch {
      // Use default theme on error
    }
  }

  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = `${protocol}://${host}`

  return (
    <div>
      {/* Organization Structured Data */}
      <OrganizationJsonLd
        name={tenant?.name ?? 'Store'}
        url={siteUrl}
        logoUrl={
          theme.logoUrl
            ? theme.logoUrl.startsWith('http')
              ? theme.logoUrl
              : `${siteUrl}${theme.logoUrl}`
            : null
        }
      />

      {/* Hero Banner */}
      <HeroBanner
        headline="The #1 Best Selling Sheets on Amazon"
        subheadline="Trusted by Over 5 Million Sleepers a Year"
        ctaText="Shop Our Sheets"
        ctaHref="/collections/featured"
        desktopImageUrl="https://cgk-unlimited.myshopify.com/cdn/shop/files/Frame_3297.webp"
        mobileImageUrl="https://cgk-unlimited.myshopify.com/cdn/shop/files/Group_3714.jpg"
      />

      {/* Icon/Text Benefits Bar */}
      <IconTextBar />

      {/* Best Sellers */}
      <section className="py-16">
        <div className="mx-auto max-w-store px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cgk-navy">Shop Our Best Sellers</h2>
              <p className="mt-1 text-gray-600">Our most popular products</p>
            </div>
            <Link
              href="/collections/best-sellers"
              className="text-sm font-medium text-cgk-navy hover:underline"
            >
              Shop Our Sheets
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-square rounded-lg bg-gray-200" />
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            }
          >
            <FeaturedProducts />
          </Suspense>
        </div>
      </section>

      {/* Image + Text: Size Matters */}
      <ImageTextBlock
        title="Size Matters"
        description='The deepest, best-fitting sheets on the internet — up to 21" deep. Our 21" deep-pocket sheets are made to fit thick mattresses, toppers, and adjustable beds. No popping corners, no constant retucking. Just a smooth, snug fit that stays put all night.'
        imageUrl="https://cgk-unlimited.myshopify.com/cdn/shop/files/Mauve_1.webp"
        ctaText="Shop Extra Deep Sheets"
        ctaHref="/products/21-inch-6-piece-sheet-set"
        imagePosition="left"
      />

      {/* Press Slider */}
      {PRESS_ITEMS.length > 0 && <PressSlider items={PRESS_ITEMS} />}

      {/* Press Logos */}
      {PRESS_LOGOS.length > 0 && <MarqueeLogos logos={PRESS_LOGOS} title="As Seen In" />}

      {/* Shop By Collection */}
      <Suspense
        fallback={<CollectionGrid title="Shop By Collection" collections={FALLBACK_COLLECTIONS} />}
      >
        <FeaturedCollections />
      </Suspense>

      {/* Testimonials */}
      <TestimonialCarousel
        title={'The Sheets Everyone\n(and Their Mom) Are Talking About'}
        subtitle="Trusted by Over 5 Million Sleepers a Year"
        testimonials={TESTIMONIALS}
        ctaText="See Why Everyone's Obsessed"
        ctaHref="/collections/featured#reviews"
      />

      {/* Reviews Section */}
      <ReviewsSection />

      {/* Newsletter CTA */}
      <section className="bg-cgk-light-blue/30 py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="text-2xl font-bold text-cgk-navy">Join the CGK Family</h2>
          <p className="mt-2 text-gray-600">Get 10% off your first order when you subscribe.</p>
          <NewsletterForm variant="inline" className="mt-6" />
        </div>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed
        images={[
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Screenshot_2025-11-04_at_15.22.01.webp',
            alt: 'CGK Linens bedroom',
          },
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Screenshot_2025-11-04_at_15.22.20.webp',
            alt: 'CGK Linens sheets',
          },
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Screenshot_2025-11-04_at_15.22.28.webp',
            alt: 'CGK Linens bedding',
          },
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Screenshot_2025-11-04_at_15.22.33.webp',
            alt: 'CGK Linens home',
          },
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/Screenshot_2025-11-04_at_15.22.07.webp',
            alt: 'CGK Linens lifestyle',
          },
          {
            src: 'https://cgk-unlimited.myshopify.com/cdn/shop/files/1cbb170336db27d8920ac2ffaf6bcd9b6a518fc0.webp',
            alt: 'CGK Linens collection',
          },
        ]}
        handle="@CGKLINENS"
      />
    </div>
  )
}

async function FeaturedProducts() {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Configure your Shopify store connection to display products here.
      </div>
    )
  }

  try {
    const result = await commerce.products.list({
      first: 8,
      sortKey: 'BEST_SELLING',
    })

    if (result.items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No products available yet.
        </div>
      )
    }

    return (
      <ProductGrid products={result.items} columns={{ sm: 2, md: 3, lg: 4 }} priorityCount={4} />
    )
  } catch {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Unable to load products. Please check your store connection.
      </div>
    )
  }
}

/**
 * Fetch collections from Shopify with images for the CollectionGrid.
 * Falls back to static collection data if the commerce provider is unavailable.
 */
async function FeaturedCollections() {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return <CollectionGrid title="Shop By Collection" collections={FALLBACK_COLLECTIONS} />
  }

  try {
    // Fetch each collection by handle to get its image
    const collectionResults = await Promise.all(
      COLLECTION_HANDLES.map((handle) => commerce.collections.getByHandle(handle))
    )

    // Map fetched collections to CollectionGrid format, filtering out nulls
    const collections = collectionResults
      .filter((c) => c !== null)
      .map((c) => ({
        title: c.title,
        href: `/collections/${c.handle}`,
        imageUrl: c.image?.url,
      }))

    // Fall back to static data if no collections were found
    if (collections.length === 0) {
      return <CollectionGrid title="Shop By Collection" collections={FALLBACK_COLLECTIONS} />
    }

    return <CollectionGrid title="Shop By Collection" collections={collections} />
  } catch {
    // On error, render with static fallback data
    return <CollectionGrid title="Shop By Collection" collections={FALLBACK_COLLECTIONS} />
  }
}
