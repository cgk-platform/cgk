'use client'

/**
 * Bundle Builder Block Component
 *
 * Interactive bundle configuration component that allows customers to
 * build custom product bundles with real-time pricing updates.
 */

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig, ButtonConfig } from '../types'

/**
 * Bundle item type
 */
export interface BundleItem {
  /** Unique item ID */
  id: string
  /** Item name */
  name: string
  /** Item description */
  description?: string
  /** Item image */
  image?: ImageConfig
  /** Individual price */
  price: number
  /** Compare at price (original) */
  compareAtPrice?: number
  /** Category for grouping */
  category?: string
  /** Whether item is required in bundle */
  required?: boolean
  /** Max quantity allowed */
  maxQuantity?: number
  /** Default quantity when selected */
  defaultQuantity?: number
}

/**
 * Bundle tier for progressive discounts
 */
export interface BundleTier {
  /** Minimum items to qualify */
  minItems: number
  /** Discount percentage */
  discountPercent: number
  /** Tier label */
  label: string
}

/**
 * Bundle Builder block configuration
 */
export interface BundleBuilderConfig {
  /** Section headline */
  headline: string
  /** Section description */
  description?: string
  /** Available items to bundle */
  items: BundleItem[]
  /** Progressive discount tiers */
  tiers?: BundleTier[]
  /** Minimum items required */
  minItems?: number
  /** Maximum items allowed */
  maxItems?: number
  /** Background color */
  backgroundColor?: string
  /** CTA button configuration */
  ctaButton?: ButtonConfig
  /** Currency symbol */
  currencySymbol?: string
  /** Show savings indicator */
  showSavings?: boolean
  /** Layout style */
  layout?: 'grid' | 'list'
  /** Enable quantity selection */
  enableQuantity?: boolean
}

/**
 * Format price with currency
 */
function formatPrice(price: number, symbol: string = '$'): string {
  return `${symbol}${price.toFixed(2)}`
}

/**
 * Item Card Component
 */
