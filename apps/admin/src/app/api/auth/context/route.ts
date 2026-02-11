import {
  getAuthCookie,
  getUserById,
  getUserTenants,
  verifyJWT,
  type TenantContext,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/context
 *
 * Get current user context including current tenant and all accessible tenants.
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
    let currentTenant: TenantContext | null = null
    if (payload.orgId) {
      currentTenant = tenants.find((t) => t.id === payload.orgId) || null
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      current: currentTenant,
      tenants,
    })
  } catch (error) {
    console.error('Context fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    )
  }
}
