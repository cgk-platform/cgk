import { getAllPermissions, getPermissionsByCategory } from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/permissions
 * List all available permissions with metadata
 *
 * Query params:
 * - grouped: "true" to get permissions grouped by category
 */
export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const url = new URL(req.url)
  const grouped = url.searchParams.get('grouped') === 'true'

  if (grouped) {
    const permissionsByCategory = getPermissionsByCategory()
    return Response.json({ permissions: permissionsByCategory })
  }

  const permissions = getAllPermissions()
  return Response.json({ permissions })
}
