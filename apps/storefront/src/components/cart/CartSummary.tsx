/**
 * Cart Summary Component
 *
 * Displays cart totals and checkout button:
 * - Subtotal
 * - Applied discount codes with remove functionality
 * - Discount code input
 * - Shipping note
 * - Total
 * - Checkout CTA
 */

'use client'

import type { Cart } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import { useState, useCallback, useRef, useEffect } from 'react'

import { formatMoney } from '@/lib/cart/types'
import { useCart } from './CartProvider'

interface CartSummaryProps {
  /** Optional: Use external cart data instead of context */
  cart?: Cart
  /** Additional CSS classes */
  className?: string
  /** Whether to show discount code input */
  showDiscountInput?: boolean
  /** Whether to show a compact version */
  compact?: boolean
}

export function CartSummary({
  cart: externalCart,
  className,
  showDiscountInput = false,
  compact = false,
}: CartSummaryProps) {
  const { cart: contextCart, checkout, isUpdating, error } = useCart()
  const cart = externalCart ?? contextCart

  if (!cart || cart.lines.length === 0) {
    return null
  }

  const { cost } = cart
  const discountCodes = cart.discountCodes ?? []
  const discountAllocations = cart.discountAllocations ?? []

  // Calculate total discount amount from allocations
  const totalDiscountAmount = discountAllocations.reduce((sum: number, allocation: { discountedAmount: { amount: string } }) => {
    return sum + parseFloat(allocation.discountedAmount.amount)
  }, 0)

  const hasDiscount = totalDiscountAmount > 0
  const appliedCodes = discountCodes.filter((dc: { code: string; applicable: boolean }) => dc.applicable)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Applied Discount Codes */}
      {appliedCodes.length > 0 && (
        <AppliedDiscounts codes={appliedCodes} />
      )}

      {/* Discount Code Input */}
      {showDiscountInput && <DiscountCodeInput hasExistingDiscount={appliedCodes.length > 0} />}

      {/* Summary Lines */}
      <div className={cn('space-y-2', compact ? 'text-sm' : 'text-base')}>
        {/* Subtotal */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoney(cost.subtotalAmount)}</span>
        </div>

        {/* Discount (if applicable) */}
        {hasDiscount && (
          <div className="flex justify-between text-emerald-600">
            <span className="flex items-center gap-1.5">
              <TagIcon className="h-4 w-4" />
              Discount
            </span>
            <span className="font-medium">
              -{formatMoney({
                amount: String(totalDiscountAmount),
                currencyCode: cost.subtotalAmount.currencyCode,
              })}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span className="text-sm italic">Calculated at checkout</span>
        </div>

        {/* Taxes (if available) */}
        {cost.totalTaxAmount && parseFloat(cost.totalTaxAmount.amount) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatMoney(cost.totalTaxAmount)}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Total */}
      <div className="flex justify-between items-baseline">
        <span className={cn('font-semibold', compact ? 'text-base' : 'text-lg')}>
          Total
        </span>
        <span className={cn('font-bold', compact ? 'text-lg' : 'text-xl')}>
          {formatMoney(cost.totalAmount)}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Checkout Button */}
      <CheckoutButton
        onClick={checkout}
        disabled={isUpdating || cart.lines.length === 0}
        compact={compact}
      />

      {/* Trust Signals */}
      {!compact && <TrustSignals />}
    </div>
  )
}

// --- Applied Discounts Display ---

interface AppliedDiscountsProps {
  codes: Array<{ code: string; applicable: boolean }>
}

function AppliedDiscounts({ codes }: AppliedDiscountsProps) {
  const { removeDiscounts, isUpdating } = useCart()
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeDiscounts()
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-2">
      {codes.map((dc) => (
        <div
          key={dc.code}
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2',
            'bg-emerald-50 border border-emerald-200',
            'dark:bg-emerald-950/30 dark:border-emerald-800'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-mono text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {dc.code}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUpdating || isRemoving}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full',
              'text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-800',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label={`Remove discount code ${dc.code}`}
          >
            {isRemoving ? (
              <LoadingSpinner className="h-3.5 w-3.5" />
            ) : (
              <XIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}

// --- Discount Code Input ---

interface DiscountCodeInputProps {
  hasExistingDiscount: boolean
}

function DiscountCodeInput({ hasExistingDiscount }: DiscountCodeInputProps) {
  const { applyDiscount, isUpdating } = useCart()
  const [code, setCode] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Reset status after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        setStatus('idle')
        setCode('')
        setIsExpanded(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleApply = useCallback(async () => {
    if (!code.trim()) return

    setIsApplying(true)
    setStatus('idle')
    setErrorMessage(null)

    try {
      const success = await applyDiscount(code.trim())
      if (success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage('This code is not applicable to your cart')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Invalid discount code')
    } finally {
      setIsApplying(false)
    }
  }, [code, applyDiscount])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.trim()) {
      e.preventDefault()
      handleApply()
    }
    if (e.key === 'Escape') {
      setIsExpanded(false)
      setCode('')
      setStatus('idle')
      setErrorMessage(null)
    }
  }

  // If already has discount, show option to add another
  if (hasExistingDiscount && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add another code
      </button>
    )
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 text-sm font-medium',
          'text-muted-foreground hover:text-foreground',
          'transition-colors'
        )}
      >
        <TagIcon className="h-4 w-4" />
        Have a discount code?
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setStatus('idle')
              setErrorMessage(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter code"
            disabled={isApplying || isUpdating}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono',
              'placeholder:text-muted-foreground placeholder:font-sans',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              status === 'error'
                ? 'border-destructive focus:ring-destructive'
                : status === 'success'
                  ? 'border-emerald-500 focus:ring-emerald-500'
                  : 'border-input focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Discount code"
            aria-invalid={status === 'error'}
            aria-describedby={errorMessage ? 'discount-error' : undefined}
          />

          {/* Status indicator inside input */}
          {status === 'success' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <CheckIcon className="h-3 w-3 text-white" />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || isUpdating || !code.trim()}
          className={cn(
            'relative overflow-hidden rounded-lg px-4 py-2.5 text-sm font-semibold',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            status === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-foreground text-background hover:bg-foreground/90'
          )}
        >
          {isApplying ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : status === 'success' ? (
            'Applied!'
          ) : (
            'Apply'
          )}
        </button>
      </div>

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p
          id="discount-error"
          className="flex items-center gap-1.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <ErrorIcon className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </p>
      )}

      {/* Cancel button */}
      {!isApplying && status !== 'success' && (
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false)
            setCode('')
            setStatus('idle')
            setErrorMessage(null)
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

// --- Checkout Button ---

interface CheckoutButtonProps {
  onClick: () => void
  disabled?: boolean
  compact?: boolean
}

function CheckoutButton({ onClick, disabled, compact }: CheckoutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl font-semibold',
        'bg-foreground text-background',
        'transition-all duration-200',
        'hover:bg-foreground/90 hover:shadow-xl',
        'active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        compact ? 'h-12 text-base' : 'h-14 text-lg'
      )}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        Checkout
        <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </span>

      {/* Shimmer effect */}
      <span className="absolute inset-0 overflow-hidden">
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
      </span>
    </button>
  )
}

// --- Trust Signals ---

function TrustSignals() {
  return (
    <div className="flex items-center justify-center gap-6 pt-2 text-muted-foreground">
      <div className="flex items-center gap-1.5 text-xs">
        <LockIcon className="h-4 w-4" />
        <span>Secure checkout</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <ShieldIcon className="h-4 w-4" />
        <span>SSL encrypted</span>
      </div>
    </div>
  )
}

// --- Icons ---

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
