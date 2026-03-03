import {
  getAuthCookie,
  setAuthCookie,
  signJWT,
  TenantAccessError,
  validateSessionById,
  verifyJWT,
  getUserTenants,
} from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'
import { logUserActivity } from '@cgk-platform/auth'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/context/clear
 *
 * Clears tenant context for super admins.
 * Issues new JWT with no org/orgId set.
 */
export async function POST(request: Request) {
  try {
    const token = getAuthCookie(request)

    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify JWT
    let payload
    try {
      payload = await verifyJWT(token)
    } catch {
      return Response.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Validate session
    const session = await validateSessionById(payload.sid)
    if (!session) {
      return Response.json({ error: 'Session expired or revoked' }, { status: 401 })
    }

    // Get user role
    const userResult = await sql`
      SELECT email, role FROM public.users WHERE id = ${payload.sub}
    `

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0] as { email: string; role: string }

    // Only super admins can clear context
    if (user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden - super admin access required' }, { status: 403 })
    }

    // Get all accessible tenants for JWT
    const userTenants = await getUserTenants(payload.sub)
    const orgs = userTenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      role: t.role,
    }))

    // Create new JWT with no tenant context
    const newToken = await signJWT({
      userId: payload.sub,
      sessionId: payload.sid,
      email: user.email,
      orgSlug: '',
      orgId: '',
      role: user.role as 'super_admin',
      orgs,
    })

    // Get client IP for logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    // Log activity
    await logUserActivity({
      userId: payload.sub,
      tenantId: null,
      action: 'tenant.context_cleared',
      metadata: {},
      ipAddress,
    })

    // Create response with new cookie
    const response = Response.json({
      success: true,
      message: 'Tenant context cleared',
    })

    return setAuthCookie(response, newToken)
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json({ error: error.message }, { status: 403 })
    }

    logger.error('Clear tenant context error:', error instanceof Error ? error : new Error(String(error)))
    return Response.json({ error: 'Failed to clear tenant context' }, { status: 500 })
  }
}
