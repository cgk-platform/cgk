/**
 * Subscription types for customer portal
 *
 * Provider-agnostic types that work with Loop, ReCharge, Bold, or Shopify native.
 * These types are used by the customer-facing subscription management UI.
 */

import type { Address, Money } from '@cgk/commerce'

// ---------------------------------------------------------------------------
// Subscription Core Types
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'failed'

export interface Subscription {
  id: string
  externalId: string
  customerId: string
  customerEmail: string
  status: SubscriptionStatus
  frequency: SubscriptionFrequency
  nextOrderDate: Date | null
  pausedUntil: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date

  // Line items
  items: SubscriptionItem[]

  // Pricing (all in cents)
  subtotalCents: number
  discountCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  currencyCode: string

  // Addresses
  shippingAddress: Address | null
  billingAddress: Address | null

  // Payment
  paymentMethod: PaymentMethod | null

  // Discounts applied
  discounts: SubscriptionDiscount[]
}

export interface SubscriptionItem {
  id: string
  productId: string
  variantId: string
  title: string
  variantTitle: string | null
  quantity: number
  priceCents: number
  originalPriceCents: number | null
  imageUrl: string | null
  productHandle: string | null
  isSwappable: boolean
}

export interface SubscriptionFrequency {
  intervalCount: number
  interval: 'day' | 'week' | 'month' | 'year'
  label: string
}

export interface SubscriptionDiscount {
  id: string
  code: string | null
  title: string
  type: 'percentage' | 'fixed_amount' | 'free_shipping'
  value: number
  appliesTo: 'order' | 'shipping' | 'line_item'
}

// ---------------------------------------------------------------------------
// Payment Types
// ---------------------------------------------------------------------------

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank' | 'other'
  isDefault: boolean
  card: CardDetails | null
}

export interface CardDetails {
  brand: string
  lastDigits: string
  expiryMonth: number
  expiryYear: number
}

// ---------------------------------------------------------------------------
// Order History Types
// ---------------------------------------------------------------------------

export interface SubscriptionOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'failed' | 'refunded'
  billingDate: Date
  shippedDate: Date | null
  deliveredDate: Date | null
  subtotalCents: number
  shippingCents: number
  taxCents: number
  discountCents: number
  totalCents: number
  currencyCode: string
  trackingNumber: string | null
  trackingUrl: string | null
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  title: string
  variantTitle: string | null
  quantity: number
  priceCents: number
  imageUrl: string | null
}

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export interface PauseOptions {
  resumeDate?: Date
  reason?: string
}

export interface FrequencyOption {
  intervalCount: number
  interval: 'day' | 'week' | 'month' | 'year'
  label: string
  isRecommended?: boolean
}

export interface SwappableProduct {
  id: string
  variantId: string
  title: string
  variantTitle: string | null
  priceCents: number
  imageUrl: string | null
  isAvailable: boolean
}

export interface CancellationReason {
  id: string
  label: string
  requiresComment: boolean
}

export interface SaveOffer {
  id: string
  type: 'discount' | 'pause' | 'frequency' | 'skip'
  title: string
  description: string
  value: string | null
  discountPercent: number | null
  pauseDays: number | null
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

export interface SubscriptionListResponse {
  subscriptions: Subscription[]
  hasMore: boolean
  cursor: string | null
}

export interface SubscriptionActionResult {
  success: boolean
  subscription?: Subscription
  error?: string
}

// ---------------------------------------------------------------------------
// Filter Types
// ---------------------------------------------------------------------------

export interface SubscriptionFilters {
  status?: SubscriptionStatus | 'all'
  limit?: number
  cursor?: string
}
