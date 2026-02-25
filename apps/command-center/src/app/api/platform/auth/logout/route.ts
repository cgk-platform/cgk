import { clearAuthCookie, getAuthCookie, revokeSession, verifyJWT } from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const token = getAuthCookie(request)
    if (token) {
      const payload = await verifyJWT(token)
      await revokeSession(payload.sid)
    }
  } catch {
    // Ignore verification errors during logout
  }

  const response = Response.json({ success: true })
  return clearAuthCookie(response)
}
