/**
 * Subscription Service
 *
 * Core service layer for subscription management operations.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk/db'

import type {
  Subscription,
  SubscriptionListItem,
  SubscriptionOrder,
  SubscriptionActivity,
  SubscriptionFilters,
  SubscriptionSettings,
  SubscriptionStatus,
  SubscriptionFrequency,
} from './types'

// Row type from database
interface SubscriptionRow {
  id: string
  provider: string
  provider_subscription_id: string | null
  shopify_subscription_id: string | null
  customer_id: string
  customer_email: string
  customer_name: string | null
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
  last_billing_date: string | null
  billing_anchor_day: number | null
  payment_method_id: string | null
  payment_method_last4: string | null
  payment_method_brand: string | null
  payment_method_exp_month: number | null
  payment_method_exp_year: number | null
  shipping_address: Record<string, unknown> | null
  total_orders: number
  total_spent_cents: number
  skipped_orders: number
  selling_plan_id: string | null
  selling_plan_name: string | null
  metadata: Record<string, unknown>
  notes: string | null
  tags: string[] | null
  last_synced_at: string | null
  sync_error: string | null
  started_at: string
  created_at: string
  updated_at: string
}

// Map database row to Subscription type
function mapRowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    provider: row.provider as Subscription['provider'],
    providerSubscriptionId: row.provider_subscription_id,
    shopifySubscriptionId: row.shopify_subscription_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    productId: row.product_id,
    variantId: row.variant_id,
    productTitle: row.product_title,
    variantTitle: row.variant_title,
    quantity: row.quantity,
    priceCents: row.price_cents,
    discountCents: row.discount_cents,
    discountType: row.discount_type,
    discountCode: row.discount_code,
    currency: row.currency,
    frequency: row.frequency as SubscriptionFrequency,
    frequencyInterval: row.frequency_interval,
    status: row.status as SubscriptionStatus,
    pauseReason: row.pause_reason,
    cancelReason: row.cancel_reason,
    pausedAt: row.paused_at,
    cancelledAt: row.cancelled_at,
    autoResumeAt: row.auto_resume_at,
    nextBillingDate: row.next_billing_date,
    lastBillingDate: row.last_billing_date,
    billingAnchorDay: row.billing_anchor_day,
    paymentMethodId: row.payment_method_id,
    paymentMethodLast4: row.payment_method_last4,
    paymentMethodBrand: row.payment_method_brand,
    paymentMethodExpMonth: row.payment_method_exp_month,
    paymentMethodExpYear: row.payment_method_exp_year,
    shippingAddress: row.shipping_address as Subscription['shippingAddress'],
    totalOrders: row.total_orders,
    totalSpentCents: row.total_spent_cents,
    skippedOrders: row.skipped_orders,
    sellingPlanId: row.selling_plan_id,
    sellingPlanName: row.selling_plan_name,
    metadata: row.metadata || {},
    notes: row.notes,
    tags: row.tags || [],
    lastSyncedAt: row.last_synced_at,
    syncError: row.sync_error,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get a single subscription by ID
 */