function BundleItemCard({
  item,
  quantity,
  onQuantityChange,
  currencySymbol,
  enableQuantity,
  layout,
}: {
  item: BundleItem
  quantity: number
  onQuantityChange: (quantity: number) => void
  currencySymbol: string
  enableQuantity: boolean
  layout: 'grid' | 'list'
}) {
  const isSelected = quantity > 0
  const maxQty = item.maxQuantity || 10

  const handleToggle = useCallback(() => {
    if (isSelected) {
      onQuantityChange(0)
    } else {
      onQuantityChange(item.defaultQuantity || 1)
    }
  }, [isSelected, onQuantityChange, item.defaultQuantity])

  const handleIncrement = useCallback(() => {
    if (quantity < maxQty) {
      onQuantityChange(quantity + 1)
    }
  }, [quantity, maxQty, onQuantityChange])

  const handleDecrement = useCallback(() => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1)
    } else {
      onQuantityChange(0)
    }
  }, [quantity, onQuantityChange])

  if (layout === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200',
          isSelected
            ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]/5 shadow-md'
            : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/50'
        )}
      >
        {/* Image */}
        {item.image?.src && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src={item.image.src}
              alt={item.image.alt || item.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-[hsl(var(--portal-foreground))]">
                {item.name}
                {item.required && (
                  <span className="ml-2 text-xs text-[hsl(var(--portal-muted-foreground))]">
                    (Required)
                  </span>
                )}
              </h4>
              {item.description && (
                <p className="mt-0.5 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  {item.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="font-semibold text-[hsl(var(--portal-foreground))]">
                {formatPrice(item.price, currencySymbol)}
              </span>
              {item.compareAtPrice && item.compareAtPrice > item.price && (
                <span className="ml-2 text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
                  {formatPrice(item.compareAtPrice, currencySymbol)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0">
          {!item.required && enableQuantity && isSelected ? (
            <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))]">
              <button
                onClick={handleDecrement}
                className="px-3 py-2 text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-medium tabular-nums">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={quantity >= maxQty}
                className="px-3 py-2 text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
          ) : !item.required ? (
            <button
              onClick={handleToggle}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]'
                  : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-foreground))] hover:bg-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary-foreground))]'
              )}
            >
              {isSelected ? 'Remove' : 'Add'}
            </button>
          ) : (
            <span className="text-sm text-green-600 font-medium">Included</span>
          )}
        </div>
      </div>
    )
  }

  // Grid layout
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200',
        isSelected
          ? 'border-[hsl(var(--portal-primary))] shadow-lg ring-2 ring-[hsl(var(--portal-primary))]/20'
          : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/50 hover:shadow-md'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]">
          <svg className="h-4 w-4 text-[hsl(var(--portal-primary-foreground))]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Image */}
      {item.image?.src && (
        <div className="relative aspect-square w-full overflow-hidden bg-[hsl(var(--portal-muted))]">
          <Image
            src={item.image.src}
            alt={item.image.alt || item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-grow flex-col p-4">
        <h4 className="font-semibold text-[hsl(var(--portal-foreground))]">
          {item.name}
        </h4>
        {item.description && (
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))] line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[hsl(var(--portal-foreground))]">
            {formatPrice(item.price, currencySymbol)}
          </span>
          {item.compareAtPrice && item.compareAtPrice > item.price && (
            <span className="text-sm text-[hsl(var(--portal-muted-foreground))] line-through">
              {formatPrice(item.compareAtPrice, currencySymbol)}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4">
          {item.required ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Included in bundle</span>
            </div>
          ) : enableQuantity && isSelected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--portal-border))]">
                <button
                  onClick={handleDecrement}
                  className="px-3 py-2 text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={quantity >= maxQty}
                  className="px-3 py-2 text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleToggle}
              className={cn(
                'w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'bg-[hsl(var(--portal-destructive))] text-[hsl(var(--portal-destructive-foreground))] hover:opacity-90'
                  : 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] hover:opacity-90'
              )}
            >
              {isSelected ? 'Remove from Bundle' : 'Add to Bundle'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Bundle Builder Block Component
 */
export function BundleBuilderBlock({ block, className }: BlockProps<BundleBuilderConfig>) {
  const {
    headline,
    description,
    items,
    tiers = [],
    minItems = 1,
    maxItems,
    backgroundColor,
    ctaButton,
    currencySymbol = '$',
    showSavings = true,
    layout = 'grid',
    enableQuantity = true,
  } = block.config

  // Track selected items and quantities
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    // Initialize with required items
    const initial: Record<string, number> = {}
    items.forEach((item) => {
      if (item.required) {
        initial[item.id] = item.defaultQuantity || 1
      }
    })
    return initial
  })

  // Calculate totals
  const { totalItems, subtotal, discount, total, activeTier, savings } = useMemo(() => {
    let itemCount = 0
    let sub = 0
    let originalTotal = 0

    Object.entries(selections).forEach(([itemId, qty]) => {
      const item = items.find((i) => i.id === itemId)
      if (item && qty > 0) {
        itemCount += qty
        sub += item.price * qty
        originalTotal += (item.compareAtPrice || item.price) * qty
      }
    })

    // Find active tier
    const active = [...tiers]
      .sort((a, b) => b.minItems - a.minItems)
      .find((tier) => itemCount >= tier.minItems)

    const discountAmount = active ? (sub * active.discountPercent) / 100 : 0
    const finalTotal = sub - discountAmount
    const totalSavings = originalTotal - finalTotal

    return {
      totalItems: itemCount,
      subtotal: sub,
      discount: discountAmount,
      total: finalTotal,
      activeTier: active,
      savings: totalSavings,
    }
  }, [selections, items, tiers])

  // Handle quantity change
  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    setSelections((prev) => {
      const next = { ...prev }
      if (quantity <= 0) {
        delete next[itemId]
      } else {
        next[itemId] = quantity
      }
      return next
    })
  }, [])

  // Check if we can add more items
  const canAddMore = !maxItems || totalItems < maxItems
  const meetsMinimum = totalItems >= minItems

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
            {headline}
          </h2>
          {description && (
            <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
              {description}
            </p>
          )}

          {/* Tier Progress */}
          {tiers.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300',
                    activeTier && activeTier.minItems >= tier.minItems
                      ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]'
                      : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
                  )}
                >
                  <span>{tier.label}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {tier.discountPercent}% off
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Grid/List */}
        <div
          className={cn(
            layout === 'grid'
              ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-4'
          )}
        >
          {items.map((item) => (
            <BundleItemCard
              key={item.id}
              item={item}
              quantity={selections[item.id] || 0}
              onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
              currencySymbol={currencySymbol}
              enableQuantity={enableQuantity && canAddMore}
              layout={layout}
            />
          ))}
        </div>

        {/* Summary & CTA */}
        <div className="mt-12 rounded-2xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Pricing Summary */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} selected
                </span>
                {!meetsMinimum && (
                  <span className="text-sm text-amber-600">
                    (minimum {minItems} required)
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-4">
                {discount > 0 && (
                  <span className="text-lg text-[hsl(var(--portal-muted-foreground))] line-through">
                    {formatPrice(subtotal, currencySymbol)}
                  </span>
                )}
                <span className="text-3xl font-bold text-[hsl(var(--portal-foreground))]">
                  {formatPrice(total, currencySymbol)}
                </span>
                {activeTier && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {activeTier.discountPercent}% off applied
                  </span>
                )}
              </div>

              {showSavings && savings > 0 && (
                <p className="text-sm font-medium text-green-600">
                  You save {formatPrice(savings, currencySymbol)}!
                </p>
              )}
            </div>

            {/* CTA Button */}
            <button
              disabled={!meetsMinimum}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-10 py-4 text-lg font-bold transition-all duration-200',
                meetsMinimum
                  ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] hover:opacity-90 shadow-lg hover:shadow-xl'
                  : 'cursor-not-allowed bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]'
              )}
            >
              {ctaButton?.text || 'Add Bundle to Cart'}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
