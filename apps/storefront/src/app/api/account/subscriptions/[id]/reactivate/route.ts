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
 * POST /api/account/subscriptions/[id]/reactivate
 * Reactivate a cancelled subscription
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

  // Check subscription settings for reactivation permission
  const settingsResult = await withTenant(tenantSlug, async () => {
    return sql<{
      allow_reactivation: boolean
    }>`
      SELECT allow_reactivation
      FROM subscription_settings
      WHERE id = 'default'
      LIMIT 1
    `
  })

  const settings = settingsResult.rows[0]
  if (settings && !settings.allow_reactivation) {
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Reactivating subscriptions is not allowed',
    }
    return NextResponse.json(response, { status: 403 })
  }

  // Verify subscription ownership and that it is cancelled
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{ id: string; status: string; frequency: string; frequency_interval: number }>`
      SELECT id, status, frequency, frequency_interval FROM subscriptions
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

  if (existing.status !== 'cancelled') {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot reactivate subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Calculate next billing date based on frequency
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

  // Reactivate the subscription
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        status = 'active',
        cancelled_at = NULL,
        cancel_reason = NULL,
        next_billing_date = ${nextBillingDateStr},
        updated_at = NOW()
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
        ${id}, 'reactivated', 'Subscription reactivated by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({ nextBillingDate: nextBillingDateStr })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
