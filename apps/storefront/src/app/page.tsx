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
} from '@/components/sections'
import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import { loadThemeForSSR, createTheme } from '@/lib/theme'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// CGK testimonial data
const TESTIMONIALS = [
  { name: 'Sarah M.', rating: 5, text: 'These are the softest sheets I\'ve ever owned. I\'ve tried expensive brands and nothing comes close to CGK.', product: '6-Piece Sheet Set' },
  { name: 'James K.', rating: 5, text: 'Worth every penny. The deep pockets actually fit my mattress and the sheets stay in place all night.', product: '6-Piece Sheet Set' },
  { name: 'Lisa R.', rating: 5, text: 'I bought these as a gift and now I need a set for myself. The quality is incredible for the price.', product: '6-Piece Sheet Set' },
  { name: 'Michael D.', rating: 5, text: 'Best purchase I\'ve made all year. These sheets are cool, comfortable, and look amazing on the bed.', product: 'Comforter Set' },
  { name: 'Amanda P.', rating: 5, text: 'I was skeptical about buying sheets online but these exceeded my expectations. So breathable!', product: '6-Piece Sheet Set' },
  { name: 'David W.', rating: 4, text: 'Great quality sheets. Took a few washes to get really soft but now they\'re perfect.', product: '6-Piece Sheet Set' },
  { name: 'Jennifer L.', rating: 5, text: 'We replaced all the sheets in our house with CGK. The colors are beautiful and they wash well.', product: '6-Piece Sheet Set' },
  { name: 'Robert T.', rating: 5, text: 'Finally found sheets that fit my extra deep mattress. The 21-inch deep pockets are a game changer.', product: '6-Piece Sheet Set' },
  { name: 'Emily C.', rating: 5, text: 'I\'m obsessed with how soft these are. My husband even noticed the difference. Five stars!', product: 'Blanket' },
  { name: 'Chris H.', rating: 5, text: 'Third time ordering. Once you try CGK sheets, you can\'t go back to anything else.', product: '6-Piece Sheet Set' },
]

const COLLECTIONS = [
  { title: '6-Piece Sheet Sets', href: '/collections/6-piece-sheet-sets' },
  { title: 'Bedding', href: '/collections/bedding' },
  { title: 'Featured', href: '/collections/featured' },
  { title: 'Blankets', href: '/collections/blankets' },
  { title: 'Comforters', href: '/collections/comforters' },
]

const PRESS_LOGOS: { src: string; alt: string }[] = []

const PRESS_ITEMS: { publication: string; quote: string; url?: string }[] = [
  { publication: 'Esquire', quote: 'CGK Linens sheets deliver luxury hotel quality at a fraction of the price.' },
  { publication: "Men's Health", quote: 'The best-selling sheets on Amazon live up to the hype.' },
  { publication: 'Good Housekeeping', quote: 'Incredibly soft, breathable, and durable — our testers were impressed.' },
  { publication: 'Real Simple', quote: 'A smart buy for anyone looking for high-quality sheets without the designer price tag.' },
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
        logoUrl={theme.logoUrl ? (theme.logoUrl.startsWith('http') ? theme.logoUrl : `${siteUrl}${theme.logoUrl}`) : null}
      />

      {/* Hero Banner */}
      <HeroBanner
        headline={`#1 Best Selling Sheets on Amazon`}
        subheadline="Premium bedding that's soft, breathable, and built to last. Experience the difference."
        ctaText="Shop Best Sellers"
        ctaHref="/collections/featured"
        secondaryCtaText="Browse Collections"
        secondaryCtaHref="/collections"
      />

      {/* Best Sellers */}
      <section className="py-16">
        <div className="mx-auto max-w-store px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cgk-navy">Best Sellers</h2>
              <p className="mt-1 text-gray-600">Our most popular products</p>
            </div>
            <a
              href="/collections/featured"
              className="text-sm font-medium text-cgk-navy hover:underline"
            >
              View All
            </a>
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
        description="Our sheets feature 21-inch deep pockets that fit mattresses up to 16 inches deep. No more popping off in the middle of the night. Stretchy, snug, and stays put — even on pillow-top mattresses."
        imageUrl="/images/deep-pocket-hero.jpg"
        ctaText="Shop Deep Pocket Sheets"
        ctaHref="/collections/6-piece-sheet-sets"
        imagePosition="left"
      />

      {/* Press Slider */}
      {PRESS_ITEMS.length > 0 && (
        <PressSlider items={PRESS_ITEMS} />
      )}

      {/* Press Logos */}
      {PRESS_LOGOS.length > 0 && (
        <MarqueeLogos
          logos={PRESS_LOGOS}
          title="As Seen In"
        />
      )}

      {/* Shop By Collection */}
      <CollectionGrid
        title="Shop By Collection"
        collections={COLLECTIONS}
      />

      {/* Testimonials */}
      <TestimonialCarousel testimonials={TESTIMONIALS} />

      {/* Newsletter CTA */}
      <section className="bg-cgk-light-blue/30 py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="text-2xl font-bold text-cgk-navy">
            Join the CGK Family
          </h2>
          <p className="mt-2 text-gray-600">
            Get 10% off your first order when you subscribe.
          </p>
          <form className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-btn border border-gray-300 bg-white px-4 py-3 text-sm focus:border-cgk-navy focus:outline-none focus:ring-2 focus:ring-cgk-navy/20"
              required
            />
            <button
              type="submit"
              className="rounded-btn bg-cgk-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cgk-navy/90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
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
      <ProductGrid
        products={result.items}
        columns={{ sm: 2, md: 3, lg: 4 }}
        priorityCount={4}
      />
    )
  } catch {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Unable to load products. Please check your store connection.
      </div>
    )
  }
}
