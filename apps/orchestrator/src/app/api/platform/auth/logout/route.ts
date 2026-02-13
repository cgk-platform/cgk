import {
  clearAuthCookie,
  getAuthCookie,
  logAuditAction,
  revokeSuperAdminSession,
  verifyJWT,
} from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/platform/auth/logout
 *
 * Revoke the current super admin session and clear the auth cookie.
 */
export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const token = getAuthCookie(request)

    if (token) {
      try {
        const payload = await verifyJWT(token)

        // Revoke the super admin session
        await revokeSuperAdminSession(payload.sid, 'user_logout')

        // Log the logout
        await logAuditAction({
          userId: payload.sub,
          action: 'logout',
          resourceType: 'session',
          resourceId: payload.sid,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || null,
          metadata: { reason: 'user_initiated' },
        })
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
