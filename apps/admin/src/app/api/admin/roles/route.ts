import {
  checkPermissionOrRespond,
  createCustomRole,
  getRolesForTenant,
  isValidPermissionFormat,
} from '@cgk/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/roles
 * List all roles available to the tenant (predefined + custom)
 */
export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check permission
  const denied = await checkPermissionOrRespond(userId, tenantId, 'team.view')
  if (denied) return denied

  const roles = await getRolesForTenant(tenantId)

  return Response.json({
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isPredefined: role.isPredefined,
      canDelete: role.canDelete,
      parentRoleId: role.parentRoleId,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    })),
  })
}

/**
 * POST /api/admin/roles
 * Create a new custom role
 */
export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check permission - requires role management access
  const denied = await checkPermissionOrRespond(userId, tenantId, 'team.roles.manage')
  if (denied) return denied

  let body: {
    name: string
    description?: string
    permissions: string[]
    parentRoleId?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'Role name is required' }, { status: 400 })
  }

  if (!Array.isArray(body.permissions)) {
    return Response.json({ error: 'Permissions must be an array' }, { status: 400 })
  }

  // Validate permissions format
  for (const perm of body.permissions) {
    if (typeof perm !== 'string' || !isValidPermissionFormat(perm)) {
      return Response.json(
        { error: `Invalid permission format: ${perm}` },
        { status: 400 }
      )
    }
  }

  // Disallow wildcard in custom roles
  if (body.permissions.includes('*')) {
    return Response.json(
      { error: 'Custom roles cannot have full wildcard (*) permission' },
      { status: 400 }
    )
  }

  try {
    const role = await createCustomRole(tenantId, {
      name: body.name.trim(),
      description: body.description?.trim(),
      permissions: body.permissions,
      parentRoleId: body.parentRoleId,
    })

    return Response.json(
      {
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isPredefined: role.isPredefined,
          canDelete: role.canDelete,
          parentRoleId: role.parentRoleId,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create role'

    // Check for unique constraint violation
    if (message.includes('unique') || message.includes('duplicate')) {
      return Response.json(
        { error: 'A role with this name already exists' },
        { status: 409 }
      )
    }

    return Response.json({ error: message }, { status: 400 })
  }
}
