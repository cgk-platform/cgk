export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getNotificationLogs, type NotificationType, type NotificationStatus } from '@cgk/slack'

/**
 * GET /api/admin/notifications/slack/logs
 * Gets notification send history
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const notificationType = url.searchParams.get('type') as NotificationType | null
  const status = url.searchParams.get('status') as NotificationStatus | null

  try {
    const logs = await getNotificationLogs(tenantSlug, {
      limit: Math.min(limit, 100),
      offset,
      notificationType: notificationType ?? undefined,
      status: status ?? undefined,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Failed to get Slack logs:', error)
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 },
    )
  }
}
