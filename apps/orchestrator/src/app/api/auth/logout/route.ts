import {
  clearAuthCookie,
  getAuthCookie,
  revokeSession,
  verifyJWT,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 *
 * Revoke the current session and clear the auth cookie.
 */
export async function POST(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (token) {
      try {
        const payload = await verifyJWT(token)
        // Revoke the session in the database
        await revokeSession(payload.sid)
      } catch {
        // Token is invalid, but we still clear the cookie
      }
    }

    // Clear the auth cookie
    const response = Response.json({
      success: true,
      message: 'Logged out successfully',
    })

    return clearAuthCookie(response)
  } catch (error) {
    console.error('Logout error:', error)

    // Still clear the cookie even if there's an error
    const response = Response.json({
      success: true,
      message: 'Logged out',
    })

    return clearAuthCookie(response)
  }
}
