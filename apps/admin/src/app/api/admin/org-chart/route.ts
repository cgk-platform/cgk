export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/org-chart
 * Get the full organization chart
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'team.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { buildOrgChart, getOrgChartStats } = await import('@cgk/ai-agents')

    const [chart, stats] = await withTenant(tenantId, async () => {
      const c = await buildOrgChart()
      const s = await getOrgChartStats()
      return [c, s]
    })

    return NextResponse.json({ chart, stats })
  } catch (error) {
    console.error('Error fetching org chart:', error)
    return NextResponse.json({ error: 'Failed to fetch org chart' }, { status: 500 })
  }
}
