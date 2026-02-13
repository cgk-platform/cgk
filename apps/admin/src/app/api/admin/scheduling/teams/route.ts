import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  createTeam,
  getTeams,
  type CreateTeamInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/teams
 * List all scheduling teams for the tenant
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const teams = await getTeams(tenantId)

  return Response.json({ teams })
}

/**
 * POST /api/admin/scheduling/teams
 * Create a new scheduling team
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateTeamInput

  if (!body.name || !body.slug) {
    return Response.json(
      { error: 'name and slug are required' },
      { status: 400 }
    )
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return Response.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens' },
      { status: 400 }
    )
  }

  const team = await createTeam(auth.tenantId, body)

  return Response.json({ team }, { status: 201 })
}
