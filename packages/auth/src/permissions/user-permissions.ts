/**
 * User permissions service
 * Get and cache user permissions for a tenant
 */

import { sql } from '@cgk-platform/db'

import { resolvePermissions } from './checker'
import { PREDEFINED_ROLE_IDS } from './roles'

/**
 * Get a user's effective permissions for a tenant
 *
 * This resolves:
 * 1. The user's assigned role (via role_id in user_organizations)
 * 2. Parent role permissions (if inheritance is set)
 * 3. Legacy role fallback (if role_id is not set)
 *
 * @param userId - The user ID
 * @param tenantId - The tenant/organization ID
 * @returns Array of permission strings
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<string[]> {
  // Get user's organization membership with role
  const membershipResult = await sql`
    SELECT
      uo.role as legacy_role,
      uo.role_id,
      r.permissions as role_permissions,
      r.parent_role_id,
      pr.permissions as parent_permissions
    FROM user_organizations uo
    LEFT JOIN roles r ON r.id = uo.role_id
    LEFT JOIN roles pr ON pr.id = r.parent_role_id
    WHERE uo.user_id = ${userId} AND uo.organization_id = ${tenantId}
  `

  const membership = membershipResult.rows[0]
  if (!membership) {
    // User is not a member of this organization
    return []
  }

  // If user has an assigned RBAC role, use it
  if (membership.role_id) {
    const rolePermissions = (membership.role_permissions as string[]) || []
    const parentPermissions = (membership.parent_permissions as string[]) || undefined

    return resolvePermissions(rolePermissions, parentPermissions)
  }

  // Fallback to legacy role mapping
  const legacyRole = membership.legacy_role as string
  return getLegacyRolePermissions(legacyRole)
}

/**
 * Map legacy UserRole to permissions
 *
 * This provides backwards compatibility with the existing role system
 * while the RBAC roles are being adopted.
 */
function getLegacyRolePermissions(role: string): string[] {
  switch (role) {
    case 'super_admin':
    case 'owner':
      // Full access
      return ['*']

    case 'admin':
      // Most access except billing
      return [
        'tenant.settings.view',
        'team.*',
        'creators.*',
        'orders.*',
        'subscriptions.*',
        'reviews.*',
        'products.*',
        'content.*',
        'dam.*',
        'integrations.*',
        'analytics.*',
        'payouts.view',
        'treasury.view',
        'expenses.view',
        'reports.export',
      ]

    case 'member':
      // View access only
      return ['*.view']

    default:
      return []
  }
}

/**
 * Get the default role ID for a legacy role
 *
 * Used when assigning roles to new team members
 */
export function getDefaultRoleIdForLegacyRole(legacyRole: string): string {
  switch (legacyRole) {
    case 'owner':
    case 'super_admin':
      return PREDEFINED_ROLE_IDS.TENANT_ADMIN
    case 'admin':
      return PREDEFINED_ROLE_IDS.MANAGER
    case 'member':
    default:
      return PREDEFINED_ROLE_IDS.VIEWER
  }
}

/**
 * Check if a user is a tenant admin (has full access)
 */
export async function isTenantAdmin(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, tenantId)
  return permissions.includes('*')
}

/**
 * Get all users with a specific permission in a tenant
 */
export async function getUsersWithPermission(
  tenantId: string,
  permission: string
): Promise<string[]> {
  // This is a more expensive query, use sparingly
  // Get all users in the organization
  const usersResult = await sql`
    SELECT
      uo.user_id,
      uo.role as legacy_role,
      uo.role_id,
      r.permissions as role_permissions,
      r.parent_role_id,
      pr.permissions as parent_permissions
    FROM user_organizations uo
    LEFT JOIN roles r ON r.id = uo.role_id
    LEFT JOIN roles pr ON pr.id = r.parent_role_id
    WHERE uo.organization_id = ${tenantId}
  `

  const { hasPermission } = await import('./checker')
  const userIds: string[] = []

  for (const row of usersResult.rows) {
    let permissions: string[]

    if (row.role_id) {
      const rolePerms = (row.role_permissions as string[]) || []
      const parentPerms = (row.parent_permissions as string[]) || undefined
      permissions = resolvePermissions(rolePerms, parentPerms)
    } else {
      permissions = getLegacyRolePermissions(row.legacy_role as string)
    }

    if (hasPermission(permissions, permission)) {
      userIds.push(row.user_id as string)
    }
  }

  return userIds
}
