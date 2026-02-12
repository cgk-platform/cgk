/**
 * Order Detail Page
 *
 * Displays complete order information including line items,
 * shipping address, tracking, and action buttons.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { cn, formatCurrency } from '@cgk/ui'

import { StatusBadge } from '@/components/account/StatusBadge'
import { getOrder } from '@/lib/account/api'
import { defaultContent, getContent } from '@/lib/account/content'
import type { Address } from '@/lib/account/types'

import { OrderDetailActions, OrderTrackingSection } from './components'

export const metadata: Metadata = {
  title: 'Order Details',
  description: 'View order details and tracking information',
}

export const dynamic = 'force-dynamic'

interface OrderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  let order
  try {
    order = await getOrder(id)
  } catch {
    notFound()
  }

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/account"
          className="text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
        >
          Account
        </Link>
        <svg className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href="/account/orders"
          className="text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
        >
          Orders
        </Link>
        <svg className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">{order.orderNumber}</span>
      </nav>

      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight lg:text-3xl"
              style={{ fontFamily: 'var(--portal-heading-font)' }}
            >
              Order {order.orderNumber}
            </h1>
            <StatusBadge type="order" status={order.status} />
          </div>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            {getContent(defaultContent, 'orders.detail.order_date')}: {formattedDate}
          </p>
        </div>

        <OrderDetailActions order={order} content={defaultContent} />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tracking Section */}
          {order.tracking && (
            <OrderTrackingSection order={order} content={defaultContent} />
          )}

          {/* Order Items */}
          <section
            className={cn(
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] overflow-hidden'
            )}
          >
            <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
                {getContent(defaultContent, 'orders.detail.items')} ({order.lineItems.length})
              </h2>
            </div>
            <div className="divide-y divide-[hsl(var(--portal-border))]">
              {order.lineItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-6">
                  {/* Product Image */}
                  <div className="shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-20 w-20 rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))] object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]">
                        <svg className="h-8 w-8 text-[hsl(var(--portal-muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[hsl(var(--portal-foreground))]">
                      {item.title}
                    </h3>
                    {item.variantTitle && (
                      <p className="mt-0.5 text-sm text-[hsl(var(--portal-muted-foreground))]">
                        {item.variantTitle}
                      </p>
                    )}
                    {item.sku && (
                      <p className="mt-0.5 text-xs text-[hsl(var(--portal-muted-foreground))]">
                        SKU: {item.sku}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(item.priceCents / 100, order.currencyCode)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                        {formatCurrency(item.priceCents / 100 / item.quantity, order.currencyCode)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Summary & Addresses */}
        <div className="space-y-6">
          {/* Order Summary */}
          <section
            className={cn(
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] overflow-hidden'
            )}
          >
            <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
                {getContent(defaultContent, 'orders.detail.order_summary')}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--portal-muted-foreground))]">
                  {getContent(defaultContent, 'orders.detail.subtotal')}
                </span>
                <span>{formatCurrency(order.subtotalCents / 100, order.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--portal-muted-foreground))]">
                  {getContent(defaultContent, 'orders.detail.shipping')}
                </span>
                <span>
                  {order.shippingCents === 0
                    ? 'Free'
                    : formatCurrency(order.shippingCents / 100, order.currencyCode)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--portal-muted-foreground))]">
                  {getContent(defaultContent, 'orders.detail.tax')}
                </span>
                <span>{formatCurrency(order.taxCents / 100, order.currencyCode)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--portal-muted-foreground))]">
                    {getContent(defaultContent, 'orders.detail.discount')}
                  </span>
                  <span className="text-green-600">
                    -{formatCurrency(order.discountCents / 100, order.currencyCode)}
                  </span>
                </div>
              )}
              <div className="border-t border-[hsl(var(--portal-border))] pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {getContent(defaultContent, 'orders.detail.total')}
                  </span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(order.totalCents / 100, order.currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Address */}
          <section
            className={cn(
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] overflow-hidden'
            )}
          >
            <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
                {getContent(defaultContent, 'orders.detail.shipping_address')}
              </h2>
            </div>
            <div className="p-6">
              <AddressDisplay address={order.shippingAddress} />
            </div>
          </section>

          {/* Billing Address */}
          {order.billingAddress && (
            <section
              className={cn(
                'rounded-xl border border-[hsl(var(--portal-border))]',
                'bg-[hsl(var(--portal-card))] overflow-hidden'
              )}
            >
              <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
                <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
                  {getContent(defaultContent, 'orders.detail.billing_address')}
                </h2>
              </div>
              <div className="p-6">
                <AddressDisplay address={order.billingAddress} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function AddressDisplay({ address }: { address: Address }) {
  return (
    <address className="not-italic text-sm leading-relaxed">
      <p className="font-medium">
        {address.firstName} {address.lastName}
      </p>
      {address.company && (
        <p className="text-[hsl(var(--portal-muted-foreground))]">{address.company}</p>
      )}
      <p className="text-[hsl(var(--portal-muted-foreground))]">{address.address1}</p>
      {address.address2 && (
        <p className="text-[hsl(var(--portal-muted-foreground))]">{address.address2}</p>
      )}
      <p className="text-[hsl(var(--portal-muted-foreground))]">
        {address.city}, {address.province} {address.postalCode}
      </p>
      <p className="text-[hsl(var(--portal-muted-foreground))]">{address.country}</p>
      {address.phone && (
        <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">{address.phone}</p>
      )}
    </address>
  )
}
