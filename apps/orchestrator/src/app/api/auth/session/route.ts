import {
  getAuthCookie,
  getUserById,
  getUserOrganizations,
  getUserSessions,
  revokeAllSessions,
  validateSessionById,
  verifyJWT,
} from '@cgk/auth'
import type { OrgContext } from '@cgk/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/session
 *
 * Get current session info and user details.
 */
export async function GET(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Validate session is still active
    const session = await validateSessionById(payload.sid)
    if (!session) {
      return Response.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    // Get user details
    const user = await getUserById(payload.sub)
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Get user's organizations
    const orgs = await getUserOrganizations(user.id)

    // Get active sessions for this user
    const sessions = await getUserSessions(user.id)

    // Find current org context
    let currentOrg: OrgContext | null = null
    if (payload.orgId) {
      currentOrg = orgs.find((o) => o.id === payload.orgId) || null
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
      organization: currentOrg,
      organizations: orgs,
      activeSessions: sessions.length,
    })
  } catch (error) {
    console.error('Session error:', error)
    return Response.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/session
 *
 * Revoke all sessions for the current user (logout everywhere).
 */
export async function DELETE(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Revoke all sessions
    await revokeAllSessions(payload.sub)

    return Response.json({
      success: true,
      message: 'All sessions revoked',
    })
  } catch (error) {
    console.error('Revoke sessions error:', error)
    return Response.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}
