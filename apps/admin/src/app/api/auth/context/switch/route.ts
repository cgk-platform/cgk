import {
  getAuthCookie,
  setAuthCookie,
  switchTenantContext,
  TenantAccessError,
  validateSessionById,
  verifyJWT,
} from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

interface SwitchBody {
  targetTenantSlug: string
}

/**
 * POST /api/auth/context/switch
 *
 * Switch to a different tenant. Validates access and issues new JWT.
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

    // Validate session
    const session = await validateSessionById(payload.sid)
    if (!session) {
      return Response.json(
        { error: 'Session expired or revoked' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = (await request.json()) as SwitchBody
    const { targetTenantSlug } = body

    if (!targetTenantSlug) {
      return Response.json(
        { error: 'Target tenant slug is required' },
        { status: 400 }
      )
    }

    // Get client IP for logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    // Perform the switch
    const result = await switchTenantContext(
      payload.sub,
      targetTenantSlug,
      payload.sid,
      ipAddress
    )

    // Create response with new cookie
    const response = Response.json({
      success: true,
      tenant: result.tenant,
    })

    return setAuthCookie(response, result.token)
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Switch tenant error:', error)
    return Response.json(
      { error: 'Failed to switch tenant' },
      { status: 500 }
    )
  }
}
