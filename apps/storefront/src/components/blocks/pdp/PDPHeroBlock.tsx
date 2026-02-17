'use client'

/**
 * PDP Hero Block Component
 *
 * Main product hero section with image gallery, product info,
 * variant selector, and add to cart functionality.
 */

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, PDPHeroConfig, ImageConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Format price with currency
 */
function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

/**
 * Star rating component
 */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <LucideIcon
          key={star}
          name="Star"
          className={cn(
            sizeClasses[size],
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : star <= Math.ceil(rating) && rating % 1 !== 0
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted))]'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Image gallery component
 */
function ImageGallery({
  images,
  layout,
}: {
  images: ImageConfig[]
  layout: 'grid' | 'carousel' | 'stacked'
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedImage = images[selectedIndex] || images[0]

  if (!images.length) {
    return (
      <div className="aspect-square rounded-2xl bg-[hsl(var(--portal-muted))] flex items-center justify-center">
        <LucideIcon name="Image" className="h-16 w-16 text-[hsl(var(--portal-muted-foreground))]" />
      </div>
    )
  }

  if (layout === 'carousel') {
    return (
      <div className="space-y-4">
        {/* Main image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[hsl(var(--portal-muted))]">
          {selectedImage && (
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt || 'Product image'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg',
                  'border-2 transition-all duration-200',
                  index === selectedIndex
                    ? 'border-[hsl(var(--portal-primary))] ring-2 ring-[hsl(var(--portal-primary))]/20'
                    : 'border-transparent hover:border-[hsl(var(--portal-border))]'
                )}
              >
                <Image
                  src={image.src}
                  alt={image.alt || `Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (layout === 'stacked') {
    return (
      <div className="space-y-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square overflow-hidden rounded-2xl bg-[hsl(var(--portal-muted))]"
          >
            <Image
              src={image.src}
              alt={image.alt || `Product image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={index === 0}
            />
          </div>
        ))}
      </div>
    )
  }

  // Grid layout (default)
  return (
    <div className="grid gap-4 grid-cols-2">
      {images.slice(0, 4).map((image, index) => (
        <div
          key={index}
          className={cn(
            'relative overflow-hidden rounded-xl bg-[hsl(var(--portal-muted))]',
            index === 0 && 'col-span-2 aspect-[4/3]',
            index > 0 && 'aspect-square'
          )}
        >
          <Image
            src={image.src}
            alt={image.alt || `Product image ${index + 1}`}
            fill
            className="object-cover"
            sizes={index === 0 ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Quantity selector component
 */
function QuantitySelector({
  quantity,
  onQuantityChange,
}: {
  quantity: number
  onQuantityChange: (qty: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-[hsl(var(--portal-foreground))]">Quantity</span>
      <div className="flex items-center rounded-lg border border-[hsl(var(--portal-border))]">
        <button
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          className="flex h-10 w-10 items-center justify-center text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
          aria-label="Decrease quantity"
        >
          <LucideIcon name="Minus" className="h-4 w-4" />
        </button>
        <span className="w-12 text-center font-medium text-[hsl(var(--portal-foreground))]">
          {quantity}
        </span>
        <button
          onClick={() => onQuantityChange(quantity + 1)}
          className="flex h-10 w-10 items-center justify-center text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
          aria-label="Increase quantity"
        >
          <LucideIcon name="Plus" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * PDP Hero Block Component
 */
export function PDPHeroBlock({ block, className }: BlockProps<PDPHeroConfig>) {
  const {
    product,
    showBreadcrumbs = true,
    showRatings = true,
    averageRating = 0,
    totalReviews = 0,
    showQuantitySelector = true,
    showAddToCart = true,
    showWishlist = true,
    showShareButtons = true,
    galleryLayout = 'carousel',
    backgroundColor,
  } = block.config

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  // Get current variant based on selected options
  const currentVariant = product?.variants?.find((variant) =>
    Object.entries(selectedOptions).every(
      ([key, value]) => variant.options[key] === value
    )
  ) || product?.variants?.[0]

  const currentPrice = currentVariant?.price ?? product?.price ?? 0
  const compareAtPrice = product?.compareAtPrice
  const hasDiscount = compareAtPrice && compareAtPrice > currentPrice
  const discountPercent = hasDiscount
    ? Math.round((1 - currentPrice / compareAtPrice) * 100)
    : 0

  return (
    <section
      className={cn('py-8 sm:py-12', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <nav className="mb-6 flex items-center gap-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
            <a href="/" className="hover:text-[hsl(var(--portal-foreground))] transition-colors">
              Home
            </a>
            <LucideIcon name="ChevronRight" className="h-4 w-4" />
            <a href="/shop" className="hover:text-[hsl(var(--portal-foreground))] transition-colors">
              Shop
            </a>
            {product?.title && (
              <>
                <LucideIcon name="ChevronRight" className="h-4 w-4" />
                <span className="text-[hsl(var(--portal-foreground))]">{product.title}</span>
              </>
            )}
          </nav>
        )}

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="animate-fade-in">
            <ImageGallery
              images={product?.images || []}
              layout={galleryLayout}
            />
          </div>

          {/* Product Info */}
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="sticky top-8">
              {/* Title */}
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {product?.title || 'Product Name'}
              </h1>

              {/* Ratings */}
              {showRatings && averageRating > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <StarRating rating={averageRating} size="md" />
                  <span className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                    ({totalReviews.toLocaleString()} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[hsl(var(--portal-foreground))]">
                  {formatPrice(currentPrice, product?.currency)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-[hsl(var(--portal-muted-foreground))] line-through">
                      {formatPrice(compareAtPrice, product?.currency)}
                    </span>
                    <span className="rounded-full bg-[hsl(var(--portal-destructive))]/10 px-3 py-1 text-sm font-semibold text-[hsl(var(--portal-destructive))]">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {product?.description && (
                <p className="mt-6 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Variant Options */}
              {product?.options && product.options.length > 0 && (
                <div className="mt-8 space-y-6">
                  {product.options.map((option) => (
                    <div key={option.name}>
                      <label className="block text-sm font-medium text-[hsl(var(--portal-foreground))] mb-3">
                        {option.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => (
                          <button
                            key={value}
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [option.name]: value,
                              }))
                            }
                            className={cn(
                              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                              'border',
                              selectedOptions[option.name] === value
                                ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))] text-white'
                                : 'border-[hsl(var(--portal-border))] text-[hsl(var(--portal-foreground))] hover:border-[hsl(var(--portal-primary))]'
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="mt-8 space-y-4">
                {showQuantitySelector && (
                  <QuantitySelector quantity={quantity} onQuantityChange={setQuantity} />
                )}

                <div className="flex gap-3">
                  {showAddToCart && (
                    <button
                      className={cn(
                        'flex-1 rounded-lg px-6 py-4 font-semibold transition-all duration-300',
                        'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                        'hover:bg-[hsl(var(--portal-primary))]/90',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--portal-primary))] focus-visible:ring-offset-2',
                        'shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                      )}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <LucideIcon name="ShoppingCart" className="h-5 w-5" />
                        Add to Cart
                      </span>
                    </button>
                  )}

                  {showWishlist && (
                    <button
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-lg transition-all duration-200',
                        'border border-[hsl(var(--portal-border))]',
                        'text-[hsl(var(--portal-muted-foreground))]',
                        'hover:border-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary))]'
                      )}
                      aria-label="Add to wishlist"
                    >
                      <LucideIcon name="Heart" className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Share Buttons */}
              {showShareButtons && (
                <div className="mt-8 flex items-center gap-4 border-t border-[hsl(var(--portal-border))] pt-8">
                  <span className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
                    Share:
                  </span>
                  <div className="flex gap-2">
                    {['Facebook', 'Twitter', 'Linkedin', 'Link'].map((platform) => (
                      <button
                        key={platform}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
                          'bg-[hsl(var(--portal-muted))]',
                          'text-[hsl(var(--portal-muted-foreground))]',
                          'hover:bg-[hsl(var(--portal-primary))] hover:text-white'
                        )}
                        aria-label={`Share on ${platform}`}
                      >
                        <LucideIcon name={platform} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
