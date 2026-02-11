import { getUserPermissions } from '@cgk/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/auth/permissions
 * Get current user's permissions for the current tenant
 *
 * Used by the PermissionProvider to fetch user permissions on the client
 */
export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ permissions: [] })
  }

  const permissions = await getUserPermissions(userId, tenantId)

  return Response.json({ permissions })
}
