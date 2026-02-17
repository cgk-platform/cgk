/**
 * Server-side subscription data fetching
 *
 * This file is for use in Server Components only.
 * It uses 'server-only' to prevent accidental import in client components.
 *
 * These functions query the tenant database directly, enabling
 * efficient data fetching in Server Components.
 */

import 'server-only'

import type {
  Subscription,
  SubscriptionFilters,
  SubscriptionFrequency,
  SubscriptionItem,
  SubscriptionListResponse,
  SubscriptionOrder,
  SubscriptionStatus,
  PaymentMethod,
  SubscriptionDiscount,
  OrderItem,
} from './types'

import type { Address } from '@cgk-platform/commerce'
import { sql, withTenant } from '@cgk-platform/db'
import { getTenantConfig } from '@/lib/tenant'
import { getCustomerSession } from '@/lib/customer-session'

// ---------------------------------------------------------------------------
// Database Row Types
// ---------------------------------------------------------------------------

interface SubscriptionRow {
  id: string
  provider_subscription_id: string | null
  customer_id: string
  customer_email: string
  product_id: string
  variant_id: string | null
  product_title: string
  variant_title: string | null
  quantity: number
  price_cents: number
  discount_cents: number
  discount_type: string | null
  discount_code: string | null
  currency: string
  frequency: string
  frequency_interval: number
  status: string
  pause_reason: string | null
  cancel_reason: string | null
  paused_at: string | null
  cancelled_at: string | null
  auto_resume_at: string | null
  next_billing_date: string | null
  payment_method_id: string | null
  payment_method_last4: string | null
  payment_method_brand: string | null
  payment_method_exp_month: number | null
  payment_method_exp_year: number | null
  shipping_address: Address | null
  total_orders: number
  total_spent_cents: number
  skipped_orders: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface SubscriptionOrderRow {
  id: string
  subscription_id: string
  order_id: string | null
  scheduled_at: string
  billed_at: string | null
  amount_cents: number
  currency: string
  status: string
  failure_reason: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Get subscription provider config for the current tenant.
 */
async function getProviderConfig() {
  const config = await getTenantConfig()
  if (!config) {
    throw new Error('Tenant configuration not found')
  }
  return config
}

/**
 * Map frequency enum to SubscriptionFrequency type
 */
function mapFrequency(frequency: string, interval: number): SubscriptionFrequency {
  const intervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
    weekly: 'week',
    biweekly: 'week',
    monthly: 'month',
    bimonthly: 'month',
    quarterly: 'month',
    semiannually: 'month',
    annually: 'year',
  }

  const intervalCountMap: Record<string, number> = {
    weekly: 1,
    biweekly: 2,
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    semiannually: 6,
    annually: 1,
  }

  const frequencyInterval = intervalMap[frequency] || 'month'
  const baseCount = intervalCountMap[frequency] || 1
  const finalCount = baseCount * interval

  // Generate human-readable label
  let label: string
  if (finalCount === 1) {
    label = `Every ${frequencyInterval}`
  } else {
    label = `Every ${finalCount} ${frequencyInterval}s`
  }

  return {
    intervalCount: finalCount,
    interval: frequencyInterval,
    label,
  }
}

/**
 * Map subscription status from database enum to API type
 */
function mapStatus(status: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    paused: 'paused',
    cancelled: 'cancelled',
    expired: 'expired',
    pending: 'active', // Map pending to active for customer display
    failed: 'failed',
  }
  return statusMap[status] || 'active'
}

/**
 * Map database row to Subscription type
 */
