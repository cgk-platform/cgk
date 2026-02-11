import {
  getAuthCookie,
  setDefaultTenant,
  TenantAccessError,
  verifyJWT,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'

interface DefaultBody {
  tenantId: string
}

/**
 * POST /api/auth/context/default
 *
 * Set a tenant as the user's default.
 */
export async function POST(request: Request) {
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

    // Parse request body
    const body = (await request.json()) as DefaultBody
    const { tenantId } = body

    if (!tenantId) {
      return Response.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Set the default tenant
    await setDefaultTenant(payload.sub, tenantId)

    return Response.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Set default tenant error:', error)
    return Response.json(
      { error: 'Failed to set default tenant' },
      { status: 500 }
    )
  }
}
