export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { requireAuth, checkPermissionOrRespond } from '@cgk-platform/auth'
import { sql, withTenant } from '@cgk-platform/db'

import {
  getSubscription,
  getSubscriptionOrders,
  getSubscriptionActivity,
} from '@/lib/subscriptions/service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId,
    'subscriptions.read'
  )
  if (permissionDenied) return permissionDenied

  // Get tenant slug
  const orgResult = await sql`
    SELECT slug FROM public.organizations
    WHERE id = ${auth.tenantId}
    LIMIT 1
  `
  const tenantSlug = orgResult.rows[0]?.slug as string
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [subscription, orders, activity] = await Promise.all([
    getSubscription(tenantSlug, id),
    getSubscriptionOrders(tenantSlug, id),
    getSubscriptionActivity(tenantSlug, id),
  ])

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  return NextResponse.json({ subscription, orders, activity })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId,
    'subscriptions.update'
  )
  if (permissionDenied) return permissionDenied

  // Get tenant slug
  const orgResult = await sql`
    SELECT slug FROM public.organizations
    WHERE id = ${auth.tenantId}
    LIMIT 1
  `
  const tenantSlug = orgResult.rows[0]?.slug as string
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const subscription = await getSubscription(tenantSlug, id)
  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  let body: { notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Update subscription notes if provided
  if (body.notes !== undefined) {
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE subscriptions
        SET notes = ${body.notes}, updated_at = NOW()
        WHERE id = ${id}
      `
    })
  }

  // Fetch updated subscription
  const updatedSubscription = await getSubscription(tenantSlug, id)
  return NextResponse.json({ success: true, subscription: updatedSubscription })
}