function mapRowToSubscription(row: SubscriptionRow): Subscription {
  // Build payment method if available
  let paymentMethod: PaymentMethod | null = null
  if (row.payment_method_id && row.payment_method_last4) {
    paymentMethod = {
      id: row.payment_method_id,
      type: 'card',
      isDefault: true,
      card: {
        brand: row.payment_method_brand || 'unknown',
        lastDigits: row.payment_method_last4,
        expiryMonth: row.payment_method_exp_month || 0,
        expiryYear: row.payment_method_exp_year || 0,
      },
    }
  }

  // Build discounts array
  const discounts: SubscriptionDiscount[] = []
  if (row.discount_cents > 0 && row.discount_type) {
    discounts.push({
      id: `discount_${row.id}`,
      code: row.discount_code,
      title: row.discount_code ? `Discount: ${row.discount_code}` : 'Applied Discount',
      type: row.discount_type === 'percentage' ? 'percentage' : 'fixed_amount',
      value: row.discount_cents,
      appliesTo: 'order',
    })
  }

  // Build single item from subscription (subscriptions table has product info directly)
  const items: SubscriptionItem[] = [
    {
      id: `item_${row.id}`,
      productId: row.product_id,
      variantId: row.variant_id || row.product_id,
      title: row.product_title,
      variantTitle: row.variant_title,
      quantity: row.quantity,
      priceCents: row.price_cents,
      originalPriceCents: row.discount_cents > 0 ? row.price_cents + row.discount_cents : null,
      imageUrl: null, // Would need join with products table
      productHandle: null,
      isSwappable: true,
    },
  ]

  // Calculate totals (simplified - real implementation would have separate shipping/tax)
  const subtotalCents = row.price_cents * row.quantity
  const totalCents = subtotalCents - row.discount_cents

  return {
    id: row.id,
    externalId: row.provider_subscription_id || row.id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    status: mapStatus(row.status),
    frequency: mapFrequency(row.frequency, row.frequency_interval),
    nextOrderDate: row.next_billing_date ? new Date(row.next_billing_date) : null,
    pausedUntil: row.auto_resume_at ? new Date(row.auto_resume_at) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    cancellationReason: row.cancel_reason,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    items,
    subtotalCents,
    discountCents: row.discount_cents,
    shippingCents: 0, // Would come from separate calculation
    taxCents: 0, // Would come from separate calculation
    totalCents,
    currencyCode: row.currency,
    shippingAddress: row.shipping_address,
    billingAddress: null, // Would need separate storage
    paymentMethod,
    discounts,
  }
}

/**
 * Map subscription order row to SubscriptionOrder type
 */
function mapRowToSubscriptionOrder(row: SubscriptionOrderRow): SubscriptionOrder {
  // Map status
  const statusMap: Record<string, SubscriptionOrder['status']> = {
    scheduled: 'pending',
    processing: 'processing',
    completed: 'shipped',
    delivered: 'delivered',
    failed: 'failed',
    skipped: 'pending',
    refunded: 'refunded',
  }

  // Build empty items array (would need join with actual order data)
  const items: OrderItem[] = []

  return {
    id: row.id,
    orderNumber: row.order_id || row.id,
    status: statusMap[row.status] || 'pending',
    billingDate: new Date(row.scheduled_at),
    shippedDate: row.status === 'completed' && row.billed_at ? new Date(row.billed_at) : null,
    deliveredDate: row.status === 'delivered' && row.billed_at ? new Date(row.billed_at) : null,
    subtotalCents: row.amount_cents,
    shippingCents: 0,
    taxCents: 0,
    discountCents: 0,
    totalCents: row.amount_cents,
    currencyCode: row.currency,
    trackingNumber: null,
    trackingUrl: null,
    items,
  }
}

// ---------------------------------------------------------------------------
// Server-side Data Fetching Functions
// ---------------------------------------------------------------------------

/**
 * List subscriptions for the current customer (server-side)
 */
