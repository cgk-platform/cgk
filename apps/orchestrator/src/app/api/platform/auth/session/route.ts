import {
  getAuthCookie,
  getSuperAdminUser,
  getUserById,
  revokeAllSuperAdminSessions,
  validateSuperAdminSessionById,
  verifyJWT,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/platform/auth/session
 *
 * Get current super admin session info.
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

    // Validate super admin session
    const session = await validateSuperAdminSessionById(payload.sid)
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

    // Get super admin details
    const superAdmin = await getSuperAdminUser(payload.sub)
    if (!superAdmin) {
      return Response.json(
        { error: 'Super admin record not found' },
        { status: 401 }
      )
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'super_admin',
      },
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        mfaVerified: session.mfaVerified,
        mfaVerifiedAt: session.mfaVerifiedAt,
      },
      permissions: {
        canAccessAllTenants: superAdmin.canAccessAllTenants,
        canImpersonate: superAdmin.canImpersonate,
        canManageSuperAdmins: superAdmin.canManageSuperAdmins,
      },
      mfa: {
        enabled: superAdmin.mfaEnabled,
        verified: session.mfaVerified,
      },
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
 * DELETE /api/platform/auth/session
 *
 * Revoke all super admin sessions for the current user (logout everywhere).
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
    await revokeAllSuperAdminSessions(payload.sub, 'revoke_all_sessions')

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
