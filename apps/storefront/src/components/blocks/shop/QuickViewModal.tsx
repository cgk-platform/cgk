'use client'

/**
 * Quick View Modal Component
 *
 * Modal component for quick product preview without leaving the current page.
 * Supports variant selection, quantity, add to cart, and wishlist functionality.
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { CollectionProductItem, QuickViewModalConfig } from '../types'
import { LucideIcon } from '../icons'
import { WishlistButton } from './WishlistButton'

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
 * Props for QuickViewModal
 */
export interface QuickViewModalProps {
  product: CollectionProductItem
  isOpen: boolean
  onClose: () => void
  config?: QuickViewModalConfig
}

/**
 * Quantity Selector Component
 */
function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center rounded-lg border border-[hsl(var(--portal-border))]">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'flex h-10 w-10 items-center justify-center transition-colors',
          'hover:bg-[hsl(var(--portal-muted))]',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Decrease quantity"
      >
        <LucideIcon name="Minus" className="h-4 w-4" />
      </button>
      <span className="flex h-10 w-12 items-center justify-center text-sm font-medium">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'flex h-10 w-10 items-center justify-center transition-colors',
          'hover:bg-[hsl(var(--portal-muted))]',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Increase quantity"
      >
        <LucideIcon name="Plus" className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Image Gallery Component
 */
function ImageGallery({
  images,
  layout = 'gallery',
}: {
  images: CollectionProductItem['images']
  layout?: 'single' | 'gallery' | 'thumbnails'
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-[hsl(var(--portal-muted))]">
        <LucideIcon name="Package" className="h-16 w-16 text-[hsl(var(--portal-muted-foreground))]" />
      </div>
    )
  }

  const firstImage = images[0]
  const activeImage = images[activeIndex]

  if (layout === 'single' || images.length === 1) {
    if (!firstImage) return null
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[hsl(var(--portal-muted))]">
        <Image
          src={firstImage.src}
          alt={firstImage.alt || 'Product image'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    )
  }

  if (layout === 'thumbnails') {
    if (!activeImage) return null
    return (
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[hsl(var(--portal-muted))]">
          <Image
            src={activeImage.src}
            alt={activeImage.alt || 'Product image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg',
                'transition-all',
                activeIndex === index
                  ? 'ring-2 ring-[hsl(var(--portal-primary))] ring-offset-2'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <Image
                src={image.src}
                alt={image.alt || 'Product thumbnail'}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Gallery layout (grid)
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.slice(0, 4).map((image, index) => (
        <div
          key={index}
          className={cn(
            'relative overflow-hidden rounded-xl bg-[hsl(var(--portal-muted))]',
            index === 0 && images.length > 2 && 'col-span-2'
          )}
        >
          <div className="aspect-square">
            <Image
              src={image.src}
              alt={image.alt || 'Product image'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Variant Selector Component
 */
function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
}: {
  variants: CollectionProductItem['variants']
  selectedVariantId: string | null
  onSelect: (variantId: string) => void
}) {
  if (!variants || variants.length <= 1) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[hsl(var(--portal-foreground))]">
        Variant
      </label>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => onSelect(variant.id)}
            disabled={!variant.availableForSale}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
              selectedVariantId === variant.id
                ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))] text-white'
                : 'border-[hsl(var(--portal-border))] text-[hsl(var(--portal-foreground))] hover:border-[hsl(var(--portal-primary))]',
              !variant.availableForSale && 'cursor-not-allowed opacity-50 line-through'
            )}
          >
            {variant.title}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Quick View Modal Component
 */
export function QuickViewModal({
  product,
  isOpen,
  onClose,
  config = {},
}: QuickViewModalProps) {
  const {
    showAddToCart = true,
    showVariantSelector = true,
    showQuantitySelector = true,
    showWishlist = true,
    showShare = true,
    showViewFullDetails = true,
    imageLayout = 'gallery',
  } = config

  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants?.[0]?.id || null
  )

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId)
  const currentPrice = selectedVariant?.price ?? product.price
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > currentPrice
  const isAvailable = selectedVariant?.availableForSale ?? product.availableForSale

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isOpen) {
      setQuantity(1)
      setSelectedVariantId(product.variants?.[0]?.id || null)
    }
  }, [isOpen, product])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/products/${product.handle}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description || product.title,
          url,
        })
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url)
      // Could show a toast here
    }
  }, [product])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto',
          'rounded-2xl bg-[hsl(var(--portal-card))] shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-300'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center',
            'rounded-full bg-[hsl(var(--portal-background))]/80 backdrop-blur-sm',
            'text-[hsl(var(--portal-foreground))] transition-all',
            'hover:bg-[hsl(var(--portal-background))] hover:shadow-lg'
          )}
          aria-label="Close quick view"
        >
          <LucideIcon name="X" className="h-5 w-5" />
        </button>

        <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
          {/* Images */}
          <div>
            <ImageGallery images={product.images} layout={imageLayout} />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Vendor */}
            {product.vendor && (
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
                {product.vendor}
              </p>
            )}

            {/* Title */}
            <h2
              id="quick-view-title"
              className="text-2xl font-bold text-[hsl(var(--portal-foreground))] sm:text-3xl"
            >
              {product.title}
            </h2>

            {/* Price */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl font-bold text-[hsl(var(--portal-foreground))]">
                {formatPrice(currentPrice, product.currency)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-[hsl(var(--portal-muted-foreground))] line-through">
                    {formatPrice(product.compareAtPrice!, product.currency)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--portal-destructive))] px-2.5 py-1 text-xs font-semibold text-white">
                    Save {Math.round(((product.compareAtPrice! - currentPrice) / product.compareAtPrice!) * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="mt-4 text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Variant Selector */}
            {showVariantSelector && product.variants && product.variants.length > 1 && (
              <div className="mt-6">
                <VariantSelector
                  variants={product.variants}
                  selectedVariantId={selectedVariantId}
                  onSelect={setSelectedVariantId}
                />
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              {showQuantitySelector && (
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                />
              )}

              {showAddToCart && (
                <button
                  disabled={!isAvailable}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-3 px-6',
                    'font-semibold transition-all',
                    isAvailable
                      ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] hover:bg-[hsl(var(--portal-primary))]/90 hover:shadow-lg'
                      : 'cursor-not-allowed bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
                  )}
                >
                  <LucideIcon name="ShoppingBag" className="h-5 w-5" />
                  {isAvailable ? 'Add to Cart' : 'Sold Out'}
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="mt-4 flex items-center gap-4">
              {showWishlist && (
                <WishlistButton
                  productId={product.id}
                  variant="button"
                  size="sm"
                  showLabel
                />
              )}

              {showShare && (
                <button
                  onClick={handleShare}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2',
                    'border-[hsl(var(--portal-border))]',
                    'text-sm font-medium text-[hsl(var(--portal-foreground))]',
                    'transition-all hover:border-[hsl(var(--portal-primary))]'
                  )}
                >
                  <LucideIcon name="Share2" className="h-4 w-4" />
                  Share
                </button>
              )}
            </div>

            {/* View Full Details */}
            {showViewFullDetails && (
              <Link
                href={`/products/${product.handle}`}
                className={cn(
                  'mt-6 flex items-center justify-center gap-2',
                  'text-sm font-medium text-[hsl(var(--portal-primary))]',
                  'hover:underline'
                )}
                onClick={onClose}
              >
                View Full Details
                <LucideIcon name="ArrowRight" className="h-4 w-4" />
              </Link>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-[hsl(var(--portal-border))] pt-6">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[hsl(var(--portal-muted))] px-3 py-1 text-xs text-[hsl(var(--portal-muted-foreground))]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
