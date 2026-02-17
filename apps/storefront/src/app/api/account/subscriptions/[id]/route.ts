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
  SubscriptionStatus,
  SubscriptionOrder,
  PaymentMethod,
  SubscriptionDiscount,
  OrderItem,
} from '@/lib/subscriptions/types'
import type { Address } from '@cgk-platform/commerce'

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

function mapRowToSubscriptionOrder(row: SubscriptionOrderRow): SubscriptionOrder {
  const statusMap: Record<string, SubscriptionOrder['status']> = {
    scheduled: 'pending',
    processing: 'processing',
    completed: 'shipped',
    delivered: 'delivered',
    failed: 'failed',
    skipped: 'pending',
    refunded: 'refunded',
  }

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
// API Route Handlers
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/account/subscriptions/[id]
 * Returns subscription details with order history
 */
export async function GET(_request: Request, context: RouteContext) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()
  const { id } = await context.params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch subscription ensuring customer ownership
  const subscriptionResult = await withTenant(tenantSlug, async () => {
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

  const subscriptionRow = subscriptionResult.rows[0]
  if (!subscriptionRow) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  const subscription = mapRowToSubscription(subscriptionRow)

  // Fetch order history
  const ordersResult = await withTenant(tenantSlug, async () => {
    return sql<SubscriptionOrderRow>`
      SELECT
        id, subscription_id, order_id, scheduled_at, billed_at,
        amount_cents, currency, status, failure_reason, created_at
      FROM subscription_orders
      WHERE subscription_id = ${id}
      ORDER BY scheduled_at DESC
      LIMIT 10
    `
  })

  const orders = ordersResult.rows.map(mapRowToSubscriptionOrder)

  return NextResponse.json({
    subscription,
    orders,
  })
}

/**
 * PATCH /api/account/subscriptions/[id]
 * Update subscription (quantity, frequency, shipping address)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()
  const { id } = await context.params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    quantity?: number
    frequency?: string
    frequencyInterval?: number
    shippingAddress?: Address
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Verify subscription ownership
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{ id: string; status: string }>`
      SELECT id, status FROM subscriptions
      WHERE id = ${id}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const existing = existingResult.rows[0]
  if (!existing) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  // Only allow updates on active or paused subscriptions
  if (!['active', 'paused', 'pending'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'Cannot update cancelled or expired subscription' },
      { status: 400 }
    )
  }

  // Build update based on provided fields
  if (body.quantity !== undefined && body.frequency && body.frequencyInterval && body.shippingAddress) {
    const shippingJson = JSON.stringify(body.shippingAddress)
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE subscriptions
        SET
          quantity = ${body.quantity},
          frequency = ${body.frequency},
          frequency_interval = ${body.frequencyInterval},
          shipping_address = ${shippingJson}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
          AND customer_id = ${session.customerId}
      `
    })
  } else if (body.quantity !== undefined) {
    if (body.quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE subscriptions
        SET quantity = ${body.quantity}, updated_at = NOW()
        WHERE id = ${id}
          AND customer_id = ${session.customerId}
      `
    })
  } else if (body.frequency && body.frequencyInterval) {
    const validFrequencies = ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually']
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
    }
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE subscriptions
        SET
          frequency = ${body.frequency},
          frequency_interval = ${body.frequencyInterval},
          updated_at = NOW()
        WHERE id = ${id}
          AND customer_id = ${session.customerId}
      `
    })
  } else if (body.shippingAddress) {
    const shippingJson = JSON.stringify(body.shippingAddress)
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE subscriptions
        SET shipping_address = ${shippingJson}::jsonb, updated_at = NOW()
        WHERE id = ${id}
          AND customer_id = ${session.customerId}
      `
    })
  }

  // Log activity
  await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO subscription_activity (
        subscription_id, activity_type, description,
        actor_type, actor_id, metadata
      )
      VALUES (
        ${id}, 'updated', 'Subscription updated by customer',
        'customer', ${session.customerId}, ${JSON.stringify(body)}::jsonb
      )
    `
  })

  // Fetch and return updated subscription
  const updatedResult = await withTenant(tenantSlug, async () => {
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

  const updatedRow = updatedResult.rows[0]
  if (!updatedRow) {
    return NextResponse.json({ error: 'Failed to fetch updated subscription' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    subscription: mapRowToSubscription(updatedRow),
  })
}
