import { getUserPermissions, hasAllPermissions, hasAnyPermission, hasPermission } from '@cgk/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/permissions/check
 * Check if user has specified permission(s)
 *
 * Body:
 * - permission: string (single permission)
 * - permissions: string[] (multiple permissions)
 * - mode: "any" | "all" (default: "any" for multiple)
 */
export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: {
    permission?: string
    permissions?: string[]
    mode?: 'any' | 'all'
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Get user's permissions
  const userPermissions = await getUserPermissions(userId, tenantId)

  // Single permission check
  if (body.permission) {
    const has = hasPermission(userPermissions, body.permission)
    return Response.json({
      hasPermission: has,
      permission: body.permission,
    })
  }

  // Multiple permissions check
  if (body.permissions && Array.isArray(body.permissions)) {
    const mode = body.mode || 'any'

    if (mode === 'all') {
      const has = hasAllPermissions(userPermissions, body.permissions)
      return Response.json({
        hasPermission: has,
        permissions: body.permissions,
        mode,
      })
    }

    const has = hasAnyPermission(userPermissions, body.permissions)
    return Response.json({
      hasPermission: has,
      permissions: body.permissions,
      mode,
    })
  }

  return Response.json(
    { error: 'Either permission or permissions array required' },
    { status: 400 }
  )
}
