import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  updateTeamMemberAdmin,
} from '@cgk/scheduling'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/scheduling/teams/[id]/members
 * Get all members of a team
 */
export async function GET(req: Request, context: RouteContext) {
  const { tenantId } = await getTenantContext(req)
  const { id: teamId } = await context.params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const members = await getTeamMembers(tenantId, teamId)

  return Response.json({ members })
}

/**
 * POST /api/admin/scheduling/teams/[id]/members
 * Add a member to a team
 */
export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAuth(req)
  const { id: teamId } = await context.params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as { userId: string; isAdmin?: boolean }

  if (!body.userId) {
    return Response.json(
      { error: 'userId is required' },
      { status: 400 }
    )
  }

  const member = await addTeamMember(auth.tenantId, {
    teamId,
    userId: body.userId,
    isAdmin: body.isAdmin,
  })

  return Response.json({ member }, { status: 201 })
}

/**
 * PUT /api/admin/scheduling/teams/[id]/members
 * Update a team member's admin status
 */
export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireAuth(req)
  const { id: teamId } = await context.params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as { userId: string; isAdmin: boolean }

  if (!body.userId || typeof body.isAdmin !== 'boolean') {
    return Response.json(
      { error: 'userId and isAdmin are required' },
      { status: 400 }
    )
  }

  const member = await updateTeamMemberAdmin(
    auth.tenantId,
    teamId,
    body.userId,
    body.isAdmin
  )

  if (!member) {
    return Response.json({ error: 'Team member not found' }, { status: 404 })
  }

  return Response.json({ member })
}

/**
 * DELETE /api/admin/scheduling/teams/[id]/members
 * Remove a member from a team
 */
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireAuth(req)
  const { id: teamId } = await context.params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return Response.json(
      { error: 'userId query parameter is required' },
      { status: 400 }
    )
  }

  const removed = await removeTeamMember(auth.tenantId, teamId, userId)

  if (!removed) {
    return Response.json({ error: 'Team member not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
