/**
 * Role management service
 * CRUD operations for RBAC roles
 */

import { sql } from '@cgk-platform/db'

import { resolvePermissions } from './checker'

/**
 * Role record from database
 */
export interface Role {
  id: string
  tenantId: string | null
  name: string
  description: string | null
  permissions: string[]
  isPredefined: boolean
  canDelete: boolean
  parentRoleId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Role with resolved permissions (includes inherited)
 */
export interface RoleWithInherited extends Role {
  inheritedPermissions: string[]
  effectivePermissions: string[]
}

/**
 * Input for creating a custom role
 */
export interface CreateRoleInput {
  name: string
  description?: string
  permissions: string[]
  parentRoleId?: string
}

/**
 * Input for updating a role
 */
export interface UpdateRoleInput {
  name?: string
  description?: string
  permissions?: string[]
  parentRoleId?: string | null
}

/**
 * Well-known predefined role IDs
 */
export const PREDEFINED_ROLE_IDS = {
  TENANT_ADMIN: '00000000-0000-0000-0000-000000000001',
  MANAGER: '00000000-0000-0000-0000-000000000002',
  FINANCE: '00000000-0000-0000-0000-000000000003',
  CREATOR_MANAGER: '00000000-0000-0000-0000-000000000004',
  CONTENT_MANAGER: '00000000-0000-0000-0000-000000000005',
  SUPPORT: '00000000-0000-0000-0000-000000000006',
  VIEWER: '00000000-0000-0000-0000-000000000007',
} as const

/**
 * Get all roles available to a tenant (predefined + custom)
 */
export async function getRolesForTenant(tenantId: string): Promise<Role[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id,
      created_at,
      updated_at
    FROM public.roles
    WHERE tenant_id IS NULL OR tenant_id = ${tenantId}
    ORDER BY is_predefined DESC, name ASC
  `

  return result.rows.map(mapRowToRole)
}

/**
 * Get all predefined roles (platform-wide)
 */
export async function getPredefinedRoles(): Promise<Role[]> {
  const result = await sql`
    SELECT
      id,
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id,
      created_at,
      updated_at
    FROM public.roles
    WHERE is_predefined = TRUE
    ORDER BY name ASC
  `

  return result.rows.map(mapRowToRole)
}

/**
 * Get a single role by ID
 */
export async function getRoleById(roleId: string): Promise<Role | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id,
      created_at,
      updated_at
    FROM public.roles
    WHERE id = ${roleId}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToRole(row)
}

/**
 * Get a role with inherited permissions resolved
 */
export async function getRoleWithInheritance(roleId: string): Promise<RoleWithInherited | null> {
  const role = await getRoleById(roleId)
  if (!role) {
    return null
  }

  let inheritedPermissions: string[] = []

  if (role.parentRoleId) {
    const parentRole = await getRoleById(role.parentRoleId)
    if (parentRole) {
      inheritedPermissions = parentRole.permissions
    }
  }

  const effectivePermissions = resolvePermissions(role.permissions, inheritedPermissions)

  return {
    ...role,
    inheritedPermissions,
    effectivePermissions,
  }
}

/**
 * Create a custom role for a tenant
 */
export async function createCustomRole(
  tenantId: string,
  data: CreateRoleInput
): Promise<Role> {
  // Validate parent role if specified
  if (data.parentRoleId) {
    const parentRole = await getRoleById(data.parentRoleId)
    if (!parentRole) {
      throw new Error('Parent role not found')
    }
    // Parent must be predefined or belong to same tenant
    if (parentRole.tenantId && parentRole.tenantId !== tenantId) {
      throw new Error('Cannot inherit from another tenant\'s role')
    }
  }

  const result = await sql`
    INSERT INTO public.roles (
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id
    )
    VALUES (
      ${tenantId},
      ${data.name},
      ${data.description || null},
      ${JSON.stringify(data.permissions)}::jsonb,
      FALSE,
      TRUE,
      ${data.parentRoleId || null}
    )
    RETURNING
      id,
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id,
      created_at,
      updated_at
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create role')
  }

  return mapRowToRole(row as Record<string, unknown>)
}

/**
 * Update a role (only custom roles can be updated)
 */
