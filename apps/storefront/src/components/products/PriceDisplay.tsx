/**
 * PriceDisplay Component
 *
 * Displays product prices with support for:
 * - Regular price
 * - Sale price with compare-at
 * - Price ranges (for products with variant prices)
 * - Subscription pricing
 */

import type { Money } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'

interface PriceDisplayProps {
  /** Current price */
  price: Money
  /** Original price (for sale display) */
  compareAtPrice?: Money
  /** Whether this is a price range */
  isRange?: boolean
  /** Maximum price in range */
  maxPrice?: Money
  /** Subscription pricing */
  subscription?: {
    price: Money
    interval: 'week' | 'month' | 'year'
    intervalCount?: number
  }
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show "Save X%" badge */
  showSavings?: boolean
  /** Custom class name */
  className?: string
}

export function PriceDisplay({
  price,
  compareAtPrice,
  isRange,
  maxPrice,
  subscription,
  size = 'md',
  showSavings = false,
  className,
}: PriceDisplayProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
    minimumFractionDigits: 2,
  })

  const currentPrice = parseFloat(price.amount)
  const originalPrice = compareAtPrice ? parseFloat(compareAtPrice.amount) : null
  const isOnSale = originalPrice && originalPrice > currentPrice

  // Calculate savings percentage
  const savingsPercent = isOnSale
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0

  const sizeClasses = {
    sm: {
      price: 'text-sm',
      compareAt: 'text-xs',
      badge: 'text-xs px-1.5 py-0.5',
    },
    md: {
      price: 'text-base',
      compareAt: 'text-sm',
      badge: 'text-xs px-2 py-1',
    },
    lg: {
      price: 'text-xl',
      compareAt: 'text-base',
      badge: 'text-sm px-2 py-1',
    },
    xl: {
      price: 'text-2xl md:text-3xl',
      compareAt: 'text-lg',
      badge: 'text-sm px-3 py-1',
    },
  }[size]

  // Subscription pricing display
  if (subscription) {
    const intervalLabel = getIntervalLabel(
      subscription.interval,
      subscription.intervalCount
    )

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {/* One-time price */}
        <div className="flex items-baseline gap-2">
          <span className={cn('font-semibold', sizeClasses.price)}>
            {formatter.format(currentPrice)}
          </span>
          <span className="text-muted-foreground">one-time</span>
        </div>

        {/* Subscription price */}
        <div className="flex items-baseline gap-2">
          <span className={cn('font-semibold text-primary', sizeClasses.price)}>
            {formatter.format(parseFloat(subscription.price.amount))}
          </span>
          <span className="text-muted-foreground">/ {intervalLabel}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Subscribe & Save
          </span>
        </div>
      </div>
    )
  }

  // Price range display
  if (isRange && maxPrice) {
    const max = parseFloat(maxPrice.amount)
    if (max !== currentPrice) {
      return (
        <div className={cn('flex items-baseline gap-1', className)}>
          <span className={cn('font-semibold', sizeClasses.price)}>
            {formatter.format(currentPrice)}
          </span>
          <span className="text-muted-foreground">-</span>
          <span className={cn('font-semibold', sizeClasses.price)}>
            {formatter.format(max)}
          </span>
        </div>
      )
    }
  }

  // Regular or sale price display
  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      {/* Current price */}
      <span
        className={cn(
          'font-semibold',
          sizeClasses.price,
          isOnSale && 'text-red-600'
        )}
      >
        {formatter.format(currentPrice)}
      </span>

      {/* Compare-at price */}
      {isOnSale && originalPrice && (
        <span
          className={cn(
            'text-muted-foreground line-through',
            sizeClasses.compareAt
          )}
        >
          {formatter.format(originalPrice)}
        </span>
      )}

      {/* Savings badge */}
      {showSavings && isOnSale && savingsPercent > 0 && (
        <span
          className={cn(
            'rounded-full bg-red-100 font-medium text-red-700',
            sizeClasses.badge
          )}
        >
          Save {savingsPercent}%
        </span>
      )}
    </div>
  )
}

/**
 * Get human-readable interval label
 */
function getIntervalLabel(
  interval: 'week' | 'month' | 'year',
  count?: number
): string {
  if (!count || count === 1) {
    return interval
  }

  return `${count} ${interval}s`
}

/**
 * Compact Price Component for inline use
 */
interface CompactPriceProps {
  price: Money
  compareAtPrice?: Money
  className?: string
}

export function CompactPrice({
  price,
  compareAtPrice,
  className,
}: CompactPriceProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  })

  const currentPrice = parseFloat(price.amount)
  const originalPrice = compareAtPrice ? parseFloat(compareAtPrice.amount) : null
  const isOnSale = originalPrice && originalPrice > currentPrice

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('font-medium', isOnSale && 'text-red-600')}>
        {formatter.format(currentPrice)}
      </span>
      {isOnSale && originalPrice && (
        <span className="text-muted-foreground line-through">
          {formatter.format(originalPrice)}
        </span>
      )}
    </span>
  )
}

export default PriceDisplay
