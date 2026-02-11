export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/org-chart/sync
 * Sync org chart with team_members and ai_agents tables
 */
export async function POST(request: Request) {
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

  // Check permission - requires team management
  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'team.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { syncOrgChart, validateOrgChart } = await import('@cgk/ai-agents')

    const result = await withTenant(tenantId, async () => {
      // Sync the org chart
      const syncResult = await syncOrgChart()

      // Validate the result
      const validation = await validateOrgChart()

      return {
        ...syncResult,
        validation,
      }
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error syncing org chart:', error)
    return NextResponse.json({ error: 'Failed to sync org chart' }, { status: 500 })
  }
}
