export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ teamId: string }>
}

/**
 * GET /api/admin/ai-teams/[teamId]/members
 * List all members of a team
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
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.teams.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { listTeamMembers } = await import('@cgk/ai-agents')

    const members = await withTenant(tenantId, async () => {
      return listTeamMembers(teamId)
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-teams/[teamId]/members
 * Add an agent to a team
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.teams.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { addTeamMember } = await import('@cgk/ai-agents')

    // Validate required fields
    if (!body.agentId) {
      return NextResponse.json({ error: 'Missing required field: agentId' }, { status: 400 })
    }

    const member = await withTenant(tenantId, async () => {
      return addTeamMember({
        teamId,
        agentId: body.agentId,
        role: body.role,
        slackUserId: body.slackUserId,
        specializations: body.specializations,
      })
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error adding team member:', error)
    const message = error instanceof Error ? error.message : 'Failed to add team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