export async function getSubscription(
  tenantSlug: string,
  subscriptionId: string
): Promise<Subscription | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscriptions WHERE id = ${subscriptionId}
    `
    if (result.rows.length === 0) return null
    return mapRowToSubscription(result.rows[0] as SubscriptionRow)
  })
}

/**
 * List subscriptions with filtering and pagination
 */
export async function listSubscriptions(
  tenantSlug: string,
  filters: SubscriptionFilters
): Promise<{ subscriptions: SubscriptionListItem[]; total: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    // Build conditions
    if (filters.status && filters.status !== 'all') {
      paramIndex++
      conditions.push(`status = $${paramIndex}::subscription_status`)
      values.push(filters.status)
    }

    if (filters.product) {
      paramIndex++
      conditions.push(`product_id = $${paramIndex}`)
      values.push(filters.product)
    }

    if (filters.frequency) {
      paramIndex++
      conditions.push(`frequency = $${paramIndex}::subscription_frequency`)
      values.push(filters.frequency)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(
        customer_email ILIKE $${paramIndex} OR
        customer_name ILIKE $${paramIndex} OR
        product_title ILIKE $${paramIndex}
      )`)
      values.push(`%${filters.search}%`)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`created_at >= $${paramIndex}`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`created_at <= $${paramIndex}`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Validate sort column
    const allowedSorts = [
      'created_at',
      'next_billing_date',
      'customer_email',
      'product_title',
      'status',
      'total_spent_cents',
    ]
    const sortColumn = allowedSorts.includes(filters.sort) ? filters.sort : 'created_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    // Add pagination params
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        id, customer_email, customer_name, product_title, variant_title,
        quantity, price_cents, currency, frequency, status,
        next_billing_date, total_orders, total_spent_cents, created_at
       FROM subscriptions
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM subscriptions ${whereClause}`,
      countValues
    )

    const subscriptions: SubscriptionListItem[] = dataResult.rows.map((row) => ({
      id: row.id as string,
      customerEmail: row.customer_email as string,
      customerName: row.customer_name as string | null,
      productTitle: row.product_title as string,
      variantTitle: row.variant_title as string | null,
      quantity: row.quantity as number,
      priceCents: row.price_cents as number,
      currency: row.currency as string,
      frequency: row.frequency as SubscriptionFrequency,
      status: row.status as SubscriptionStatus,
      nextBillingDate: row.next_billing_date as string | null,
      totalOrders: row.total_orders as number,
      totalSpentCents: row.total_spent_cents as number,
      createdAt: row.created_at as string,
    }))

    return {
      subscriptions,
      total: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get subscription orders/charges
 */
export async function getSubscriptionOrders(
  tenantSlug: string,
  subscriptionId: string
): Promise<SubscriptionOrder[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_orders
      WHERE subscription_id = ${subscriptionId}
      ORDER BY scheduled_at DESC
    `
    return result.rows.map((row) => ({
      id: row.id as string,
      subscriptionId: row.subscription_id as string,
      orderId: row.order_id as string | null,
      scheduledAt: row.scheduled_at as string,
      billedAt: row.billed_at as string | null,
      amountCents: row.amount_cents as number,
      currency: row.currency as string,
      status: row.status as SubscriptionOrder['status'],
      failureReason: row.failure_reason as string | null,
      retryCount: row.retry_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))
  })
}

/**
 * Get subscription activity log
 */
export async function getSubscriptionActivity(
  tenantSlug: string,
  subscriptionId: string
): Promise<SubscriptionActivity[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_activity
      WHERE subscription_id = ${subscriptionId}
      ORDER BY created_at DESC
      LIMIT 100
    `
    return result.rows.map((row) => ({
      id: row.id as string,
      subscriptionId: row.subscription_id as string,
      activityType: row.activity_type as string,
      description: row.description as string | null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      actorType: row.actor_type as SubscriptionActivity['actorType'],
      actorId: row.actor_id as string | null,
      actorName: row.actor_name as string | null,
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Log subscription activity
 */
export async function logActivity(
  tenantSlug: string,
  subscriptionId: string,
  activityType: string,
  description: string,
  actorType: 'customer' | 'admin' | 'system' = 'system',
  actorId?: string,
  actorName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO subscription_activity (
        subscription_id, activity_type, description,
        actor_type, actor_id, actor_name, metadata
      )
      VALUES (
        ${subscriptionId}, ${activityType}, ${description},
        ${actorType}, ${actorId || null}, ${actorName || null},
        ${JSON.stringify(metadata || {})}
      )
    `
  })
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  tenantSlug: string,
  subscriptionId: string,
  reason: string,
  resumeDate?: Date,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscriptions
      SET
        status = 'paused'::subscription_status,
        pause_reason = ${reason},
        paused_at = NOW(),
        auto_resume_at = ${resumeDate?.toISOString() || null},
        updated_at = NOW()
      WHERE id = ${subscriptionId}
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'paused',
    `Subscription paused: ${reason}`,
    actorId ? 'admin' : 'system',
    actorId,
    actorName,
    { reason, resumeDate: resumeDate?.toISOString() }
  )
}

