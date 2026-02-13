import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  deleteTeam,
  getTeam,
  updateTeam,
  type UpdateTeamInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/scheduling/teams/[id]
 * Get a single team by ID
 */
export async function GET(req: Request, context: RouteContext) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await context.params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const team = await getTeam(tenantId, id)

  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 })
  }

  return Response.json({ team })
}

/**
 * PUT /api/admin/scheduling/teams/[id]
 * Update a team
 */
export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireAuth(req)
  const { id } = await context.params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateTeamInput

  // Validate slug format if provided
  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return Response.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens' },
      { status: 400 }
    )
  }

  const team = await updateTeam(auth.tenantId, id, body)

  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 })
  }

  return Response.json({ team })
}

/**
 * DELETE /api/admin/scheduling/teams/[id]
 * Delete a team
 */
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireAuth(req)
  const { id } = await context.params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const deleted = await deleteTeam(auth.tenantId, id)

  if (!deleted) {
    return Response.json({ error: 'Team not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
