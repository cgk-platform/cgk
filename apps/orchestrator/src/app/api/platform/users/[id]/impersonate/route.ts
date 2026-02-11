import {
  endImpersonation,
  getActiveImpersonationSessions,
  getSuperAdminUser,
  startImpersonation,
  ImpersonationError,
} from '@cgk/auth'
import { sql } from '@cgk/db'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * POST /api/platform/users/[id]/impersonate
 *
 * Start an impersonation session for the target user.
 * Requires: Super admin with impersonation privileges
 *
 * Body:
 * - tenantId: string - The tenant to access as the user
 * - reason: string - Mandatory reason for impersonation
 */
export async function POST(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const targetUserId = resolvedParams.id

  try {
    const { userId, sessionId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Verify user has impersonation privileges
    const superAdmin = await getSuperAdminUser(userId)
    if (!superAdmin?.canImpersonate) {
      return Response.json(
        { error: 'You do not have impersonation privileges' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tenantId, reason } = body

    if (!tenantId) {
      return Response.json({ error: 'tenantId is required' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return Response.json(
        { error: 'A reason is required for impersonation' },
        { status: 400 }
      )
    }

    // Start impersonation
    const result = await startImpersonation(
      userId,
      sessionId,
      targetUserId,
      tenantId,
      reason,
      request
    )

    // Get tenant info for response
    const tenantResult = await sql`
      SELECT name, slug FROM organizations WHERE id = ${tenantId}
    `
    const tenant = tenantResult.rows[0] as Record<string, unknown> | undefined

    return Response.json({
      success: true,
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt.toISOString(),
        targetUser: result.targetUser,
        tenant: tenant
          ? { id: tenantId, name: tenant.name, slug: tenant.slug }
          : null,
      },
      token: result.token,
    })
  } catch (error) {
    if (error instanceof ImpersonationError) {
      const statusCodes: Record<string, number> = {
        REASON_REQUIRED: 400,
        NOT_SUPER_ADMIN: 403,
        TARGET_NOT_FOUND: 404,
        CANNOT_IMPERSONATE_SUPER_ADMIN: 403,
        NO_TENANT_ACCESS: 400,
      }
      return Response.json(
        { error: error.message, code: error.code },
        { status: statusCodes[error.code] || 400 }
      )
    }

    console.error('Start impersonation error:', error)
    return Response.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/platform/users/[id]/impersonate
 *
 * Get active impersonation sessions for the current super admin.
 * Requires: Super admin access
 */
export async function GET(request: Request, _params: RouteParams) {
  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const sessions = await getActiveImpersonationSessions(userId)

    // Enrich sessions with user and tenant info
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const userResult = await sql`
          SELECT id, email, name FROM users WHERE id = ${session.targetUserId}
        `
        const tenantResult = await sql`
          SELECT id, name, slug FROM organizations WHERE id = ${session.targetTenantId}
        `

        return {
          ...session,
          targetUser: userResult.rows[0] || null,
          tenant: tenantResult.rows[0] || null,
        }
      })
    )

    return Response.json({ sessions: enrichedSessions })
  } catch (error) {
    console.error('Get impersonation sessions error:', error)
    return Response.json(
      { error: 'Failed to get impersonation sessions' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/platform/users/[id]/impersonate
 *
 * End an impersonation session.
 * Requires: Super admin access
 *
 * Body:
 * - sessionId: string - The impersonation session to end
 */
export async function DELETE(request: Request, _params: RouteParams) {
  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 })
    }

    await endImpersonation(sessionId, 'manual_end', userId)

    return Response.json({ success: true })
  } catch (error) {
    console.error('End impersonation error:', error)
    return Response.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    )
  }
}