export async function listSubscriptionsServer(
  filters?: SubscriptionFilters
): Promise<SubscriptionListResponse> {
  const config = await getProviderConfig()
  const session = await getCustomerSession()

  if (!session) {
    return {
      subscriptions: [],
      hasMore: false,
      cursor: null,
    }
  }

  const limit = filters?.limit ?? 20
  const status = filters?.status
  const cursor = filters?.cursor

  const result = await withTenant(config.slug, async () => {
    // Build query based on filters
    if (status && status !== 'all') {
      if (cursor) {
        return sql<SubscriptionRow>`
          SELECT
            id, provider_subscription_id, customer_id, customer_email,
            product_id, variant_id, product_title, variant_title, quantity,
            price_cents, discount_cents, discount_type, discount_code, currency,
            frequency, frequency_interval, status, pause_reason, cancel_reason,
            paused_at, cancelled_at, auto_resume_at, next_billing_date,
            payment_method_id, payment_method_last4, payment_method_brand,
            payment_method_exp_month, payment_method_exp_year, shipping_address,
            total_orders, total_spent_cents, skipped_orders, metadata,
            created_at, updated_at
          FROM subscriptions
          WHERE customer_id = ${session.customerId}
            AND status = ${status}
            AND id < ${cursor}
          ORDER BY created_at DESC
          LIMIT ${limit + 1}
        `
      }
      return sql<SubscriptionRow>`
        SELECT
          id, provider_subscription_id, customer_id, customer_email,
          product_id, variant_id, product_title, variant_title, quantity,
          price_cents, discount_cents, discount_type, discount_code, currency,
          frequency, frequency_interval, status, pause_reason, cancel_reason,
          paused_at, cancelled_at, auto_resume_at, next_billing_date,
          payment_method_id, payment_method_last4, payment_method_brand,
          payment_method_exp_month, payment_method_exp_year, shipping_address,
          total_orders, total_spent_cents, skipped_orders, metadata,
          created_at, updated_at
        FROM subscriptions
        WHERE customer_id = ${session.customerId}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `
    }

    if (cursor) {
      return sql<SubscriptionRow>`
        SELECT
          id, provider_subscription_id, customer_id, customer_email,
          product_id, variant_id, product_title, variant_title, quantity,
          price_cents, discount_cents, discount_type, discount_code, currency,
          frequency, frequency_interval, status, pause_reason, cancel_reason,
          paused_at, cancelled_at, auto_resume_at, next_billing_date,
          payment_method_id, payment_method_last4, payment_method_brand,
          payment_method_exp_month, payment_method_exp_year, shipping_address,
          total_orders, total_spent_cents, skipped_orders, metadata,
          created_at, updated_at
        FROM subscriptions
        WHERE customer_id = ${session.customerId}
          AND id < ${cursor}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `
    }

    return sql<SubscriptionRow>`
      SELECT
        id, provider_subscription_id, customer_id, customer_email,
        product_id, variant_id, product_title, variant_title, quantity,
        price_cents, discount_cents, discount_type, discount_code, currency,
        frequency, frequency_interval, status, pause_reason, cancel_reason,
        paused_at, cancelled_at, auto_resume_at, next_billing_date,
        payment_method_id, payment_method_last4, payment_method_brand,
        payment_method_exp_month, payment_method_exp_year, shipping_address,
        total_orders, total_spent_cents, skipped_orders, metadata,
        created_at, updated_at
      FROM subscriptions
      WHERE customer_id = ${session.customerId}
      ORDER BY created_at DESC
      LIMIT ${limit + 1}
    `
  })

  const rows = result.rows
  const hasMore = rows.length > limit
  const subscriptions = rows.slice(0, limit).map(mapRowToSubscription)
  const lastSubscription = subscriptions[subscriptions.length - 1]
  const nextCursor = hasMore && lastSubscription ? lastSubscription.id : null

  return {
    subscriptions,
    hasMore,
    cursor: nextCursor,
  }
}

/**
 * Get a single subscription by ID (server-side)
 *
 * Validates that the subscription belongs to the current customer.
 */
export async function getSubscriptionServer(id: string): Promise<Subscription | null> {
  const config = await getProviderConfig()
  const session = await getCustomerSession()

  if (!session) {
    return null
  }

  const result = await withTenant(config.slug, async () => {
    return sql<SubscriptionRow>`
      SELECT
        id, provider_subscription_id, customer_id, customer_email,
        product_id, variant_id, product_title, variant_title, quantity,
        price_cents, discount_cents, discount_type, discount_code, currency,
        frequency, frequency_interval, status, pause_reason, cancel_reason,
        paused_at, cancelled_at, auto_resume_at, next_billing_date,
        payment_method_id, payment_method_last4, payment_method_brand,
        payment_method_exp_month, payment_method_exp_year, shipping_address,
        total_orders, total_spent_cents, skipped_orders, metadata,
        created_at, updated_at
      FROM subscriptions
      WHERE id = ${id}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToSubscription(row)
}

/**
 * Get order history for a subscription (server-side)
 *
 * Validates that the subscription belongs to the current customer.
 */
export async function getSubscriptionOrdersServer(
  subscriptionId: string,
  limit = 10
): Promise<SubscriptionOrder[]> {
  const config = await getProviderConfig()
  const session = await getCustomerSession()

  if (!session) {
    return []
  }

  // First verify the subscription belongs to this customer
  const subscriptionResult = await withTenant(config.slug, async () => {
    return sql<{ id: string }>`
      SELECT id FROM subscriptions
      WHERE id = ${subscriptionId}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  if (!subscriptionResult.rows[0]) {
    return []
  }

  // Fetch subscription orders
  const result = await withTenant(config.slug, async () => {
    return sql<SubscriptionOrderRow>`
      SELECT
        id, subscription_id, order_id, scheduled_at, billed_at,
        amount_cents, currency, status, failure_reason, created_at
      FROM subscription_orders
      WHERE subscription_id = ${subscriptionId}
      ORDER BY scheduled_at DESC
      LIMIT ${limit}
    `
  })

  return result.rows.map(mapRowToSubscriptionOrder)
}
