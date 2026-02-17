'use client'

/**
 * Wishlist Button Component
 *
 * Add to wishlist button with multiple variants and sizes.
 * Supports icon-only, button, and text variants.
 */

import { useState, useCallback } from 'react'
import { cn } from '@cgk-platform/ui'
import type { WishlistButtonConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Props for WishlistButton
 */
export interface WishlistButtonProps {
  productId: string
  variant?: WishlistButtonConfig['variant']
  size?: WishlistButtonConfig['size']
  showLabel?: boolean
  labelAdd?: string
  labelRemove?: string
  position?: WishlistButtonConfig['position']
  className?: string
  onAdd?: (productId: string) => void
  onRemove?: (productId: string) => void
}

/**
 * Size classes for different sizes
 */
const sizeClasses = {
  sm: {
    icon: 'h-8 w-8',
    iconSize: 'h-4 w-4',
    button: 'px-3 py-1.5 text-xs',
  },
  md: {
    icon: 'h-10 w-10',
    iconSize: 'h-5 w-5',
    button: 'px-4 py-2 text-sm',
  },
  lg: {
    icon: 'h-12 w-12',
    iconSize: 'h-6 w-6',
    button: 'px-6 py-3 text-base',
  },
}

/**
 * Position classes for absolute positioning (used in product cards)
 */
const positionClasses = {
  'top-right': 'absolute right-3 top-3',
  'top-left': 'absolute left-3 top-3',
  'bottom-right': 'absolute right-3 bottom-3',
  'bottom-left': 'absolute left-3 bottom-3',
  inline: '',
}

/**
 * Wishlist Button Component
 */
export function WishlistButton({
  productId,
  variant = 'icon',
  size = 'md',
  showLabel = false,
  labelAdd = 'Add to Wishlist',
  labelRemove = 'Remove from Wishlist',
  position = 'inline',
  className,
  onAdd,
  onRemove,
}: WishlistButtonProps) {
  // In a real implementation, this would check against a wishlist context/store
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = useCallback(() => {
    setIsAnimating(true)

    if (isInWishlist) {
      setIsInWishlist(false)
      onRemove?.(productId)
    } else {
      setIsInWishlist(true)
      onAdd?.(productId)
    }

    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300)
  }, [isInWishlist, productId, onAdd, onRemove])

  const sizes = sizeClasses[size]
  const label = isInWishlist ? labelRemove : labelAdd

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center rounded-full',
          'transition-all duration-300',
          sizes.icon,
          position !== 'inline' && positionClasses[position],
          isInWishlist
            ? 'bg-[hsl(var(--portal-destructive))] text-white'
            : 'bg-white/90 text-[hsl(var(--portal-foreground))] hover:bg-white',
          'shadow-lg hover:shadow-xl hover:scale-110',
          isAnimating && 'animate-bounce-once',
          className
        )}
        aria-label={label}
        title={label}
      >
        <LucideIcon
          name={isInWishlist ? 'Heart' : 'Heart'}
          className={cn(
            sizes.iconSize,
            isInWishlist && 'fill-current'
          )}
        />
      </button>
    )
  }

  // Button variant
  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg border font-medium',
          'transition-all duration-300',
          sizes.button,
          position !== 'inline' && positionClasses[position],
          isInWishlist
            ? 'border-[hsl(var(--portal-destructive))] bg-[hsl(var(--portal-destructive))]/10 text-[hsl(var(--portal-destructive))]'
            : 'border-[hsl(var(--portal-border))] text-[hsl(var(--portal-foreground))] hover:border-[hsl(var(--portal-destructive))] hover:text-[hsl(var(--portal-destructive))]',
          isAnimating && 'animate-pulse',
          className
        )}
        aria-pressed={isInWishlist}
      >
        <LucideIcon
          name="Heart"
          className={cn(
            sizes.iconSize,
            isInWishlist && 'fill-current'
          )}
        />
        {showLabel && <span>{label}</span>}
      </button>
    )
  }

  // Text variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        'transition-colors duration-200',
        sizes.button,
        position !== 'inline' && positionClasses[position],
        isInWishlist
          ? 'text-[hsl(var(--portal-destructive))]'
          : 'text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-destructive))]',
        className
      )}
      aria-pressed={isInWishlist}
    >
      <LucideIcon
        name="Heart"
        className={cn(
          sizes.iconSize,
          isInWishlist && 'fill-current'
        )}
      />
      {showLabel && <span>{label}</span>}
    </button>
  )
}

/**
 * Wishlist Count Badge Component
 * Shows the number of items in the wishlist
 */
export function WishlistBadge({
  count = 0,
  className,
}: {
  count?: number
  className?: string
}) {
  if (count === 0) return null

  return (
    <span
      className={cn(
        'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center',
        'rounded-full bg-[hsl(var(--portal-destructive))] text-[10px] font-bold text-white',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Wishlist Icon Link Component
 * Icon link for header navigation showing wishlist count
 */
export function WishlistIconLink({
  href = '/wishlist',
  count = 0,
  className,
}: {
  href?: string
  count?: number
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        'relative flex items-center justify-center',
        'h-10 w-10 rounded-full',
        'text-[hsl(var(--portal-foreground))] transition-colors',
        'hover:bg-[hsl(var(--portal-muted))] hover:text-[hsl(var(--portal-primary))]',
        className
      )}
      aria-label={`Wishlist${count > 0 ? ` (${count} items)` : ''}`}
    >
      <LucideIcon name="Heart" className="h-5 w-5" />
      <WishlistBadge count={count} />
    </a>
  )
}

/**
 * Styled CSS for custom animations
 */
export function WishlistStyles() {
  return (
    <style jsx global>{`
      @keyframes bounce-once {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.2);
        }
      }
      .animate-bounce-once {
        animation: bounce-once 0.3s ease-in-out;
      }
    `}</style>
  )
}
