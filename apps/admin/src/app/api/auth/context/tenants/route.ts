import {
  getAuthCookie,
  getUserById,
  getUserTenants,
  verifyJWT,
  type TenantContext,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/context/tenants
 *
 * Get all tenants the current user has access to.
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

    // Get user
    const user = await getUserById(payload.sub)
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Get all accessible tenants
    const tenants = await getUserTenants(user.id)

    // Find current tenant from JWT
    let current: TenantContext | null = null
    if (payload.orgId) {
      current = tenants.find((t) => t.id === payload.orgId) || null
    }

    return Response.json({
      tenants,
      current,
    })
  } catch (error) {
    console.error('Tenants fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}
