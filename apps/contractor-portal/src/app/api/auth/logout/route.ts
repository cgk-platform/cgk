export const dynamic = 'force-dynamic'

import { getAuthCookie, getClearCookieHeader } from '@/lib/auth/cookies'
import { verifyContractorJWT } from '@/lib/auth/jwt'
import { revokeContractorSession } from '@/lib/auth/session'

/**
 * POST /api/auth/logout
 * Revoke session and clear auth cookie
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const token = getAuthCookie(req)
    if (token) {
      try {
        const payload = await verifyContractorJWT(token)
        await revokeContractorSession(payload.sid, payload.tenantSlug)
      } catch {
        // Token invalid or session already revoked - still clear cookie
      }
    }

    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie': getClearCookieHeader(),
        },
      }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie': getClearCookieHeader(),
        },
      }
    )
  }
}
