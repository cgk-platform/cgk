/**
 * Cart Page Client Components
 */

'use client'

import type { Cart } from '@cgk/commerce'
import { cn } from '@cgk/ui'
import Link from 'next/link'

import { CartProvider, useCart } from '@/components/cart/CartProvider'
import { CartLineItem } from '@/components/cart/CartLineItem'
import { CartSummary } from '@/components/cart/CartSummary'

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

        <div className="divide-y rounded-xl border bg-card">
          {cart.lines.map((line) => (
            <div key={line.id} className="px-4 md:px-6">
              <CartLineItem line={line} />
            </div>
          ))}
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

          {/* Security Badges */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <SecurityBadge icon="visa" />
            <SecurityBadge icon="mastercard" />
            <SecurityBadge icon="amex" />
            <SecurityBadge icon="paypal" />
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

// Security badge placeholder
function SecurityBadge({ icon }: { icon: string }) {
  return (
    <div className="flex h-8 w-12 items-center justify-center rounded border bg-muted/50 text-xs text-muted-foreground">
      {icon}
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
