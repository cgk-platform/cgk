export const dynamic = 'force-dynamic'

import { requireAuth } from '@cgk-platform/auth'
import { getTicketMetrics, getUnacknowledgedAlerts, getAllSLAConfigs } from '@cgk-platform/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@cgk-platform/logging'

/**
 * GET /api/admin/support/analytics
 * Get ticket metrics and analytics
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all analytics data in parallel
    const [metrics, alerts, slaConfigs] = await Promise.all([
      getTicketMetrics(tenantId),
      getUnacknowledgedAlerts(tenantId),
      getAllSLAConfigs(tenantId),
    ])

    return NextResponse.json({
      metrics,
      unacknowledgedAlerts: alerts,
      slaConfigs,
    })
  } catch (error) {
    logger.error('Error fetching analytics:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
