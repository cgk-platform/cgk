export const dynamic = 'force-dynamic'

import {
  clearAuthCookie,
  getAuthCookie,
  getUserSessions,
  revokeAllSessions,
  validateSessionById,
  verifyJWT,
} from '@cgk-platform/auth'
import { logger } from '@cgk-platform/logging'

/**
 * GET /api/auth/session
 * Get current session info
 */
export async function GET(request: Request) {
  try {
    const token = getAuthCookie(request)
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    const session = await validateSessionById(payload.sid)
    if (!session) {
      return Response.json({ error: 'Session expired or revoked' }, { status: 401 })
    }

    const sessions = await getUserSessions(payload.sub)

    return Response.json({
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        orgSlug: payload.org,
        orgId: payload.orgId,
      },
      activeSessions: sessions.length,
    })
  } catch (error) {
    logger.error('Session check error:', error)
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }
}

/**
 * DELETE /api/auth/session
 * Revoke all sessions (logout everywhere)
 */
export async function DELETE(request: Request) {
  try {
    const token = getAuthCookie(request)
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    await revokeAllSessions(payload.sub)

    const response = Response.json({ success: true })
    return clearAuthCookie(response)
  } catch (error) {
    logger.error('Session revoke error:', error)
    return Response.json({ error: 'Failed to revoke sessions' }, { status: 500 })
  }
}
