/**
 * Cart Page Client Components
 */

'use client'

import type { Cart } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Link from 'next/link'

import { CartProvider, useCart } from '@/components/cart/CartProvider'
import { CartLineItem } from '@/components/cart/CartLineItem'
import { CartSummary } from '@/components/cart/CartSummary'
import { GiftMessage } from '@/components/cart/GiftMessage'

function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const threshold = 50
  const remaining = Math.max(0, threshold - subtotal)
  const progress = Math.min(100, (subtotal / threshold) * 100)

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
      {remaining > 0 ? (
        <>
          <p className="text-sm text-gray-600">
            You&apos;re <span className="font-semibold text-cgk-navy">${remaining.toFixed(2)}</span> away from{' '}
            <span className="font-semibold text-cgk-navy">FREE 3-Day Delivery!</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-cgk-navy transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-semibold text-green-600">
            You&apos;ve earned FREE 3-Day Delivery!
          </p>
        </div>
      )}
    </div>
  )
}

interface CartPageContentProps {
  initialCart: Cart | null
  tenantSlug: string
}

export function CartPageContent({ initialCart, tenantSlug }: CartPageContentProps) {
  return (
    <CartProvider initialCart={initialCart} tenantSlug={tenantSlug}>
      <CartPageInner />
    </CartProvider>
  )
}

function CartPageInner() {
  const { cart, isLoading } = useCart()

  if (isLoading) {
    return <CartSkeleton />
  }

  if (!cart || cart.lines.length === 0) {
    return <EmptyCart />
  }

  const subtotal = parseFloat(cart.cost.subtotalAmount.amount)

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Cart Items */}
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold md:text-3xl">Your Cart</h1>
          <span className="text-muted-foreground">
            {cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'}
          </span>
        </div>

        <FreeShippingBar subtotal={subtotal} />

        <div className="divide-y rounded-xl border bg-card">
          {cart.lines.map((line) => (
            <div key={line.id} className="px-4 md:px-6">
              <CartLineItem line={line} />
            </div>
          ))}
        </div>

        {/* Shipping/Tax Notice */}
        <p className="mt-4 text-xs text-muted-foreground">
          Shipping &amp; taxes calculated at checkout.
        </p>

        {/* Gift Message */}
        <div className="mt-4">
          <GiftMessage />
        </div>

        {/* Continue Shopping */}
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-4">
        <div className="sticky top-24">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <CartSummary showDiscountInput />
          </div>

          {/* Payment Method Icons */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {/* Visa */}
            <svg className="h-6 text-gray-400" viewBox="0 0 48 32" fill="currentColor">
              <rect width="48" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19.5 21h-2.7l1.7-10.5h2.7L19.5 21zm11.2-10.2c-.5-.2-1.4-.4-2.4-.4-2.7 0-4.6 1.4-4.6 3.4 0 1.5 1.3 2.3 2.4 2.8 1 .5 1.4.8 1.4 1.3 0 .7-.8 1-1.6 1-1.1 0-1.6-.2-2.5-.5l-.3-.2-.4 2.2c.6.3 1.8.5 3 .5 2.8 0 4.7-1.4 4.7-3.5 0-1.2-.7-2-2.3-2.8-.9-.5-1.5-.8-1.5-1.3 0-.4.5-.9 1.5-.9.9 0 1.5.2 2 .4l.2.1.4-2.1zm6.8-.3h-2.1c-.6 0-1.1.2-1.4.8L30 21h2.8l.6-1.5h3.5l.3 1.5H40l-2.4-10.5h-.1zm-2.2 6.8l1.1-3 .3-.8.2.7.6 3.1h-2.2zM16 10.5l-2.6 7.2-.3-1.4c-.5-1.6-2-3.4-3.7-4.3l2.4 9h2.9l4.3-10.5H16z" />
              <path d="M11 10.5H6.9l-.1.2c3.3.8 5.5 2.9 6.4 5.3l-.9-4.7c-.2-.6-.7-.8-1.3-.8z" />
            </svg>
            {/* Mastercard */}
            <svg className="h-6 text-gray-400" viewBox="0 0 48 32" fill="currentColor">
              <rect width="48" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="19" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="29" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {/* Amex */}
            <svg className="h-6 text-gray-400" viewBox="0 0 48 32" fill="currentColor">
              <rect width="48" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <text x="24" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">AMEX</text>
            </svg>
            {/* PayPal */}
            <svg className="h-6 text-gray-400" viewBox="0 0 48 32" fill="currentColor">
              <rect width="48" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M18.5 10h4.2c2.3 0 3.5 1.2 3.3 3-.3 2.5-2 4-4.5 4h-1.2c-.3 0-.6.3-.7.6l-.5 3.4h-2.3l1.7-11zm2.5 5h.8c1.2 0 2-.6 2.2-1.8.1-.9-.4-1.4-1.4-1.4h-.7l-.9 3.2zm8.5-1.5c.5-.3 1.2-.5 2-.5 1.8 0 2.8.9 2.6 2.6-.3 2.4-1.9 3.9-4.1 3.9-.8 0-1.4-.1-1.9-.4l.3-1.7c.4.2.9.3 1.4.3.9 0 1.7-.6 1.8-1.5.1-.6-.3-1-.9-1-.4 0-.8.1-1.1.3l.3-1.7-.4-.3z" />
            </svg>
            {/* Lock icon for secure checkout */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
          <CartIcon className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-lg">
          <SparklesIcon className="h-7 w-7 text-amber-500" />
        </div>
      </div>

      <h1 className="text-2xl font-bold md:text-3xl">Your cart is empty</h1>
      <p className="mt-2 text-center text-muted-foreground max-w-md">
        Looks like you haven't added anything to your cart yet.
        Start exploring our products and find something you love.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/products"
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'rounded-xl bg-foreground px-8 py-3 font-semibold text-background',
            'hover:bg-foreground/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          Start Shopping
          <ArrowRightIcon className="h-4 w-4" />
        </Link>

        <Link
          href="/collections"
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'rounded-xl border px-8 py-3 font-semibold',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          Browse Collections
        </Link>
      </div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>

        <div className="divide-y rounded-xl border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 md:p-6">
              <div className="h-20 w-20 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-10 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-xl border p-6 space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between">
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-14 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}
