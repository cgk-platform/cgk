'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge, Button, Card, CardContent, cn } from '@cgk-platform/ui'
import {
  formatCardBrand,
  formatCardExpiry,
  formatDate,
  formatFrequency,
  formatPrice,
  getStatusDisplay,
} from '@/lib/subscriptions/format'
import type { Subscription, SubscriptionItem, SubscriptionOrder } from '@/lib/subscriptions/types'
import { FrequencySelector } from './frequency-selector'
import { PaymentMethodModal } from './payment-method-modal'
import { ProductSwapModal } from './product-swap-modal'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Subscription Header
// ---------------------------------------------------------------------------

interface SubscriptionHeaderProps {
  subscription: Subscription
}

export function SubscriptionHeader({ subscription }: SubscriptionHeaderProps) {
  const statusDisplay = getStatusDisplay(subscription.status)

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Subscription</h1>
          <Badge
            variant={
              statusDisplay.variant === 'success'
                ? 'default'
                : statusDisplay.variant === 'warning'
                  ? 'secondary'
                  : statusDisplay.variant === 'error'
                    ? 'destructive'
                    : 'outline'
            }
            className={cn(
              'text-xs uppercase tracking-wider',
              statusDisplay.variant === 'success' &&
                'border-emerald-200 bg-emerald-500/10 text-emerald-700',
              statusDisplay.variant === 'warning' &&
                'border-amber-200 bg-amber-500/10 text-amber-700'
            )}
          >
            {statusDisplay.label}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          #{subscription.id.slice(-8).toUpperCase()} &middot;{' '}
          {formatFrequency(subscription.frequency)}
        </p>
      </div>
      <Link
        href="/account/subscriptions"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Subscriptions
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product List
// ---------------------------------------------------------------------------

interface ProductListProps {
  subscription: Subscription
  onQuantityChange?: (itemId: string, quantity: number) => void
  onRemoveItem?: (itemId: string) => void
  editable?: boolean
}

export function ProductList({
  subscription,
  onQuantityChange,
  onRemoveItem,
  editable = true,
}: ProductListProps) {
  const [swapItem, setSwapItem] = useState<SubscriptionItem | null>(null)
  const canEdit = editable && (subscription.status === 'active' || subscription.status === 'paused')

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-6 text-lg font-semibold">Products</h3>
        <div className="space-y-4">
          {subscription.items.map((item) => (
            <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
              {/* Product Image */}
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium">{item.title}</h4>
                {item.variantTitle && (
                  <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">Qty: {item.quantity}</p>

                {/* Actions */}
                {canEdit && (
                  <div className="mt-2 flex items-center gap-2">
                    {item.isSwappable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSwapItem(item)}
                      >
                        Swap Product
                      </Button>
                    )}
                    {onQuantityChange && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          className="flex h-6 w-6 items-center justify-center rounded border transition-colors hover:bg-muted"
                          disabled={item.quantity <= 1}
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border transition-colors hover:bg-muted"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                    {subscription.items.length > 1 && onRemoveItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                {item.originalPriceCents && item.originalPriceCents > item.priceCents && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(
                      item.originalPriceCents * item.quantity,
                      subscription.currencyCode
                    )}
                  </p>
                )}
                <p className="font-medium">
                  {formatPrice(item.priceCents * item.quantity, subscription.currencyCode)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Product Swap Modal */}
      {swapItem && (
        <ProductSwapModal
          open={true}
          onOpenChange={(open) => !open && setSwapItem(null)}
          subscriptionId={subscription.id}
          item={swapItem}
        />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Order Summary
// ---------------------------------------------------------------------------

interface OrderSummaryProps {
  subscription: Subscription
}

export function OrderSummary({ subscription }: OrderSummaryProps) {
  const isActive = subscription.status === 'active'

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-lg font-semibold">{isActive ? 'Next Order' : 'Order Summary'}</h3>

        {/* Next Order Date */}
        {isActive && subscription.nextOrderDate && (
          <div className="mb-4 border-b pb-4">
            <p className="mb-1 text-sm text-muted-foreground">Ships On</p>
            <p className="text-lg font-medium">{formatDate(subscription.nextOrderDate)}</p>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subscription.subtotalCents, subscription.currencyCode)}</span>
          </div>

          {subscription.shippingCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatPrice(subscription.shippingCents, subscription.currencyCode)}</span>
            </div>
          )}

          {subscription.taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(subscription.taxCents, subscription.currencyCode)}</span>
            </div>
          )}

          {subscription.discountCents > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discounts</span>
              <span>-{formatPrice(subscription.discountCents, subscription.currencyCode)}</span>
            </div>
          )}

          {/* Applied Discounts */}
          {subscription.discounts.length > 0 && (
            <div className="space-y-1 pt-2">
              {subscription.discounts.map((discount) => (
                <div key={discount.id} className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-100 text-xs text-emerald-700">
                    {discount.type === 'percentage'
                      ? `${discount.value}% OFF`
                      : discount.type === 'free_shipping'
                        ? 'FREE SHIPPING'
                        : `$${(discount.value / 100).toFixed(2)} OFF`}
                  </Badge>
                  {discount.title && (
                    <span className="text-xs text-muted-foreground">{discount.title}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="mt-3 flex justify-between border-t pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-semibold">
              {formatPrice(subscription.totalCents, subscription.currencyCode)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Shipping Address
// ---------------------------------------------------------------------------

interface ShippingAddressProps {
  subscription: Subscription
}

export function ShippingAddress({ subscription }: ShippingAddressProps) {
  const address = subscription.shippingAddress
  const canEdit = subscription.status === 'active' || subscription.status === 'paused'

  if (!address) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold">Shipping Address</h3>
          {canEdit && (
            <Link href="/account/addresses" className="text-sm text-primary hover:underline">
              Edit
            </Link>
          )}
        </div>

        <address className="text-sm not-italic text-muted-foreground">
          {address.firstName} {address.lastName}
          <br />
          {address.address1}
          <br />
          {address.address2 && (
            <>
              {address.address2}
              <br />
            </>
          )}
          {address.city}, {address.provinceCode || address.province} {address.zip}
          <br />
          {address.country}
        </address>

        {canEdit && (
          <p className="mt-4 text-xs text-muted-foreground">
            Update your default address to change where your subscription orders ship.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Payment Method
// ---------------------------------------------------------------------------

interface PaymentMethodDisplayProps {
  subscription: Subscription
}

export function PaymentMethodDisplay({ subscription }: PaymentMethodDisplayProps) {
  const [showModal, setShowModal] = useState(false)
  const payment = subscription.paymentMethod
  const canEdit = subscription.status === 'active' || subscription.status === 'paused'

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold">Payment Method</h3>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-primary hover:underline"
            >
              Update
            </button>
          )}
        </div>

        {payment?.card ? (
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-10 items-center justify-center rounded bg-muted">
              <span className="text-xs font-medium">
                {formatCardBrand(payment.card.brand).slice(0, 4)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {formatCardBrand(payment.card.brand)} ****{payment.card.lastDigits}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {formatCardExpiry(payment.card.expiryMonth, payment.card.expiryYear)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Payment method on file</p>
        )}
      </CardContent>

      <PaymentMethodModal
        open={showModal}
        onOpenChange={setShowModal}
        subscriptionId={subscription.id}
        currentPaymentMethodId={payment?.id}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Order History
// ---------------------------------------------------------------------------

interface OrderHistoryProps {
  orders: SubscriptionOrder[]
  currencyCode: string
}

export function OrderHistory({ orders, currencyCode }: OrderHistoryProps) {
  if (orders.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-6 text-lg font-semibold">Order History</h3>
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border-b pb-6 last:border-0 last:pb-0">
              {/* Order Header */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">Order #{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.billingDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(order.totalCents, currencyCode)}</p>
                  <Badge
                    variant={
                      order.status === 'delivered'
                        ? 'default'
                        : order.status === 'shipped'
                          ? 'secondary'
                          : order.status === 'failed' || order.status === 'refunded'
                            ? 'destructive'
                            : 'outline'
                    }
                    className={cn(
                      'text-xs capitalize',
                      order.status === 'delivered' && 'bg-emerald-100 text-emerald-700',
                      order.status === 'shipped' && 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>

              {/* Order Breakdown */}
              <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotalCents, currencyCode)}</span>
                </div>
                {order.shippingCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatPrice(order.shippingCents, currencyCode)}</span>
                  </div>
                )}
                {order.taxCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(order.taxCents, currencyCode)}</span>
                  </div>
                )}
                {order.discountCents > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discounts</span>
                    <span>-{formatPrice(order.discountCents, currencyCode)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span>{formatPrice(order.totalCents, currencyCode)}</span>
                </div>
              </div>

              {/* Tracking */}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Track Package
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Frequency Changer
// ---------------------------------------------------------------------------

interface FrequencyChangerProps {
  subscription: Subscription
}

export function FrequencyChanger({ subscription }: FrequencyChangerProps) {
  const canEdit = subscription.status === 'active' || subscription.status === 'paused'

  if (!canEdit) return null

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Delivery Frequency</h3>
        <FrequencySelector
          subscriptionId={subscription.id}
          currentFrequency={subscription.frequency}
        />
      </CardContent>
    </Card>
  )
}
