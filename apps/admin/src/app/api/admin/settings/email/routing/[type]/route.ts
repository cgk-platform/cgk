export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getNotificationRouting,
  getSenderAddressById,
  NOTIFICATION_TYPES,
  upsertNotificationRouting,
  type NotificationChannel,
  type NotificationType,
  type UpdateNotificationRoutingInput,
} from '@cgk/communications'

const VALID_CHANNELS: NotificationChannel[] = ['email', 'sms', 'both']

interface RouteParams {
  params: Promise<{ type: string }>
}

/**
 * GET /api/admin/settings/email/routing/[type]
 * Get routing for a specific notification type
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { type } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Validate notification type
  const validTypes = Object.values(NOTIFICATION_TYPES)
  if (!validTypes.includes(type as NotificationType)) {
    return NextResponse.json(
      { error: `Invalid notification type: ${type}` },
      { status: 400 }
    )
  }

  const routing = await withTenant(tenantSlug, () =>
    getNotificationRouting(type as NotificationType)
  )

  return NextResponse.json({ routing })
}

/**
 * PATCH /api/admin/settings/email/routing/[type]
 * Update routing for a specific notification type
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { type } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Validate notification type
  const validTypes = Object.values(NOTIFICATION_TYPES)
  if (!validTypes.includes(type as NotificationType)) {
    return NextResponse.json(
      { error: `Invalid notification type: ${type}` },
      { status: 400 }
    )
  }

  let body: UpdateNotificationRoutingInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate channel if provided
  if (body.channel && !VALID_CHANNELS.includes(body.channel)) {
    return NextResponse.json(
      { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate delay days if provided
  if (body.delayDays !== undefined && (body.delayDays < 0 || body.delayDays > 365)) {
    return NextResponse.json(
      { error: 'Delay days must be between 0 and 365' },
      { status: 400 }
    )
  }

  // Validate max retries if provided
  if (body.maxRetries !== undefined && (body.maxRetries < 0 || body.maxRetries > 10)) {
    return NextResponse.json(
      { error: 'Max retries must be between 0 and 10' },
      { status: 400 }
    )
  }

  // Validate retry delay if provided
  if (body.retryDelayMinutes !== undefined && (body.retryDelayMinutes < 1 || body.retryDelayMinutes > 1440)) {
    return NextResponse.json(
      { error: 'Retry delay must be between 1 and 1440 minutes' },
      { status: 400 }
    )
  }

  // Validate sender address exists if provided
  if (body.senderAddressId) {
    const sender = await withTenant(tenantSlug, () =>
      getSenderAddressById(body.senderAddressId as string)
    )

    if (!sender) {
      return NextResponse.json(
        { error: 'Sender address not found' },
        { status: 404 }
      )
    }

    if (sender.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: 'Sender address domain is not verified' },
        { status: 400 }
      )
    }
  }

  try {
    const routing = await withTenant(tenantSlug, () =>
      upsertNotificationRouting(type as NotificationType, body)
    )

    // Get full routing with sender info
    const fullRouting = await withTenant(tenantSlug, () =>
      getNotificationRouting(type as NotificationType)
    )

    return NextResponse.json({ routing: fullRouting ?? routing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update routing'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
