export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendTestNotification, type NotificationType } from '@cgk/slack'

/**
 * POST /api/admin/notifications/slack/test
 * Sends a test notification to Slack
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    notificationType: NotificationType
    channelId?: string
    useSampleData?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.notificationType) {
    return NextResponse.json({ error: 'notificationType required' }, { status: 400 })
  }

  try {
    const result = await sendTestNotification(
      tenantSlug,
      body.notificationType,
      body.channelId,
      body.useSampleData ?? true,
    )

    return NextResponse.json({
      success: result.success,
      messageTs: result.messageTs,
      channelId: result.channelId,
      error: result.error,
    })
  } catch (error) {
    console.error('Failed to send test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 },
    )
  }
}
