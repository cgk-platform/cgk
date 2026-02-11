export const dynamic = 'force-dynamic'

import { getAlertHistory, type AlertSeverity } from '@cgk/slack'
import { NextResponse } from 'next/server'

/**
 * GET /api/platform/slack/alerts
 * Gets platform alert history
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const severity = url.searchParams.get('severity') as AlertSeverity | null
  const service = url.searchParams.get('service')
  const tenantId = url.searchParams.get('tenantId')

  try {
    const alerts = await getAlertHistory({
      limit: Math.min(limit, 100),
      offset,
      severity: severity ?? undefined,
      service: service ?? undefined,
      tenantId: tenantId ?? undefined,
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Failed to get platform alerts:', error)
    return NextResponse.json(
      { error: 'Failed to get alerts' },
      { status: 500 },
    )
  }
}
