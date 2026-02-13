/**
 * ProductCard Component
 *
 * Displays a product in grid view with image, title, price, and quick actions.
 * Uses unified Commerce types for provider-agnostic rendering.
 */

import type { Product } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Image from 'next/image'
import Link from 'next/link'

interface ProductCardProps {
  product: Product
  /** Aspect ratio of the image container */
  aspectRatio?: 'square' | 'portrait' | 'landscape'
  /** Show vendor name */
  showVendor?: boolean
  /** Priority loading for above-the-fold images */
  priority?: boolean
  /** Custom class name */
  className?: string
}

export function ProductCard({
  product,
  aspectRatio = 'square',
  showVendor = false,
  priority = false,
  className,
}: ProductCardProps) {
  const {
    handle,
    title,
    vendor,
    images,
    priceRange,
    availableForSale,
    variants,
  } = product

  const primaryImage = images[0]
  const secondaryImage = images[1]

  const hasMultipleVariants = variants.length > 1
  const hasSalePrice = variants.some(
    (v) => v.compareAtPrice && parseFloat(v.compareAtPrice.amount) > parseFloat(v.price.amount)
  )

  // Calculate discount percentage for first variant with sale
  const saleVariant = variants.find(
    (v) => v.compareAtPrice && parseFloat(v.compareAtPrice.amount) > parseFloat(v.price.amount)
  )
  const discountPercent = saleVariant?.compareAtPrice
    ? Math.round(
        ((parseFloat(saleVariant.compareAtPrice.amount) - parseFloat(saleVariant.price.amount)) /
          parseFloat(saleVariant.compareAtPrice.amount)) *
          100
      )
    : 0

  const aspectRatioClass = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
  }[aspectRatio]

  return (
    <article
      className={cn(
        'group relative flex flex-col',
        className
      )}
    >
      {/* Image Container */}
      <Link
        href={`/products/${handle}`}
        className={cn(
          'relative overflow-hidden rounded-lg bg-muted',
          aspectRatioClass
        )}
      >
        {/* Primary Image */}
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText ?? title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              'object-cover transition-all duration-300',
              secondaryImage && 'group-hover:opacity-0'
            )}
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Secondary Image (hover reveal) */}
        {secondaryImage && (
          <Image
            src={secondaryImage.url}
            alt={secondaryImage.altText ?? `${title} - alternate view`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-all duration-300 group-hover:opacity-100"
          />
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {hasSalePrice && discountPercent > 0 && (
            <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              -{discountPercent}%
            </span>
          )}
          {!availableForSale && (
            <span className="rounded bg-gray-900/80 px-2 py-0.5 text-xs font-semibold text-white">
              Sold Out
            </span>
          )}
        </div>

        {/* Quick Actions (visible on hover) */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {hasMultipleVariants ? (
            <span className="block w-full rounded-md bg-white py-2 text-center text-sm font-medium text-gray-900">
              Select Options
            </span>
          ) : (
            <button
              type="button"
              className="block w-full rounded-md bg-white py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!availableForSale}
            >
              {availableForSale ? 'Quick Add' : 'Sold Out'}
            </button>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="mt-3 flex flex-col gap-1">
        {showVendor && vendor && (
          <span className="text-xs text-muted-foreground">{vendor}</span>
        )}

        <Link
          href={`/products/${handle}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {title}
        </Link>

        <PriceDisplay
          price={priceRange.minVariantPrice}
          compareAtPrice={saleVariant?.compareAtPrice}
          hasRange={
            priceRange.minVariantPrice.amount !== priceRange.maxVariantPrice.amount
          }
          maxPrice={priceRange.maxVariantPrice}
        />
      </div>
    </article>
  )
}

/**
 * Price Display Component
 */
interface PriceDisplayProps {
  price: { amount: string; currencyCode: string }
  compareAtPrice?: { amount: string; currencyCode: string }
  hasRange?: boolean
  maxPrice?: { amount: string; currencyCode: string }
}

function PriceDisplay({ price, compareAtPrice, hasRange, maxPrice }: PriceDisplayProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  })

  const currentPrice = parseFloat(price.amount)
  const originalPrice = compareAtPrice ? parseFloat(compareAtPrice.amount) : null
  const isOnSale = originalPrice && originalPrice > currentPrice

  if (hasRange && maxPrice) {
    return (
      <p className="text-sm">
        <span className="font-medium">
          {formatter.format(currentPrice)} - {formatter.format(parseFloat(maxPrice.amount))}
        </span>
      </p>
    )
  }

  return (
    <p className="flex items-center gap-2 text-sm">
      <span className={cn('font-medium', isOnSale && 'text-red-600')}>
        {formatter.format(currentPrice)}
      </span>
      {isOnSale && originalPrice && (
        <span className="text-muted-foreground line-through">
          {formatter.format(originalPrice)}
        </span>
      )}
    </p>
  )
}

export default ProductCard
