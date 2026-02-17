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
 * POST /api/account/subscriptions/[id]/pause
 * Pause a subscription with optional resume date
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
    resumeDate?: string
    reason?: string
  } = {}

  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Check subscription settings for pause permission
  const settingsResult = await withTenant(tenantSlug, async () => {
    return sql<{
      allow_customer_pause: boolean
      default_pause_days: number
      max_pause_days: number
    }>`
      SELECT allow_customer_pause, default_pause_days, max_pause_days
      FROM subscription_settings
      WHERE id = 'default'
      LIMIT 1
    `
  })

  const settings = settingsResult.rows[0]
  if (settings && !settings.allow_customer_pause) {
    const response: SubscriptionActionResult = {
      success: false,
      error: 'Pausing subscriptions is not allowed',
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

  if (existing.status !== 'active' && existing.status !== 'pending') {
    const response: SubscriptionActionResult = {
      success: false,
      error: `Cannot pause subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Calculate resume date
  let resumeAt: Date | null = null
  if (body.resumeDate) {
    resumeAt = new Date(body.resumeDate)
    const maxDays = settings?.max_pause_days ?? 90
    const maxResumeDate = new Date()
    maxResumeDate.setDate(maxResumeDate.getDate() + maxDays)

    if (resumeAt > maxResumeDate) {
      const response: SubscriptionActionResult = {
        success: false,
        error: `Cannot pause for more than ${maxDays} days`,
      }
      return NextResponse.json(response, { status: 400 })
    }
  } else if (settings?.default_pause_days) {
    resumeAt = new Date()
    resumeAt.setDate(resumeAt.getDate() + settings.default_pause_days)
  }

  // Update subscription status
  const resumeAtStr = resumeAt ? resumeAt.toISOString() : null
  const reason = body.reason || null

  await withTenant(tenantSlug, async () => {
    if (resumeAtStr) {
      return sql`
        UPDATE subscriptions
        SET
          status = 'paused',
          paused_at = NOW(),
          auto_resume_at = ${resumeAtStr},
          pause_reason = ${reason},
          updated_at = NOW()
        WHERE id = ${id}
          AND customer_id = ${session.customerId}
      `
    }
    return sql`
      UPDATE subscriptions
      SET
        status = 'paused',
        paused_at = NOW(),
        pause_reason = ${reason},
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
        ${id}, 'paused', 'Subscription paused by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          reason: reason,
          resumeAt: resumeAtStr,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
