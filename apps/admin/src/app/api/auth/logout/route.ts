export const dynamic = 'force-dynamic'

import {
  clearAuthCookie,
  getAuthCookie,
  revokeSession,
  verifyJWT,
} from '@cgk-platform/auth'
import { logger } from '@cgk-platform/logging'

/**
 * POST /api/auth/logout
 * Revoke session and clear auth cookie
 */
export async function POST(request: Request) {
  try {
    const token = getAuthCookie(request)
    if (token) {
      try {
        const payload = await verifyJWT(token)
        await revokeSession(payload.sid)
      } catch {
        // Token invalid or session already revoked — still clear cookie
      }
    }

    const response = Response.json({ success: true })
    return clearAuthCookie(response)
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear cookie even on error
    const response = Response.json({ success: true })
    return clearAuthCookie(response)
  }
}
