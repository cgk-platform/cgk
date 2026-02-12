/**
 * Cart Drawer Component
 *
 * A slide-out panel displaying cart contents:
 * - Header with title, item count, and close button
 * - Scrollable line items list
 * - Fixed summary section at bottom
 * - Empty state with CTA
 */

'use client'

import { cn } from '@cgk/ui'
import { useEffect, useCallback, useRef } from 'react'

import { useCart } from './CartProvider'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'

interface CartDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback when drawer should close */
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, isLoading } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      // Focus close button when opened
      closeButtonRef.current?.focus()

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const itemCount = cart?.totalQuantity ?? 0
  const isEmpty = !cart || cart.lines.length === 0

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col',
          'bg-background shadow-2xl',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Your Cart</h2>
            {itemCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-2 text-xs font-medium text-background">
                {itemCount}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              'hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label="Close cart"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : isEmpty ? (
          <EmptyState onClose={onClose} />
        ) : (
          <>
            {/* Line Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="divide-y">
                {cart?.lines.map((line) => (
                  <CartLineItem key={line.id} line={line} compact />
                ))}
              </div>
            </div>

            {/* Summary (Fixed) */}
            <div className="border-t bg-muted/30 px-6 py-4">
              <CartSummary compact />
            </div>
          </>
        )}
      </div>
    </>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      <p className="text-muted-foreground">Loading cart...</p>
    </div>
  )
}

interface EmptyStateProps {
  onClose: () => void
}

function EmptyState({ onClose }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      {/* Empty Cart Illustration */}
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <CartIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-md">
          <SparkleIcon className="h-5 w-5 text-amber-500" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold">Your cart is empty</h3>
        <p className="mt-1 text-muted-foreground">
          Discover something you love
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={cn(
          'rounded-xl bg-foreground px-8 py-3 font-semibold text-background',
          'hover:bg-foreground/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        Continue Shopping
      </button>
    </div>
  )
}

// --- Icons ---

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}
