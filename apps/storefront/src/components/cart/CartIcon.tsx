/**
 * Cart Icon with Badge
 *
 * Header cart icon that shows item count and opens cart drawer.
 */

'use client'

import { cn } from '@cgk/ui'
import { useState } from 'react'

import { useCartCount } from './CartProvider'
import { CartDrawer } from './CartDrawer'

interface CartIconProps {
  /** Additional CSS classes */
  className?: string
}

export function CartIcon({ className }: CartIconProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const count = useCartCount()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full',
          'hover:bg-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        aria-label={`Open cart${count > 0 ? `, ${count} items` : ''}`}
      >
        <ShoppingBagIcon className="h-5 w-5" />

        {/* Count Badge */}
        {count > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5',
              'flex h-5 min-w-5 items-center justify-center',
              'rounded-full bg-foreground px-1.5',
              'text-xs font-semibold text-background',
              'animate-in zoom-in-50 duration-200'
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}

/**
 * Standalone cart count badge (for use in custom headers)
 */
export function CartBadge({ className }: { className?: string }) {
  const count = useCartCount()

  if (count === 0) return null

  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center',
        'rounded-full bg-foreground px-1.5',
        'text-xs font-semibold text-background',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  )
}
