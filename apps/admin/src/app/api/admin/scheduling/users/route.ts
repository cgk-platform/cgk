import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  createSchedulingUser,
  getSchedulingUsers,
  type CreateSchedulingUserInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/users
 * List all scheduling users for the tenant
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const users = await getSchedulingUsers(tenantId)

  return Response.json({ users })
}

/**
 * POST /api/admin/scheduling/users
 * Create a new scheduling user profile
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateSchedulingUserInput

  if (!body.userId || !body.username || !body.displayName || !body.email) {
    return Response.json(
      { error: 'userId, username, displayName, and email are required' },
      { status: 400 }
    )
  }

  // Validate username format
  if (!/^[a-z0-9_-]+$/.test(body.username)) {
    return Response.json(
      { error: 'Username must be lowercase alphanumeric with hyphens or underscores' },
      { status: 400 }
    )
  }

  const user = await createSchedulingUser(auth.tenantId, body)

  return Response.json({ user }, { status: 201 })
}
