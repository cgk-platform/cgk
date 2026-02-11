import { getAllUsers, logAuditAction } from '@cgk/auth'
import type { UserQueryOptions, PlatformUserStatus } from '@cgk/auth'

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
 * GET /api/platform/users
 *
 * List all platform users with pagination and filtering.
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

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const status = url.searchParams.get('status') as PlatformUserStatus | 'all' | null
    const isSuperAdminFilter = url.searchParams.get('isSuperAdmin')
    const tenantId = url.searchParams.get('tenantId')
    const search = url.searchParams.get('search')
    const sortBy = url.searchParams.get('sortBy') as UserQueryOptions['sortBy']
    const sortOrder = url.searchParams.get('sortOrder') as UserQueryOptions['sortOrder']

    const options: UserQueryOptions = {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    }

    if (status && status !== 'all') {
      options.status = status
    }

    if (isSuperAdminFilter !== null) {
      options.isSuperAdmin = isSuperAdminFilter === 'true'
    }

    if (tenantId) {
      options.tenantId = tenantId
    }

    if (search) {
      options.search = search
    }

    if (sortBy && ['name', 'email', 'createdAt', 'lastLoginAt'].includes(sortBy)) {
      options.sortBy = sortBy
    }

    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      options.sortOrder = sortOrder
    }

    const result = await getAllUsers(options)

    // Log the access (async, don't await)
    logAuditAction({
      userId,
      action: 'view_user',
      resourceType: 'user',
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'list_users',
        filters: options,
        resultCount: result.total,
      },
    }).catch((error) => {
      console.error('Failed to log audit action:', error)
    })

    return Response.json(result)
  } catch (error) {
    console.error('List users error:', error)
    return Response.json({ error: 'Failed to list users' }, { status: 500 })
  }
}
