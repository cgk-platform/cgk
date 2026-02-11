import { logAuditAction, searchUsers } from '@cgk/auth'

export const dynamic = 'force-dynamic'

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
 * GET /api/platform/users/search
 *
 * Search users by name or email using full-text search.
 * Requires: Super admin access
 */
export async function GET(request: Request) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)

    if (!query || query.trim().length === 0) {
      return Response.json({ error: 'Search query is required' }, { status: 400 })
    }

    if (query.trim().length < 2) {
      return Response.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    const users = await searchUsers(query.trim(), {
      limit: Math.min(50, Math.max(1, limit)),
    })

    // Log the search (async, don't await)
    logAuditAction({
      userId,
      action: 'view_user',
      resourceType: 'user',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'search_users',
        query: query.trim(),
        resultCount: users.length,
      },
    }).catch((error) => {
      console.error('Failed to log audit action:', error)
    })

    return Response.json({
      users,
      query: query.trim(),
      count: users.length,
    })
  } catch (error) {
    console.error('Search users error:', error)
    return Response.json({ error: 'Failed to search users' }, { status: 500 })
  }
}
