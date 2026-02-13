export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSlackNotificationConfigByType } from '@/lib/creators/lifecycle-db'
import type { CreatorNotificationType } from '@/lib/creators/lifecycle-types'
import { CREATOR_NOTIFICATION_TYPES } from '@/lib/creators/lifecycle-types'

const VALID_TYPES = CREATOR_NOTIFICATION_TYPES.map((t) => t.type)

/**
 * POST /api/admin/creators/slack-notifications/test
 * Sends a test notification for a specific event type
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { type?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !VALID_TYPES.includes(body.type as CreatorNotificationType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const config = await getSlackNotificationConfigByType(tenantSlug, body.type)

    if (!config) {
      return NextResponse.json({ error: 'Notification type not configured' }, { status: 404 })
    }

    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Notification type is disabled' },
        { status: 400 }
      )
    }

    if (!config.channelId) {
      return NextResponse.json(
        { error: 'No channel configured for this notification type' },
        { status: 400 }
      )
    }

    // In a full implementation, this would send a test Slack message
    // For now, we return success to indicate the config is valid
    // The actual sending would be done via the @cgk-platform/jobs package

    return NextResponse.json({
      success: true,
      message: `Test notification would be sent to #${config.channelName}`,
      config: {
        type: config.type,
        channelId: config.channelId,
        channelName: config.channelName,
      },
    })
  } catch (error) {
    console.error('[slack-notifications/test] POST error:', error)
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 })
  }
}
