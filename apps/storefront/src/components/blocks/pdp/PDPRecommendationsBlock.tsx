'use client'

/**
 * PDP Recommendations Block Component
 *
 * Displays related products, upsells, cross-sells, or recently viewed items.
 * Supports grid and carousel layouts.
 */

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, PDPRecommendationsConfig, RecommendationItem } from '../types'
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
 * Product card component
 */
function ProductCard({
  product,
  index,
  showPrices,
  showAddToCart,
}: {
  product: RecommendationItem
  index: number
  showPrices: boolean
  showAddToCart: boolean
}) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > (product.price || 0)
  const discountPercent = hasDiscount && product.price
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/20 hover:shadow-lg',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[hsl(var(--portal-muted))]">
        {product.image?.src ? (
          <Image
            src={product.image.src}
            alt={product.image.alt || product.title || 'Product'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LucideIcon
              name="Image"
              className="h-12 w-12 text-[hsl(var(--portal-muted-foreground))]"
            />
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <div className="absolute left-3 top-3">
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
                'bg-[hsl(var(--portal-primary))] text-white',
                'shadow-md'
              )}
            >
              {product.badge}
            </span>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute right-3 top-3">
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
                'bg-[hsl(var(--portal-destructive))] text-white',
                'shadow-md'
              )}
            >
              -{discountPercent}%
            </span>
          </div>
        )}

        {/* Quick add button */}
        {showAddToCart && (
          <div
            className={cn(
              'absolute inset-x-3 bottom-3',
              'translate-y-4 opacity-0 transition-all duration-300',
              'group-hover:translate-y-0 group-hover:opacity-100'
            )}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Add to cart logic would go here
              }}
              className={cn(
                'w-full rounded-lg py-2.5 text-sm font-semibold',
                'bg-[hsl(var(--portal-primary))] text-white',
                'shadow-lg transition-all duration-200',
                'hover:bg-[hsl(var(--portal-primary))]/90'
              )}
            >
              Quick Add
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-[hsl(var(--portal-foreground))] line-clamp-2 group-hover:text-[hsl(var(--portal-primary))] transition-colors">
          {product.title || 'Product Name'}
        </h3>

        {showPrices && product.price !== undefined && (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (product.href) {
    return (
      <Link href={product.href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

/**
 * Carousel navigation button
 */
function CarouselButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'shadow-md transition-all duration-200',
        'hover:border-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]',
        'hover:text-white hover:shadow-lg',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'disabled:hover:bg-[hsl(var(--portal-card))] disabled:hover:border-[hsl(var(--portal-border))]',
        'disabled:hover:text-inherit'
      )}
      aria-label={direction === 'prev' ? 'Previous products' : 'Next products'}
    >
      <LucideIcon
        name={direction === 'prev' ? 'ChevronLeft' : 'ChevronRight'}
        className="h-5 w-5"
      />
    </button>
  )
}

/**
 * PDP Recommendations Block Component
 */
export function PDPRecommendationsBlock({ block, className }: BlockProps<PDPRecommendationsConfig>) {
  const {
    headline,
    subheadline,
    products = [],
    layout = 'grid',
    columns = 4,
    showPrices = true,
    showAddToCart = true,
    backgroundColor,
  } = block.config

  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    updateScrollButtons()
    const carousel = carouselRef.current
    if (carousel && layout === 'carousel') {
      carousel.addEventListener('scroll', updateScrollButtons)
      window.addEventListener('resize', updateScrollButtons)
      return () => {
        carousel.removeEventListener('scroll', updateScrollButtons)
        window.removeEventListener('resize', updateScrollButtons)
      }
    }
  }, [layout])

  const scroll = (direction: 'prev' | 'next') => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.querySelector('& > *')?.clientWidth || 280
      const scrollAmount = direction === 'next' ? cardWidth + 24 : -(cardWidth + 24)
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!products || products.length === 0) {
    return null
  }

  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            {subheadline && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-3xl">
                {headline}
              </h2>
            )}
          </div>

          {/* Carousel navigation in header for carousel layout */}
          {layout === 'carousel' && products.length > columns && (
            <div className="hidden gap-2 sm:flex">
              <CarouselButton
                direction="prev"
                onClick={() => scroll('prev')}
                disabled={!canScrollLeft}
              />
              <CarouselButton
                direction="next"
                onClick={() => scroll('next')}
                disabled={!canScrollRight}
              />
            </div>
          )}
        </div>

        {/* Grid layout */}
        {layout === 'grid' && (
          <div className={cn('grid gap-6', columnClasses[columns])}>
            {products.map((product, index) => (
              <ProductCard
                key={product.productId}
                product={product}
                index={index}
                showPrices={showPrices}
                showAddToCart={showAddToCart}
              />
            ))}
          </div>
        )}

        {/* Carousel layout */}
        {layout === 'carousel' && (
          <div className="relative">
            <div
              ref={carouselRef}
              className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 scrollbar-hide sm:-mx-8 sm:px-8"
            >
              {products.map((product, index) => (
                <div
                  key={product.productId}
                  className={cn(
                    'w-[280px] shrink-0 snap-start',
                    'sm:w-[calc((100%-72px)/4)]'
                  )}
                >
                  <ProductCard
                    product={product}
                    index={index}
                    showPrices={showPrices}
                    showAddToCart={showAddToCart}
                  />
                </div>
              ))}
            </div>

            {/* Mobile navigation */}
            {products.length > 1 && (
              <div className="mt-6 flex justify-center gap-3 sm:hidden">
                <CarouselButton
                  direction="prev"
                  onClick={() => scroll('prev')}
                  disabled={!canScrollLeft}
                />
                <CarouselButton
                  direction="next"
                  onClick={() => scroll('next')}
                  disabled={!canScrollRight}
                />
              </div>
            )}
          </div>
        )}
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
