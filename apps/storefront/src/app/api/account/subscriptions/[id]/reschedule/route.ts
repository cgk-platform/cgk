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
 * POST /api/account/subscriptions/[id]/reschedule
 * Reschedule the next order date for a subscription
 */
export async function POST(request: Request, context: RouteContext) {
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
    nextOrderDate?: string
  } = {}

  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.nextOrderDate) {
    return NextResponse.json({ error: 'nextOrderDate is required' }, { status: 400 })
  }

  const newDate = new Date(body.nextOrderDate)
  if (isNaN(newDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  if (newDate <= new Date()) {
    return NextResponse.json(
      { error: 'nextOrderDate must be in the future' },
      { status: 400 }
    )
  }

  // Verify subscription ownership and current status
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{ id: string; status: string; next_billing_date: string | null }>`
      SELECT id, status, next_billing_date FROM subscriptions
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

  if (!['active', 'pending'].includes(existing.status)) {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot reschedule subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  const newDateStr = newDate.toISOString()

  // Update next billing date
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        next_billing_date = ${newDateStr},
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
        ${id}, 'rescheduled', 'Next order rescheduled by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          previousDate: existing.next_billing_date,
          newDate: newDateStr,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
