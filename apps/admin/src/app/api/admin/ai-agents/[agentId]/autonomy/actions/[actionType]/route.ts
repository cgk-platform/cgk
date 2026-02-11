export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string; actionType: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/autonomy/actions/[actionType]
 * Get autonomy settings for a specific action type
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId, actionType } = await params
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getActionAutonomy } = await import('@cgk/ai-agents')

    const actionAutonomy = await withTenant(tenantId, async () => {
      return getActionAutonomy(agentId, decodeURIComponent(actionType))
    })

    if (!actionAutonomy) {
      return NextResponse.json({ error: 'Action autonomy not found' }, { status: 404 })
    }

    return NextResponse.json({ actionAutonomy })
  } catch (error) {
    console.error('Error fetching action autonomy:', error)
    return NextResponse.json({ error: 'Failed to fetch action autonomy' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]/autonomy/actions/[actionType]
 * Update autonomy settings for a specific action type
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { agentId, actionType } = await params
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

  const permissionDenied = await checkPermissionOrRespond(
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { setActionAutonomy } = await import('@cgk/ai-agents')

    // Validate autonomy level
    const validLevels = ['autonomous', 'suggest_and_confirm', 'human_required']
    if (body.autonomyLevel && !validLevels.includes(body.autonomyLevel)) {
      return NextResponse.json(
        { error: `Invalid autonomy level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      )
    }

    const actionAutonomy = await withTenant(tenantId, async () => {
      return setActionAutonomy(agentId, decodeURIComponent(actionType), {
        autonomyLevel: body.autonomyLevel,
        enabled: body.enabled,
        requiresApproval: body.requiresApproval,
        maxPerDay: body.maxPerDay,
        cooldownHours: body.cooldownHours,
      })
    })

    return NextResponse.json({ actionAutonomy })
  } catch (error) {
    console.error('Error updating action autonomy:', error)
    return NextResponse.json({ error: 'Failed to update action autonomy' }, { status: 500 })
  }
}
