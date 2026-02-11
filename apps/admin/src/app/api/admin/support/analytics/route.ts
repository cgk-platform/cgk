export const dynamic = 'force-dynamic'

import { requireAuth } from '@cgk/auth'
import { getTicketMetrics, getUnacknowledgedAlerts, getAllSLAConfigs } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

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
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
