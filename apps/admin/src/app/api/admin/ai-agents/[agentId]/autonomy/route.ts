export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/autonomy
 * Get agent autonomy settings
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

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getAutonomySettings, getActionAutonomyList } = await import('@cgk/ai-agents')

    const result = await withTenant(tenantId, async () => {
      const [settings, actions] = await Promise.all([
        getAutonomySettings(agentId),
        getActionAutonomyList(agentId),
      ])
      return { settings, actions }
    })

    if (!result.settings) {
      return NextResponse.json({ error: 'Autonomy settings not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching autonomy settings:', error)
    return NextResponse.json({ error: 'Failed to fetch autonomy settings' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]/autonomy
 * Update global autonomy settings
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateAutonomySettings } = await import('@cgk/ai-agents')

    const settings = await withTenant(tenantId, async () => {
      return updateAutonomySettings(agentId, {
        maxActionsPerHour: body.maxActionsPerHour,
        maxCostPerDay: body.maxCostPerDay,
        requireHumanForHighValue: body.requireHumanForHighValue,
        adaptToFeedback: body.adaptToFeedback,
        trackSuccessPatterns: body.trackSuccessPatterns,
        adjustToUserPreferences: body.adjustToUserPreferences,
      })
    })

    if (!settings) {
      return NextResponse.json({ error: 'Autonomy settings not found' }, { status: 404 })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating autonomy settings:', error)
    return NextResponse.json({ error: 'Failed to update autonomy settings' }, { status: 500 })
  }
}
