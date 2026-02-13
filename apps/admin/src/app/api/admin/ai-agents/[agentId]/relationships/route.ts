export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ agentId: string }>
}

/**
 * GET /api/admin/ai-agents/[agentId]/relationships
 * List all relationships for an agent
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId } = await params
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
    auth.userId,
    auth.tenantId || '',
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { listRelationshipsWithDetails, getRelationshipStats, getFamiliarityInsights } =
      await import('@cgk-platform/ai-agents')

    const [relationships, stats, insights] = await withTenant(tenantId, async () => {
      const r = await listRelationshipsWithDetails(agentId)
      const s = await getRelationshipStats(agentId)
      const i = await getFamiliarityInsights(agentId)
      return [r, s, i]
    })

    return NextResponse.json({ relationships, stats, insights })
  } catch (error) {
    console.error('Error fetching agent relationships:', error)
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
  }
}
