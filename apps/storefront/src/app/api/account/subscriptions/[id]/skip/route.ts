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
 * POST /api/account/subscriptions/[id]/skip
 * Skip the next delivery for a subscription
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

  // Check subscription settings for skip permission
  const settingsResult = await withTenant(tenantSlug, async () => {
    return sql<{
      allow_skip_orders: boolean
      max_skips_per_year: number
    }>`
      SELECT allow_skip_orders, max_skips_per_year
      FROM subscription_settings
      WHERE id = 'default'
      LIMIT 1
    `
  })

  const settings = settingsResult.rows[0]
  if (settings && !settings.allow_skip_orders) {
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Skipping orders is not allowed',
    }
    return NextResponse.json(response, { status: 403 })
  }

  // Verify subscription ownership and current status
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      status: string
      frequency: string
      frequency_interval: number
      next_billing_date: string | null
      skipped_orders: number
    }>`
      SELECT id, status, frequency, frequency_interval, next_billing_date, skipped_orders
      FROM subscriptions
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

  if (existing.status !== 'active' && existing.status !== 'pending') {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot skip order for subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Check skip limit
  const maxSkips = settings?.max_skips_per_year ?? 4
  if (existing.skipped_orders >= maxSkips) {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Maximum of ${maxSkips} skips per year reached`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Calculate new next billing date based on frequency
  let newNextBillingDate: Date
  if (existing.next_billing_date) {
    newNextBillingDate = new Date(existing.next_billing_date)
  } else {
    newNextBillingDate = new Date()
  }

  // Add interval based on frequency
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
  newNextBillingDate.setDate(newNextBillingDate.getDate() + daysToAdd)

  const newNextBillingDateStr = newNextBillingDate.toISOString()

  // Mark the current scheduled order as skipped
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscription_orders
      SET status = 'skipped', updated_at = NOW()
      WHERE subscription_id = ${id}
        AND status = 'scheduled'
        AND scheduled_at = (
          SELECT MIN(scheduled_at)
          FROM subscription_orders
          WHERE subscription_id = ${id}
            AND status = 'scheduled'
        )
    `
  })

  // Update subscription with new next billing date and increment skip counter
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        next_billing_date = ${newNextBillingDateStr},
        skipped_orders = skipped_orders + 1,
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
        ${id}, 'skipped', 'Next order skipped by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          previousNextBillingDate: existing.next_billing_date,
          newNextBillingDate: newNextBillingDateStr,
          totalSkips: existing.skipped_orders + 1,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
