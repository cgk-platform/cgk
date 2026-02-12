/**
 * Add to Cart Button
 *
 * A prominent CTA button with multiple states:
 * - Default: "Add to Cart"
 * - Loading: Spinner + "Adding..."
 * - Success: Checkmark + "Added!"
 * - Out of Stock: "Out of Stock" (disabled)
 * - Error: "Failed - Try Again"
 */

'use client'

import { cn } from '@cgk/ui'
import { useState, useCallback, useEffect } from 'react'

import { useCart } from './CartProvider'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

interface AddToCartButtonProps {
  /** Product variant ID to add */
  variantId: string
  /** Product title for accessibility */
  productTitle: string
  /** Quantity to add (default: 1) */
  quantity?: number
  /** Whether the variant is available for sale */
  available?: boolean
  /** Additional CSS classes */
  className?: string
  /** Callback after successful add */
  onSuccess?: () => void
  /** Whether to show a compact version */
  compact?: boolean
}

export function AddToCartButton({
  variantId,
  productTitle,
  quantity = 1,
  available = true,
  className,
  onSuccess,
  compact = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart()
  const [buttonState, setButtonState] = useState<ButtonState>('idle')

  // Reset to idle after success/error animation
  useEffect(() => {
    if (buttonState === 'success' || buttonState === 'error') {
      const timer = setTimeout(() => {
        setButtonState('idle')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [buttonState])

  const handleClick = useCallback(async () => {
    if (!available || buttonState === 'loading') return

    setButtonState('loading')

    try {
      await addItem({ variantId, quantity })
      setButtonState('success')
      onSuccess?.()
    } catch (error) {
      console.error('Add to cart failed:', error)
      setButtonState('error')
    }
  }, [addItem, variantId, quantity, available, buttonState, onSuccess])

  const isDisabled = !available || buttonState === 'loading'

  // Determine button content based on state
  const getButtonContent = () => {
    if (!available) {
      return (
        <>
          <SoldOutIcon />
          <span>Out of Stock</span>
        </>
      )
    }

    switch (buttonState) {
      case 'loading':
        return (
          <>
            <LoadingSpinner />
            <span>{compact ? 'Adding' : 'Adding...'}</span>
          </>
        )
      case 'success':
        return (
          <>
            <CheckIcon />
            <span>{compact ? 'Added' : 'Added!'}</span>
          </>
        )
      case 'error':
        return (
          <>
            <ErrorIcon />
            <span>{compact ? 'Retry' : 'Failed - Try Again'}</span>
          </>
        )
      default:
        return (
          <>
            <CartIcon />
            <span>{compact ? 'Add' : 'Add to Cart'}</span>
          </>
        )
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        available
          ? `Add ${productTitle} to cart`
          : `${productTitle} is out of stock`
      }
      className={cn(
        // Base styles
        'group relative inline-flex items-center justify-center gap-2',
        'font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

        // Size variants
        compact
          ? 'h-10 px-4 text-sm rounded-lg'
          : 'h-14 px-8 text-base rounded-xl',

        // State-based styles
        available && buttonState === 'idle' && [
          'bg-foreground text-background',
          'hover:bg-foreground/90 hover:scale-[1.02]',
          'active:scale-[0.98]',
          'shadow-lg hover:shadow-xl',
        ],
        available && buttonState === 'loading' && [
          'bg-foreground/80 text-background',
          'cursor-wait',
        ],
        available && buttonState === 'success' && [
          'bg-emerald-600 text-white',
          'shadow-lg shadow-emerald-500/25',
        ],
        available && buttonState === 'error' && [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'cursor-pointer',
        ],
        !available && [
          'bg-muted text-muted-foreground',
          'cursor-not-allowed',
        ],

        className
      )}
    >
      {getButtonContent()}

      {/* Shimmer effect on hover */}
      {available && buttonState === 'idle' && (
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
        </span>
      )}
    </button>
  )
}

// --- Icon Components ---

function CartIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function SoldOutIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  )
}
