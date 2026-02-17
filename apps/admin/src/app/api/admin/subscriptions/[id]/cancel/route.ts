export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { requireAuth, checkPermissionOrRespond } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

import {
  getSubscription,
  cancelSubscription,
} from '@/lib/subscriptions/service'

export async function POST(
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

  if (subscription.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Subscription is already cancelled' },
      { status: 400 }
    )
  }

  let body: { reason?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const reason = body.reason || 'Cancelled by admin'

  // Get admin user info for activity log
  const userResult = await sql`
    SELECT email, name FROM public.users WHERE id = ${auth.userId} LIMIT 1
  `
  const adminName = (userResult.rows[0]?.name as string) || (userResult.rows[0]?.email as string) || 'Admin'

  await cancelSubscription(tenantSlug, id, reason, auth.userId, adminName)

  return NextResponse.json({ success: true, status: 'cancelled' })
}
