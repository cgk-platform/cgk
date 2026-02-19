export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { SubscriptionActionResult } from '@/lib/subscriptions/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/account/subscriptions/[id]/order-now
 * Trigger an immediate order for a subscription (process today)
 */
export async function POST(_request: Request, context: RouteContext) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()
  const { id } = await context.params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify subscription ownership and current status
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      status: string
      frequency: string
      frequency_interval: number
      next_billing_date: string | null
    }>`
      SELECT id, status, frequency, frequency_interval, next_billing_date FROM subscriptions
      WHERE id = ${id}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const existing = existingResult.rows[0]
  if (!existing) {
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Subscription not found',
    }
    return NextResponse.json(response, { status: 404 })
  }

  if (existing.status !== 'active') {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot order now for subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Create an immediate scheduled order record
  const orderId = `subord_${Date.now()}`
  await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO subscription_orders (
        id, subscription_id, scheduled_at, status, amount_cents, currency
      )
      SELECT
        ${orderId},
        id,
        NOW(),
        'processing',
        price_cents * quantity,
        currency
      FROM subscriptions
      WHERE id = ${id}
        AND customer_id = ${session.customerId}
    `
  })

  // Calculate next billing date and advance the schedule
  const intervalMap: Record<string, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    bimonthly: 60,
    quarterly: 90,
    semiannually: 180,
    annually: 365,
  }
  const daysToAdd = (intervalMap[existing.frequency] ?? 30) * existing.frequency_interval
  const nextBillingDate = new Date()
  nextBillingDate.setDate(nextBillingDate.getDate() + daysToAdd)
  const nextBillingDateStr = nextBillingDate.toISOString()

  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET next_billing_date = ${nextBillingDateStr}, updated_at = NOW()
      WHERE id = ${id}
        AND customer_id = ${session.customerId}
    `
  })

  // Log activity
  await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO subscription_activity (
        subscription_id, activity_type, description,
        actor_type, actor_id, metadata
      )
      VALUES (
        ${id}, 'order_now', 'Immediate order triggered by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          orderId,
          nextBillingDate: nextBillingDateStr,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
