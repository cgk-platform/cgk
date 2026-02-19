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
 * POST /api/account/subscriptions/[id]/cancel
 * Cancel a subscription with an optional reason
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
    reasonId?: string
    comment?: string
  } = {}

  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Check subscription settings for cancel permission
  const settingsResult = await withTenant(tenantSlug, async () => {
    return sql<{
      allow_customer_cancel: boolean
    }>`
      SELECT allow_customer_cancel
      FROM subscription_settings
      WHERE id = 'default'
      LIMIT 1
    `
  })

  const settings = settingsResult.rows[0]
  if (settings && !settings.allow_customer_cancel) {
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Cancelling subscriptions is not allowed',
    }
    return NextResponse.json(response, { status: 403 })
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

  if (['cancelled', 'expired'].includes(existing.status)) {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Subscription is already ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  const reasonId = body.reasonId || null
  const comment = body.comment || null

  // Cancel the subscription
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancel_reason = ${comment ?? reasonId},
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
        ${id}, 'cancelled', 'Subscription cancelled by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({ reasonId, comment })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
