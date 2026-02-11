export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ teamId: string; agentId: string }>
}

/**
 * PATCH /api/admin/ai-teams/[teamId]/members/[agentId]
 * Update a team member (role, specializations)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { teamId, agentId } = await params
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
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateMember } = await import('@cgk/ai-agents')

    const member = await withTenant(tenantId, async () => {
      return updateMember(teamId, agentId, {
        role: body.role,
        slackUserId: body.slackUserId,
        specializations: body.specializations,
      })
    })

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error updating team member:', error)
    const message = error instanceof Error ? error.message : 'Failed to update team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai-teams/[teamId]/members/[agentId]
 * Remove an agent from a team
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { teamId, agentId } = await params
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
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { removeMember } = await import('@cgk/ai-agents')

    const removed = await withTenant(tenantId, async () => {
      return removeMember(teamId, agentId)
    })

    if (!removed) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing team member:', error)
    const message = error instanceof Error ? error.message : 'Failed to remove team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
