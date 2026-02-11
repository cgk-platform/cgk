export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendReport } from '@cgk/slack'

/**
 * POST /api/admin/notifications/slack/reports/[id]/send
 * Sends a report immediately
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const result = await sendReport(tenantSlug, id)

    return NextResponse.json({
      success: result.success,
      messageTs: result.messageTs,
      error: result.error,
    })
  } catch (error) {
    console.error('Failed to send Slack report:', error)
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 },
    )
  }
}
