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
 * POST /api/account/subscriptions/[id]/resume
 * Resume a paused subscription
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

  if (existing.status !== 'paused') {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot resume subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Calculate next billing date if not already set
  let nextBillingDate: string | null = existing.next_billing_date
  if (!nextBillingDate) {
    // Set to 7 days from now as default
    const next = new Date()
    next.setDate(next.getDate() + 7)
    nextBillingDate = next.toISOString()
  }

  // Update subscription status
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        status = 'active',
        paused_at = NULL,
        auto_resume_at = NULL,
        pause_reason = NULL,
        next_billing_date = ${nextBillingDate},
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
        ${id}, 'resumed', 'Subscription resumed by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({ nextBillingDate })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
