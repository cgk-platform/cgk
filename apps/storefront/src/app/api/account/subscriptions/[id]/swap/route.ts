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
 * POST /api/account/subscriptions/[id]/swap
 * Swap the product/variant in a subscription
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
    variantId?: string
    productId?: string
  } = {}

  try {
    const text = await request.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.variantId && !body.productId) {
    return NextResponse.json(
      { error: 'variantId or productId is required' },
      { status: 400 }
    )
  }

  // Verify subscription ownership and current status
  const existingResult = await withTenant(tenantSlug, async () => {
    return sql<{ id: string; status: string; product_id: string; variant_id: string | null }>`
      SELECT id, status, product_id, variant_id FROM subscriptions
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
      error: `Cannot swap product for subscription with status: ${existing.status}`,
    }
    return NextResponse.json(response, { status: 400 })
  }

  const newVariantId = body.variantId || null
  const newProductId = body.productId || existing.product_id

  // Update subscription product/variant
  await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE subscriptions
      SET
        product_id = ${newProductId},
        variant_id = ${newVariantId},
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
        ${id}, 'product_swapped', 'Subscription product swapped by customer',
        'customer', ${session.customerId},
        ${JSON.stringify({
          previousProductId: existing.product_id,
          previousVariantId: existing.variant_id,
          newProductId,
          newVariantId,
        })}::jsonb
      )
    `
  })

  const response: SubscriptionActionResult = {
    success: true,
  }

  return NextResponse.json(response)
}
