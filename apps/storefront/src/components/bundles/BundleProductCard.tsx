/**
 * Bundle Product Card
 *
 * Individual product card within the bundle builder grid.
 * Handles selection state, variant switching, quantity controls,
 * and visual states (selected, sold out, free gift, max reached).
 */

'use client'

import { cn } from '@cgk-platform/ui'
import Image from 'next/image'
import { useCallback, useId } from 'react'

import type { BundleProduct, BundleVariant, SelectedProduct } from './types'

interface BundleProductCardProps {
  product: BundleProduct
  selected: SelectedProduct | undefined
  activeVariant: BundleVariant
  onToggle: (product: BundleProduct, variant: BundleVariant) => void
  onQuantityChange: (variantId: string, delta: number) => void
  onVariantChange: (product: BundleProduct, variant: BundleVariant) => void
  maxReached: boolean
  isFreeGift: boolean
  imageAspectRatio: 'square' | 'portrait' | 'landscape'
}

const ASPECT_CLASSES = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
} as const

export function BundleProductCard({
  product,
  selected,
  activeVariant,
  onToggle,
  onQuantityChange,
  onVariantChange,
  maxReached,
  isFreeGift,
  imageAspectRatio,
}: BundleProductCardProps) {
  const selectId = useId()
  const isSelected = !!selected
  const isSoldOut = !activeVariant.available
  const hasVariants = product.variants.length > 1
  const dimmed = !isSelected && (maxReached || isSoldOut)

  const handleCardClick = useCallback(() => {
    if (isSoldOut) return
    if (!isSelected && maxReached) return
    onToggle(product, activeVariant)
  }, [product, activeVariant, isSelected, isSoldOut, maxReached, onToggle])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleCardClick()
      }
    },
    [handleCardClick]
  )

  const handleVariantSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation()
      const variant = product.variants.find((v) => v.id === e.target.value)
      if (variant) {
        onVariantChange(product, variant)
      }
    },
    [product, onVariantChange]
  )

  const handleDecrease = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onQuantityChange(activeVariant.id, -1)
    },
    [activeVariant.id, onQuantityChange]
  )

  const handleIncrease = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onQuantityChange(activeVariant.id, 1)
    },
    [activeVariant.id, onQuantityChange]
  )

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border-2 bg-white transition-all duration-200',
        'cursor-pointer select-none',
        isSelected
          ? 'border-cgk-navy shadow-lg ring-1 ring-cgk-navy/20'
          : 'border-gray-200 hover:border-cgk-light-blue hover:shadow-md',
        isSelected && 'hover:-translate-y-0.5',
        dimmed && 'cursor-not-allowed opacity-50',
        isSoldOut && 'cursor-not-allowed'
      )}
      role="button"
      tabIndex={isSoldOut ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={
        isSoldOut
          ? `${product.title} \u2014 Sold out`
          : isSelected
            ? `Remove ${product.title} from bundle`
            : `Add ${product.title} to bundle`
      }
      aria-disabled={isSoldOut || (!isSelected && maxReached) || undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* Image */}
      <div className={cn('relative overflow-hidden rounded-t-[10px]', ASPECT_CLASSES[imageAspectRatio])}>
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.altText ?? product.title}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cgk-cream">
            <svg
              className="h-12 w-12 text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Sold out badge */}
        {isSoldOut && (
          <div className="absolute left-2 top-2 rounded-md bg-gray-900/80 px-2.5 py-1 text-xs font-semibold text-white">
            Sold Out
          </div>
        )}

        {/* Free gift badge */}
        {isFreeGift && !isSoldOut && (
          <div className="absolute left-2 top-2 rounded-md bg-cgk-gold px-2.5 py-1 text-xs font-bold text-white">
            FREE
          </div>
        )}

        {/* Selection checkmark overlay */}
        {isSelected && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-cgk-navy shadow-md">
            <svg
              className="h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-cgk-navy">
          {product.title}
        </h3>

        {/* Variant selector */}
        {hasVariants && (
          <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
            <label htmlFor={selectId} className="sr-only">
              Select variant for {product.title}
            </label>
            <select
              id={selectId}
              className={cn(
                'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-cgk-navy',
                'focus:border-cgk-navy focus:outline-none focus:ring-1 focus:ring-cgk-navy'
              )}
              value={activeVariant.id}
              onChange={handleVariantSelect}
            >
              {product.variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={!variant.available}
                >
                  {variant.title}
                  {!variant.available ? ' \u2014 Sold out' : ''}
                  {' \u2014 '}
                  {formatPrice(variant.price)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto flex items-center gap-2">
          {activeVariant.compareAtPrice != null &&
            activeVariant.compareAtPrice > activeVariant.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(activeVariant.compareAtPrice)}
              </span>
            )}
          <span className="text-sm font-semibold text-cgk-navy">
            {formatPrice(activeVariant.price)}
          </span>
        </div>
      </div>

      {/* Quantity controls (only shown when selected) */}
      {isSelected && selected && (
        <div
          className="flex items-center justify-center gap-3 border-t border-gray-100 px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 transition-colors',
              'hover:border-cgk-navy hover:bg-cgk-navy hover:text-white',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-current'
            )}
            aria-label={`Decrease quantity for ${product.title}`}
            onClick={handleDecrease}
            disabled={selected.quantity <= 1}
          >
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span
            className="min-w-[1.5rem] text-center text-sm font-semibold text-cgk-navy"
            aria-live="polite"
          >
            {selected.quantity}
          </span>

          <button
            type="button"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 transition-colors',
              'hover:border-cgk-navy hover:bg-cgk-navy hover:text-white',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-current'
            )}
            aria-label={`Increase quantity for ${product.title}`}
            onClick={handleIncrease}
            disabled={maxReached}
          >
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