/**
 * Resume a subscription
 */
export async function resumeSubscription(
  tenantSlug: string,
  subscriptionId: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscriptions
      SET
        status = 'active'::subscription_status,
        pause_reason = NULL,
        paused_at = NULL,
        auto_resume_at = NULL,
        updated_at = NOW()
      WHERE id = ${subscriptionId}
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'resumed',
    'Subscription resumed',
    actorId ? 'admin' : 'system',
    actorId,
    actorName
  )
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  tenantSlug: string,
  subscriptionId: string,
  reason: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscriptions
      SET
        status = 'cancelled'::subscription_status,
        cancel_reason = ${reason},
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = ${subscriptionId}
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'cancelled',
    `Subscription cancelled: ${reason}`,
    actorId ? 'admin' : 'system',
    actorId,
    actorName,
    { reason }
  )
}

/**
 * Skip next order
 */
export async function skipNextOrder(
  tenantSlug: string,
  subscriptionId: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    // Update skipped_orders count
    await sql`
      UPDATE subscriptions
      SET skipped_orders = skipped_orders + 1, updated_at = NOW()
      WHERE id = ${subscriptionId}
    `

    // Mark next scheduled order as skipped
    await sql`
      UPDATE subscription_orders
      SET status = 'skipped', updated_at = NOW()
      WHERE subscription_id = ${subscriptionId}
        AND status = 'scheduled'
        AND scheduled_at = (
          SELECT MIN(scheduled_at)
          FROM subscription_orders
          WHERE subscription_id = ${subscriptionId} AND status = 'scheduled'
        )
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'order_skipped',
    'Next order skipped',
    actorId ? 'admin' : 'system',
    actorId,
    actorName
  )
}

/**
 * Update subscription frequency
 */
export async function updateFrequency(
  tenantSlug: string,
  subscriptionId: string,
  frequency: SubscriptionFrequency,
  interval: number = 1,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscriptions
      SET
        frequency = ${frequency}::subscription_frequency,
        frequency_interval = ${interval},
        updated_at = NOW()
      WHERE id = ${subscriptionId}
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'frequency_changed',
    `Frequency changed to ${frequency} (every ${interval})`,
    actorId ? 'admin' : 'system',
    actorId,
    actorName,
    { frequency, interval }
  )
}

/**
 * Update subscription quantity
 */
export async function updateQuantity(
  tenantSlug: string,
  subscriptionId: string,
  quantity: number,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscriptions
      SET quantity = ${quantity}, updated_at = NOW()
      WHERE id = ${subscriptionId}
    `
  })

  await logActivity(
    tenantSlug,
    subscriptionId,
    'quantity_changed',
    `Quantity changed to ${quantity}`,
    actorId ? 'admin' : 'system',
    actorId,
    actorName,
    { quantity }
  )
}

/**
 * Get subscription settings
 */
export async function getSettings(tenantSlug: string): Promise<SubscriptionSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`SELECT * FROM subscription_settings WHERE id = 'default'`
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      primaryProvider: row.primary_provider as SubscriptionSettings['primaryProvider'],
      billingProvider: row.billing_provider as SubscriptionSettings['billingProvider'],
      loopApiKey: row.loop_api_key as string | null,
      loopWebhookSecret: row.loop_webhook_secret as string | null,
      rechargeApiKey: row.recharge_api_key as string | null,
      defaultPauseDays: row.default_pause_days as number,
      maxPauseDays: row.max_pause_days as number,
      autoResumeAfterPause: row.auto_resume_after_pause as boolean,
      maxSkipsPerYear: row.max_skips_per_year as number,
      cancellationGraceDays: row.cancellation_grace_days as number,
      renewalReminderDays: row.renewal_reminder_days as number,
      paymentRetryAttempts: row.payment_retry_attempts as number,
      paymentRetryIntervalHours: row.payment_retry_interval_hours as number,
      allowCustomerCancel: row.allow_customer_cancel as boolean,
      allowCustomerPause: row.allow_customer_pause as boolean,
      allowFrequencyChanges: row.allow_frequency_changes as boolean,
      allowQuantityChanges: row.allow_quantity_changes as boolean,
      allowSkipOrders: row.allow_skip_orders as boolean,
      shopifySyncEnabled: row.shopify_sync_enabled as boolean,
      shopifyWebhookUrl: row.shopify_webhook_url as string | null,
      updatedAt: row.updated_at as string,
    }
  })
}

