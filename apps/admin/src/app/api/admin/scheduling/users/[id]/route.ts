import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  getSchedulingUser,
  updateSchedulingUser,
  type UpdateSchedulingUserInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/scheduling/users/[id]
 * Get a specific scheduling user
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const user = await getSchedulingUser(tenantId, id)

  if (!user) {
    return Response.json({ error: 'Scheduling user not found' }, { status: 404 })
  }

  return Response.json({ user })
}

/**
 * PUT /api/admin/scheduling/users/[id]
 * Update a scheduling user
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = await params
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateSchedulingUserInput

  // Validate username format if provided
  if (body.username && !/^[a-z0-9_-]+$/.test(body.username)) {
    return Response.json(
      { error: 'Username must be lowercase alphanumeric with hyphens or underscores' },
      { status: 400 }
    )
  }

  const user = await updateSchedulingUser(auth.tenantId, id, body)

  if (!user) {
    return Response.json({ error: 'Scheduling user not found' }, { status: 404 })
  }

  return Response.json({ user })
}
