import { getUserActivityLog, logAuditAction } from '@cgk-platform/auth'

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
 * GET /api/platform/users/[id]/activity
 *
 * Get user activity log with pagination.
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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const activity = await getUserActivityLog(targetUserId, {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    })

    // Log the access (async, don't await)
    logAuditAction({
      userId,
      action: 'view_audit_log',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'view_user_activity',
        page,
        limit,
        resultCount: activity.length,
      },
    }).catch((error) => {
      console.error('Failed to log audit action:', error)
    })

    return Response.json({
      activity,
      page,
      limit,
      count: activity.length,
    })
  } catch (error) {
    console.error('Get user activity error:', error)
    return Response.json({ error: 'Failed to get user activity' }, { status: 500 })
  }
}
