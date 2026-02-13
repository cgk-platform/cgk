import {
  checkPermissionOrRespond,
  deleteRole,
  getRoleById,
  getRoleWithInheritance,
  isValidPermissionFormat,
  updateRole,
} from '@cgk-platform/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/roles/[id]
 * Get a single role with inherited permissions resolved
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check permission
  const denied = await checkPermissionOrRespond(userId, tenantId, 'team.view')
  if (denied) return denied

  const role = await getRoleWithInheritance(id)

  if (!role) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  // Verify role is accessible to tenant
  if (role.tenantId && role.tenantId !== tenantId) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  return Response.json({
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      inheritedPermissions: role.inheritedPermissions,
      effectivePermissions: role.effectivePermissions,
      isPredefined: role.isPredefined,
      canDelete: role.canDelete,
      parentRoleId: role.parentRoleId,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    },
  })
}

/**
 * PATCH /api/admin/roles/[id]
 * Update a custom role
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check permission
  const denied = await checkPermissionOrRespond(userId, tenantId, 'team.roles.manage')
  if (denied) return denied

  // Verify role exists and is accessible
  const existing = await getRoleById(id)
  if (!existing) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  if (existing.tenantId && existing.tenantId !== tenantId) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  if (existing.isPredefined) {
    return Response.json(
      { error: 'Cannot modify predefined roles' },
      { status: 403 }
    )
  }

  let body: {
    name?: string
    description?: string
    permissions?: string[]
    parentRoleId?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate permissions format if provided
  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions)) {
      return Response.json({ error: 'Permissions must be an array' }, { status: 400 })
    }

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
  }

  try {
    const role = await updateRole(id, tenantId, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      permissions: body.permissions,
      parentRoleId: body.parentRoleId,
    })

    return Response.json({
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
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role'
    return Response.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete a custom role
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params
  const tenantId = req.headers.get('x-tenant-id')
  const userId = req.headers.get('x-user-id')

  if (!tenantId || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check permission
  const denied = await checkPermissionOrRespond(userId, tenantId, 'team.roles.manage')
  if (denied) return denied

  // Verify role exists
  const existing = await getRoleById(id)
  if (!existing) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  if (existing.tenantId && existing.tenantId !== tenantId) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  if (existing.isPredefined || !existing.canDelete) {
    return Response.json(
      { error: 'Cannot delete predefined roles' },
      { status: 403 }
    )
  }

  try {
    await deleteRole(id, tenantId)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete role'
    return Response.json({ error: message }, { status: 400 })
  }
}
