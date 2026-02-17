'use client'

/**
 * Product Lineup Block Component
 *
 * Displays products in a grid with comparison option, price display,
 * and add-to-cart functionality. Supports featured product highlighting.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig, ButtonConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Product item configuration
 */
export interface ProductLineupItem {
  id: string
  title: string
  description?: string
  price: number
  compareAtPrice?: number
  currency?: string
  image?: ImageConfig
  href?: string
  badge?: string
  isFeatured?: boolean
  features?: string[]
  rating?: number
  reviewCount?: number
}

/**
 * Product Lineup block configuration
 */
export interface ProductLineupBlockConfig {
  headline?: string
  subheadline?: string
  description?: string
  products: ProductLineupItem[]
  columns?: 2 | 3 | 4
  showCompareButton?: boolean
  showAddToCart?: boolean
  showPrices?: boolean
  showRatings?: boolean
  layout?: 'grid' | 'carousel'
  featuredPosition?: 'start' | 'center' | 'end'
  ctaButton?: ButtonConfig
  backgroundColor?: string
}

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
 * Star rating display
 */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
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
              : 'fill-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted))]'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Product card component
 */
function ProductCard({
  product,
  showPrice = true,
  showAddToCart = true,
  showRating = true,
  isSelected = false,
  onSelect,
  index,
}: {
  product: ProductLineupItem
  showPrice?: boolean
  showAddToCart?: boolean
  showRating?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  index: number
}) {
  const { currency = 'USD' } = product
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl',
        'bg-[hsl(var(--portal-card))]',
        'border transition-all duration-300',
        product.isFeatured
          ? 'border-[hsl(var(--portal-primary))] shadow-lg shadow-[hsl(var(--portal-primary))]/10'
          : 'border-[hsl(var(--portal-border))]',
        'hover:shadow-xl hover:-translate-y-1',
        isSelected && 'ring-2 ring-[hsl(var(--portal-primary))]',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Featured badge */}
      {product.isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'text-xs font-bold uppercase tracking-wider',
              'shadow-lg'
            )}
          >
            <LucideIcon name="Star" className="h-3 w-3 fill-current" />
            Best Seller
          </span>
        </div>
      )}

      {/* Discount badge */}
      {hasDiscount && !product.isFeatured && (
        <div className="absolute top-4 left-4 z-10">
          <span
            className={cn(
              'inline-flex px-3 py-1 rounded-full',
              'bg-red-500 text-white',
              'text-xs font-bold'
            )}
          >
            -{discountPercent}%
          </span>
        </div>
      )}

      {/* Custom badge */}
      {product.badge && !hasDiscount && !product.isFeatured && (
        <div className="absolute top-4 left-4 z-10">
          <span
            className={cn(
              'inline-flex px-3 py-1 rounded-full',
              'bg-[hsl(var(--portal-accent))] text-[hsl(var(--portal-accent-foreground))]',
              'text-xs font-semibold'
            )}
          >
            {product.badge}
          </span>
        </div>
      )}

      {/* Compare checkbox */}
      {onSelect && (
        <button
          onClick={() => onSelect(product.id)}
          className="absolute top-4 right-4 z-10"
          aria-label={isSelected ? 'Remove from compare' : 'Add to compare'}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md',
              'border-2 transition-all duration-200',
              isSelected
                ? 'bg-[hsl(var(--portal-primary))] border-[hsl(var(--portal-primary))]'
                : 'bg-white/80 border-[hsl(var(--portal-border))] hover:border-[hsl(var(--portal-primary))]'
            )}
          >
            {isSelected && <LucideIcon name="Check" className="h-4 w-4 text-white" />}
          </div>
        </button>
      )}

      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-[hsl(var(--portal-muted))]">
        {product.image?.src ? (
          <Image
            src={product.image.src}
            alt={product.image.alt || product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <LucideIcon
              name="Package"
              className="h-16 w-16 text-[hsl(var(--portal-muted-foreground))]/30"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Rating */}
        {showRating && product.rating !== undefined && (
          <div className="mb-2 flex items-center gap-2">
            <StarRating rating={product.rating} />
            {product.reviewCount !== undefined && (
              <span className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-[hsl(var(--portal-foreground))] text-lg leading-tight">
          {product.href ? (
            <Link href={product.href} className="hover:text-[hsl(var(--portal-primary))] transition-colors">
              {product.title}
            </Link>
          ) : (
            product.title
          )}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))] line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {product.features.slice(0, 3).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
                <LucideIcon name="Check" className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Price */}
        {showPrice && (
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[hsl(var(--portal-foreground))]">
              {formatPrice(product.price, currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
                {formatPrice(product.compareAtPrice!, currency)}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart button */}
        {showAddToCart && (
          <button
            className={cn(
              'mt-4 w-full flex items-center justify-center gap-2',
              'px-4 py-3 rounded-lg font-semibold',
              'transition-all duration-300',
              product.isFeatured
                ? cn(
                    'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                    'hover:bg-[hsl(var(--portal-primary))]/90',
                    'shadow-lg shadow-[hsl(var(--portal-primary))]/20'
                  )
                : cn(
                    'bg-[hsl(var(--portal-muted))]',
                    'hover:bg-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary-foreground))]'
                  )
            )}
          >
            <LucideIcon name="ShoppingCart" className="h-4 w-4" />
            Add to Cart
          </button>
        )}
      </div>
    </article>
  )
}

/**
 * Product Lineup Block Component
 */
export function ProductLineupBlock({ block, className }: BlockProps<ProductLineupBlockConfig>) {
  const {
    headline,
    subheadline,
    description,
    products,
    columns = 3,
    showCompareButton = false,
    showAddToCart = true,
    showPrices = true,
    showRatings = true,
    backgroundColor,
  } = block.config

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else if (next.size < 4) {
        next.add(productId)
      }
      return next
    })
  }

  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline || description) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Compare bar */}
        {showCompareButton && selectedProducts.size > 1 && (
          <div className="mb-8 flex items-center justify-center">
            <button
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-full',
                'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                'font-semibold shadow-lg',
                'hover:bg-[hsl(var(--portal-primary))]/90',
                'transition-all duration-300'
              )}
            >
              <LucideIcon name="GitCompare" className="h-5 w-5" />
              Compare {selectedProducts.size} Products
            </button>
          </div>
        )}

        {/* Products grid */}
        <div className={cn('grid gap-6', columnClasses[columns])}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              showPrice={showPrices}
              showAddToCart={showAddToCart}
              showRating={showRatings}
              isSelected={selectedProducts.has(product.id)}
              onSelect={showCompareButton ? handleSelectProduct : undefined}
              index={index}
            />
          ))}
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
      `}</style>
    </section>
  )
}
