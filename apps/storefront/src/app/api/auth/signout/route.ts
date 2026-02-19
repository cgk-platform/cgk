export const dynamic = 'force-dynamic'

import { sql, withTenant } from '@cgk-platform/db'
import { headers, cookies } from 'next/headers'

/**
 * POST /api/auth/signout
 * Customer logout - revokes session, clears cookie
 */
export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('cgk_session_id')?.value

  // Revoke session in database if we have one
  if (tenantSlug && sessionToken) {
    try {
      await withTenant(tenantSlug, async () => {
        await sql`
          DELETE FROM customer_sessions
          WHERE session_token = ${sessionToken}
        `
      })
    } catch (error) {
      console.error('Failed to revoke session:', error)
    }
  }

  // Clear the session cookie
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieParts = [
    'cgk_session_id=',
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProduction) {
    cookieParts.push('Secure')
  }

  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': cookieParts.join('; '),
      },
    }
  )
}
