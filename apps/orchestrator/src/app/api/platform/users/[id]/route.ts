import { getUserWithMemberships, logAuditAction } from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * GET /api/platform/users/[id]
 *
 * Get user details with all tenant memberships.
 * Requires: Super admin access
 */
export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const targetUserId = resolvedParams.id

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    if (!targetUserId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await getUserWithMemberships(targetUserId)

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Log the access (async, don't await)
    logAuditAction({
      userId,
      action: 'view_user',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'view_user_details',
        targetEmail: user.email,
      },
    }).catch((error) => {
      console.error('Failed to log audit action:', error)
    })

    return Response.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return Response.json({ error: 'Failed to get user details' }, { status: 500 })
  }
}
