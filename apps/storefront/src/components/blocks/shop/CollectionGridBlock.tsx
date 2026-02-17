'use client'

/**
 * Collection Grid Block Component
 *
 * Displays products in a responsive grid layout with support for
 * quick view, wishlist, and add-to-cart functionality.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, CollectionGridConfig, CollectionProductItem } from '../types'
import { LucideIcon } from '../icons'
import { WishlistButton } from './WishlistButton'
import { QuickViewModal } from './QuickViewModal'

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
 * Product Card Component
 */
function ProductCard({
  product,
  showPrices,
  showAddToCart,
  showQuickView,
  showWishlist,
  onQuickView,
  index,
}: {
  product: CollectionProductItem
  showPrices: boolean
  showAddToCart: boolean
  showQuickView: boolean
  showWishlist: boolean
  onQuickView: (product: CollectionProductItem) => void
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0

  const primaryImage = product.images[0]
  const secondaryImage = product.images[1]

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border',
        'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
        'transition-all duration-300 ease-out',
        'hover:border-[hsl(var(--portal-primary))]/30 hover:shadow-xl',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[hsl(var(--portal-muted))]">
        {/* Primary Image */}
        {primaryImage?.src ? (
          <Image
            src={primaryImage.src}
            alt={primaryImage.alt || product.title}
            fill
            className={cn(
              'object-cover transition-all duration-500',
              secondaryImage && isHovered && 'opacity-0'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LucideIcon name="Package" className="h-12 w-12 text-[hsl(var(--portal-muted-foreground))]" />
          </div>
        )}

        {/* Secondary Image (hover) */}
        {secondaryImage?.src && (
          <Image
            src={secondaryImage.src}
            alt={secondaryImage.alt || product.title}
            fill
            className={cn(
              'absolute inset-0 object-cover transition-all duration-500',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {hasDiscount && (
            <span className="rounded-full bg-[hsl(var(--portal-destructive))] px-2.5 py-1 text-xs font-semibold text-white">
              -{discountPercentage}%
            </span>
          )}
          {!product.availableForSale && (
            <span className="rounded-full bg-[hsl(var(--portal-muted))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--portal-muted-foreground))]">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        {showWishlist && (
          <div className="absolute right-3 top-3">
            <WishlistButton
              productId={product.id}
              variant="icon"
              size="sm"
            />
          </div>
        )}

        {/* Quick Actions (shown on hover) */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 flex gap-2 p-4 transition-all duration-300',
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}
        >
          {showQuickView && (
            <button
              onClick={() => onQuickView(product)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5',
                'bg-white/95 text-[hsl(var(--portal-foreground))] backdrop-blur-sm',
                'font-medium shadow-lg transition-all',
                'hover:bg-white'
              )}
            >
              <LucideIcon name="Eye" className="h-4 w-4" />
              Quick View
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-4">
        {/* Vendor */}
        {product.vendor && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
            {product.vendor}
          </p>
        )}

        {/* Title */}
        <Link
          href={`/products/${product.handle}`}
          className="group/title"
        >
          <h3 className="line-clamp-2 text-base font-semibold text-[hsl(var(--portal-foreground))] transition-colors group-hover/title:text-[hsl(var(--portal-primary))]">
            {product.title}
          </h3>
        </Link>

        {/* Price */}
        {showPrices && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold text-[hsl(var(--portal-foreground))]">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
                {formatPrice(product.compareAtPrice!, product.currency)}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart */}
        {showAddToCart && product.availableForSale && (
          <button
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5',
              'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
              'font-medium transition-all',
              'hover:bg-[hsl(var(--portal-primary))]/90 hover:shadow-lg'
            )}
          >
            <LucideIcon name="ShoppingBag" className="h-4 w-4" />
            Add to Cart
          </button>
        )}

        {!product.availableForSale && (
          <button
            disabled
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5',
              'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]',
              'cursor-not-allowed font-medium'
            )}
          >
            Sold Out
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Product List Item Component (for list layout)
 */
function ProductListItem({
  product,
  showPrices,
  showAddToCart,
  showQuickView,
  showWishlist,
  onQuickView,
  index,
}: {
  product: CollectionProductItem
  showPrices: boolean
  showAddToCart: boolean
  showQuickView: boolean
  showWishlist: boolean
  onQuickView: (product: CollectionProductItem) => void
  index: number
}) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const primaryImage = product.images[0]

  return (
    <div
      className={cn(
        'group flex gap-6 rounded-xl border p-4',
        'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/30 hover:shadow-lg',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--portal-muted))]">
        {primaryImage?.src ? (
          <Image
            src={primaryImage.src}
            alt={primaryImage.alt || product.title}
            fill
            className="object-cover"
            sizes="128px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LucideIcon name="Package" className="h-8 w-8 text-[hsl(var(--portal-muted-foreground))]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col">
        {product.vendor && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
            {product.vendor}
          </p>
        )}

        <Link href={`/products/${product.handle}`}>
          <h3 className="text-lg font-semibold text-[hsl(var(--portal-foreground))] transition-colors hover:text-[hsl(var(--portal-primary))]">
            {product.title}
          </h3>
        </Link>

        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {product.description}
          </p>
        )}

        {showPrices && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold text-[hsl(var(--portal-foreground))]">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
                {formatPrice(product.compareAtPrice!, product.currency)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {showWishlist && (
          <WishlistButton productId={product.id} variant="icon" size="sm" />
        )}

        <div className="mt-auto flex gap-2">
          {showQuickView && (
            <button
              onClick={() => onQuickView(product)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2',
                'border border-[hsl(var(--portal-border))]',
                'text-sm font-medium text-[hsl(var(--portal-foreground))]',
                'transition-all hover:border-[hsl(var(--portal-primary))]'
              )}
            >
              <LucideIcon name="Eye" className="h-4 w-4" />
              Quick View
            </button>
          )}

          {showAddToCart && product.availableForSale && (
            <button
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2',
                'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                'text-sm font-medium transition-all',
                'hover:bg-[hsl(var(--portal-primary))]/90'
              )}
            >
              <LucideIcon name="ShoppingBag" className="h-4 w-4" />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Collection Grid Block Component
 */
export function CollectionGridBlock({ block, className }: BlockProps<CollectionGridConfig>) {
  const {
    headline,
    subheadline,
    products,
    columns = 3,
    layout = 'grid',
    showPrices = true,
    showAddToCart = true,
    showQuickView = true,
    showWishlist = true,
    emptyMessage = 'No products found',
    backgroundColor,
  } = block.config

  const [quickViewProduct, setQuickViewProduct] = useState<CollectionProductItem | null>(null)

  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mb-12 text-center">
            {subheadline && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Products */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LucideIcon
              name="Package"
              className="mb-4 h-16 w-16 text-[hsl(var(--portal-muted-foreground))]"
            />
            <p className="text-lg text-[hsl(var(--portal-muted-foreground))]">
              {emptyMessage}
            </p>
          </div>
        ) : layout === 'grid' ? (
          <div className={cn('grid gap-6', columnClasses[columns])}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                showPrices={showPrices}
                showAddToCart={showAddToCart}
                showQuickView={showQuickView}
                showWishlist={showWishlist}
                onQuickView={setQuickViewProduct}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product, index) => (
              <ProductListItem
                key={product.id}
                product={product}
                showPrices={showPrices}
                showAddToCart={showAddToCart}
                showQuickView={showQuickView}
                showWishlist={showWishlist}
                onQuickView={setQuickViewProduct}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

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
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
