/**
 * JSON-LD Structured Data Components
 *
 * Reusable server components that render schema.org structured data
 * as <script type="application/ld+json"> tags for SEO.
 */

import type { Product, ProductVariant } from '@cgk-platform/commerce'

// ---------------------------------------------------------------------------
// Base Helper
// ---------------------------------------------------------------------------

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ---------------------------------------------------------------------------
// Product JSON-LD
// ---------------------------------------------------------------------------

interface ProductJsonLdProps {
  product: Product
  /** Brand name from tenant config */
  brandName: string
  /** Canonical URL for this product */
  url: string
  /** Optional aggregate rating data */
  rating?: {
    averageRating: number
    totalReviews: number
  } | null
}

/**
 * Renders Product + Offer structured data.
 * Includes aggregateRating when review data is provided.
 */
export function ProductJsonLd({ product, brandName, url, rating }: ProductJsonLdProps) {
  const firstVariant: ProductVariant | undefined = product.variants[0]

  const offers = product.variants.map((variant) => ({
    '@type': 'Offer' as const,
    url,
    priceCurrency: variant.price.currencyCode,
    price: variant.price.amount,
    availability: variant.availableForSale
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    ...(variant.sku ? { sku: variant.sku } : {}),
    ...(variant.title !== 'Default Title' ? { name: variant.title } : {}),
  }))

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length > 0
      ? { image: product.images.map((img) => img.url) }
      : {}),
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    ...(firstVariant?.sku ? { sku: firstVariant.sku } : {}),
    offers:
      offers.length === 1
        ? offers[0]
        : {
            '@type': 'AggregateOffer',
            lowPrice: product.priceRange.minVariantPrice.amount,
            highPrice: product.priceRange.maxVariantPrice.amount,
            priceCurrency: product.priceRange.minVariantPrice.currencyCode,
            offerCount: offers.length,
            offers,
          },
  }

  if (rating && rating.totalReviews > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.averageRating,
      reviewCount: rating.totalReviews,
    }
  }

  return <JsonLdScript data={data} />
}

// ---------------------------------------------------------------------------
// Breadcrumb JSON-LD
// ---------------------------------------------------------------------------

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[]
}

/**
 * Renders BreadcrumbList structured data.
 * The last item in the list is treated as the current page.
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <JsonLdScript data={data} />
}

// ---------------------------------------------------------------------------
// Collection JSON-LD
// ---------------------------------------------------------------------------

interface CollectionJsonLdProps {
  name: string
  description?: string
  url: string
}

/**
 * Renders CollectionPage structured data.
 */
export function CollectionJsonLd({ name, description, url }: CollectionJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    ...(description ? { description } : {}),
  }

  return <JsonLdScript data={data} />
}

// ---------------------------------------------------------------------------
// FAQ Page JSON-LD
// ---------------------------------------------------------------------------

interface FAQItem {
  question: string
  answer: string
}

interface FAQPageJsonLdProps {
  items: FAQItem[]
}

/**
 * Renders FAQPage structured data with all Q&A pairs.
 */
export function FAQPageJsonLd({ items }: FAQPageJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return <JsonLdScript data={data} />
}

// ---------------------------------------------------------------------------
// Organization JSON-LD
// ---------------------------------------------------------------------------

interface OrganizationJsonLdProps {
  name: string
  url: string
  logoUrl?: string | null
}

/**
 * Renders Organization structured data for the homepage.
 */
export function OrganizationJsonLd({ name, url, logoUrl }: OrganizationJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    ...(logoUrl ? { logo: logoUrl } : {}),
  }

  return <JsonLdScript data={data} />
}
