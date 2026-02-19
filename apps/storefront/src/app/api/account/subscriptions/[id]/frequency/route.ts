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

const VALID_INTERVALS = ['day', 'week', 'month', 'year'] as const
const INTERVAL_TO_FREQUENCY: Record<string, string> = {
  day: 'weekly',
  week: 'weekly',
  month: 'monthly',
  year: 'annually',
}

/**
 * PATCH /api/account/subscriptions/[id]/frequency
 * Update the billing frequency for a subscription
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
    intervalCount?: number
    interval?: string
  } = {}

  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.interval || !body.intervalCount) {
    return NextResponse.json(
      { error: 'interval and intervalCount are required' },
      { status: 400 }
    )
  }

  if (!VALID_INTERVALS.includes(body.interval as (typeof VALID_INTERVALS)[number])) {
    return NextResponse.json(
      { error: `interval must be one of: ${VALID_INTERVALS.join(', ')}` },
      { status: 400 }
    )
  }

  if (body.intervalCount < 1 || body.intervalCount > 12) {
    return NextResponse.json(
      { error: 'intervalCount must be between 1 and 12' },
      { status: 400 }
    )
  }

  // Verify subscription ownership and current status
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
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Subscription not found',
    }
    return NextResponse.json(response, { status: 404 })
  }

  if (!['active', 'paused', 'pending'].includes(existing.status)) {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot update frequency for subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  const frequencyLabel = INTERVAL_TO_FREQUENCY[body.interval] || 'monthly'

  // Update frequency
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        frequency = ${frequencyLabel},
        frequency_interval = ${body.intervalCount},
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
        ${id}, 'frequency_changed', 'Billing frequency updated by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          interval: body.interval,
          intervalCount: body.intervalCount,
          frequency: frequencyLabel,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