/**
 * Update subscription settings
 */
export async function updateSettings(
  tenantSlug: string,
  settings: Partial<SubscriptionSettings>
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    // Insert or update settings
    await sql`
      INSERT INTO subscription_settings (id)
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING
    `

    // Build update query dynamically
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    const fieldMap: Record<string, string> = {
      primaryProvider: 'primary_provider',
      billingProvider: 'billing_provider',
      loopApiKey: 'loop_api_key',
      loopWebhookSecret: 'loop_webhook_secret',
      rechargeApiKey: 'recharge_api_key',
      defaultPauseDays: 'default_pause_days',
      maxPauseDays: 'max_pause_days',
      autoResumeAfterPause: 'auto_resume_after_pause',
      maxSkipsPerYear: 'max_skips_per_year',
      cancellationGraceDays: 'cancellation_grace_days',
      renewalReminderDays: 'renewal_reminder_days',
      paymentRetryAttempts: 'payment_retry_attempts',
      paymentRetryIntervalHours: 'payment_retry_interval_hours',
      allowCustomerCancel: 'allow_customer_cancel',
      allowCustomerPause: 'allow_customer_pause',
      allowFrequencyChanges: 'allow_frequency_changes',
      allowQuantityChanges: 'allow_quantity_changes',
      allowSkipOrders: 'allow_skip_orders',
      shopifySyncEnabled: 'shopify_sync_enabled',
      shopifyWebhookUrl: 'shopify_webhook_url',
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in settings) {
        paramIndex++
        updates.push(`${dbField} = $${paramIndex}`)
        values.push(settings[key as keyof typeof settings])
      }
    }

    if (updates.length > 0) {
      await sql.query(
        `UPDATE subscription_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = 'default'`,
        values
      )
    }
  })
}

/**
 * Get subscription statistics/counts by status
 */
export async function getStatusCounts(
  tenantSlug: string
): Promise<Record<SubscriptionStatus | 'all', number>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `

    const counts: Record<string, number> = {
      all: 0,
      active: 0,
      paused: 0,
      cancelled: 0,
      expired: 0,
      pending: 0,
    }

    for (const row of result.rows) {
      const status = row.status as string
      const count = Number(row.count)
      counts[status] = count
      counts.all += count
    }

    return counts as Record<SubscriptionStatus | 'all', number>
  })
}

/**
 * Get MRR (Monthly Recurring Revenue)
 */
export async function getMRR(tenantSlug: string): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        SUM(
          CASE frequency
            WHEN 'weekly' THEN (price_cents - discount_cents) * quantity * 4.33
            WHEN 'biweekly' THEN (price_cents - discount_cents) * quantity * 2.17
            WHEN 'monthly' THEN (price_cents - discount_cents) * quantity
            WHEN 'bimonthly' THEN (price_cents - discount_cents) * quantity / 2
            WHEN 'quarterly' THEN (price_cents - discount_cents) * quantity / 3
            WHEN 'semiannually' THEN (price_cents - discount_cents) * quantity / 6
            WHEN 'annually' THEN (price_cents - discount_cents) * quantity / 12
            ELSE (price_cents - discount_cents) * quantity
          END / frequency_interval
        ) as mrr
      FROM subscriptions
      WHERE status = 'active'
    `
    return Number(result.rows[0]?.mrr || 0)
  })
}
