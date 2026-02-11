/**
 * Role and permission types for the admin UI
 */

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  isPredefined: boolean
  canDelete: boolean
  parentRoleId: string | null
  createdAt: string
  updatedAt: string
}

export interface RoleWithInheritance extends Role {
  inheritedPermissions: string[]
  effectivePermissions: string[]
}

export interface PermissionDefinition {
  key: string
  category: string
  name: string
  description: string
}

export interface PermissionsByCategory {
  [category: string]: PermissionDefinition[]
}
