export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ teamId: string }>
}

/**
 * GET /api/admin/ai-teams/[teamId]
 * Get a specific AI team with members
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { teamId } = await params
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
    'ai.teams.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getTeam, listTeamMembers } = await import('@cgk/ai-agents')

    const [team, members] = await withTenant(tenantId, async () => {
      const t = await getTeam(teamId)
      if (!t) return [null, []]
      const m = await listTeamMembers(teamId)
      return [t, m]
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team, members })
  } catch (error) {
    console.error('Error fetching AI team:', error)
    return NextResponse.json({ error: 'Failed to fetch AI team' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-teams/[teamId]
 * Update a team
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { teamId } = await params
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
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateTeam } = await import('@cgk/ai-agents')

    const team = await withTenant(tenantId, async () => {
      return updateTeam(teamId, body)
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error updating AI team:', error)
    const message = error instanceof Error ? error.message : 'Failed to update AI team'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai-teams/[teamId]
 * Delete (deactivate) a team
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { teamId } = await params
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
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { deleteTeam } = await import('@cgk/ai-agents')

    const deleted = await withTenant(tenantId, async () => {
      return deleteTeam(teamId)
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI team:', error)
    return NextResponse.json({ error: 'Failed to delete AI team' }, { status: 500 })
  }
}
