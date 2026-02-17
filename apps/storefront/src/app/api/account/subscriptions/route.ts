export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type {
  Subscription,
  SubscriptionFrequency,
  SubscriptionItem,
  SubscriptionListResponse,
  SubscriptionStatus,
  PaymentMethod,
  SubscriptionDiscount,
} from '@/lib/subscriptions/types'
import type { Address } from '@cgk-platform/commerce'

// ---------------------------------------------------------------------------
// Database Row Type
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

// ---------------------------------------------------------------------------
// Mapping Helpers
// ---------------------------------------------------------------------------

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

function mapStatus(status: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    paused: 'paused',
    cancelled: 'cancelled',
    expired: 'expired',
    pending: 'active',
    failed: 'failed',
  }
  return statusMap[status] || 'active'
}

function mapRowToSubscription(row: SubscriptionRow): Subscription {
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
      imageUrl: null,
      productHandle: null,
      isSwappable: true,
    },
  ]

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
    shippingCents: 0,
    taxCents: 0,
    totalCents,
    currencyCode: row.currency,
    shippingAddress: row.shipping_address,
    billingAddress: null,
    paymentMethod,
    discounts,
  }
}

// ---------------------------------------------------------------------------
// API Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/account/subscriptions
 * Returns list of customer subscriptions with optional status filter
 */
export async function GET(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const cursor = searchParams.get('cursor')

  const result = await withTenant(tenantSlug, async () => {
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

  const response: SubscriptionListResponse = {
    subscriptions,
    hasMore,
    cursor: nextCursor,
  }

  return NextResponse.json(response)
}