export async function updateRole(
  roleId: string,
  tenantId: string,
  data: UpdateRoleInput
): Promise<Role> {
  // Fetch existing role
  const existing = await getRoleById(roleId)
  if (!existing) {
    throw new Error('Role not found')
  }

  // Cannot modify predefined roles
  if (existing.isPredefined) {
    throw new Error('Cannot modify predefined roles')
  }

  // Must belong to the tenant
  if (existing.tenantId !== tenantId) {
    throw new Error('Role does not belong to this tenant')
  }

  // Validate new parent role if specified
  if (data.parentRoleId !== undefined && data.parentRoleId !== null) {
    // Prevent circular reference
    if (data.parentRoleId === roleId) {
      throw new Error('Role cannot inherit from itself')
    }

    const parentRole = await getRoleById(data.parentRoleId)
    if (!parentRole) {
      throw new Error('Parent role not found')
    }
    if (parentRole.tenantId && parentRole.tenantId !== tenantId) {
      throw new Error('Cannot inherit from another tenant\'s role')
    }
    // Prevent deep nesting (parent cannot have a parent)
    if (parentRole.parentRoleId) {
      throw new Error('Role inheritance is single-level only')
    }
  }

  const result = await sql`
    UPDATE public.roles
    SET
      name = COALESCE(${data.name ?? null}, name),
      description = COALESCE(${data.description ?? null}, description),
      permissions = COALESCE(${data.permissions ? JSON.stringify(data.permissions) : null}::jsonb, permissions),
      parent_role_id = ${data.parentRoleId === undefined ? existing.parentRoleId : data.parentRoleId},
      updated_at = NOW()
    WHERE id = ${roleId}
    RETURNING
      id,
      tenant_id,
      name,
      description,
      permissions,
      is_predefined,
      can_delete,
      parent_role_id,
      created_at,
      updated_at
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to update role')
  }

  return mapRowToRole(row as Record<string, unknown>)
}

/**
 * Delete a custom role
 */
export async function deleteRole(roleId: string, tenantId: string): Promise<void> {
  // Fetch existing role
  const existing = await getRoleById(roleId)
  if (!existing) {
    throw new Error('Role not found')
  }

  // Cannot delete predefined roles
  if (existing.isPredefined || !existing.canDelete) {
    throw new Error('Cannot delete predefined roles')
  }

  // Must belong to the tenant
  if (existing.tenantId !== tenantId) {
    throw new Error('Role does not belong to this tenant')
  }

  // Check if any users are assigned this role
  const usersWithRole = await sql`
    SELECT COUNT(*) as count
    FROM public.user_organizations
    WHERE role_id = ${roleId}
  `

  if (parseInt(String(usersWithRole.rows[0]?.count ?? 0), 10) > 0) {
    throw new Error('Cannot delete role while users are assigned to it')
  }

  // Check if any other roles inherit from this role
  const childRoles = await sql`
    SELECT COUNT(*) as count
    FROM public.roles
    WHERE parent_role_id = ${roleId}
  `

  if (parseInt(String(childRoles.rows[0]?.count ?? 0), 10) > 0) {
    throw new Error('Cannot delete role while other roles inherit from it')
  }

  await sql`DELETE FROM public.roles WHERE id = ${roleId}`
}

/**
 * Assign a role to a user in an organization
 */
export async function assignRoleToUser(
  userId: string,
  tenantId: string,
  roleId: string
): Promise<void> {
  // Validate role exists and is accessible to tenant
  const role = await getRoleById(roleId)
  if (!role) {
    throw new Error('Role not found')
  }
  if (role.tenantId && role.tenantId !== tenantId) {
    throw new Error('Role is not accessible to this tenant')
  }

  await sql`
    UPDATE public.user_organizations
    SET role_id = ${roleId}, updated_at = NOW()
    WHERE user_id = ${userId} AND organization_id = ${tenantId}
  `
}

/**
 * Get a user's role in an organization
 */
export async function getUserRole(
  userId: string,
  tenantId: string
): Promise<Role | null> {
  const result = await sql`
    SELECT r.*
    FROM public.user_organizations uo
    JOIN public.roles r ON r.id = uo.role_id
    WHERE uo.user_id = ${userId} AND uo.organization_id = ${tenantId}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToRole(row as Record<string, unknown>)
}

/**
 * Map database row to Role object
 */
function mapRowToRole(row: Record<string, unknown>): Role {
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string) || null,
    name: row.name as string,
    description: (row.description as string) || null,
    permissions: (row.permissions as string[]) || [],
    isPredefined: row.is_predefined as boolean,
    canDelete: row.can_delete as boolean,
    parentRoleId: (row.parent_role_id as string) || null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}
