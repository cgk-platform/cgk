/**
 * Permission checking logic with wildcard support
 *
 * Supports:
 * - Exact match: "orders.view"
 * - Full wildcard: "*" (grants everything)
 * - Category wildcard: "orders.*" (grants all orders permissions)
 * - Action wildcard: "*.view" (grants view on all categories)
 */

/**
 * Check if user has a specific permission
 *
 * @param userPermissions - Array of permission strings the user has
 * @param requiredPermission - The permission to check for
 * @returns true if user has the permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Handle null/undefined
  if (!userPermissions || userPermissions.length === 0) {
    return false
  }

  // 1. Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true
  }

  // 2. Full wildcard: "*" grants everything
  if (userPermissions.includes('*')) {
    return true
  }

  // Parse the required permission
  const parts = requiredPermission.split('.')
  if (parts.length < 2) {
    // Invalid permission format, only exact match would work
    return false
  }

  const category = parts[0]
  const action = parts.slice(1).join('.') // Handle nested actions like "payments.approve"

  // 3. Category wildcard: "orders.*" grants "orders.view", "orders.manage", etc.
  if (userPermissions.includes(`${category}.*`)) {
    return true
  }

  // 4. Action wildcard: "*.view" grants "orders.view", "creators.view", etc.
  // Only applies to simple category.action format
  if (parts.length === 2 && userPermissions.includes(`*.${action}`)) {
    return true
  }

  // 5. For nested permissions like "creators.payments.approve",
  // check if "creators.*" is granted
  if (parts.length > 2) {
    const topCategory = parts[0]
    if (userPermissions.includes(`${topCategory}.*`)) {
      return true
    }
  }

  return false
}

/**
 * Check if user has ANY of the specified permissions
 *
 * @param userPermissions - Array of permission strings the user has
 * @param requiredPermissions - Array of permissions, any of which is sufficient
 * @returns true if user has at least one of the permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((perm) => hasPermission(userPermissions, perm))
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @param userPermissions - Array of permission strings the user has
 * @param requiredPermissions - Array of permissions, all of which are required
 * @returns true if user has all of the permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((perm) => hasPermission(userPermissions, perm))
}

/**
 * Resolve effective permissions from role permissions and optional parent permissions
 *
 * Handles wildcard expansion for computing effective permissions.
 * Note: Wildcards are preserved in the output for storage, but can be
 * expanded for display purposes using expandWildcards().
 *
 * @param rolePermissions - Direct permissions granted to the role
 * @param parentPermissions - Permissions inherited from parent role (optional)
 * @returns Deduplicated array of all effective permissions
 */
export function resolvePermissions(
  rolePermissions: string[],
  parentPermissions?: string[]
): string[] {
  const allPermissions = new Set<string>()

  // Add parent permissions first (inherited)
  if (parentPermissions) {
    for (const perm of parentPermissions) {
      allPermissions.add(perm)
    }
  }

  // Add role's own permissions (can override or extend)
  for (const perm of rolePermissions) {
    allPermissions.add(perm)
  }

  return Array.from(allPermissions)
}

/**
 * Expand wildcard permissions into specific permissions
 * Useful for displaying what a wildcard actually grants
 *
 * @param permissions - Array of permission strings (may include wildcards)
 * @param allPossiblePermissions - All permission keys in the system
 * @returns Expanded array of specific permissions
 */
export function expandWildcards(
  permissions: string[],
  allPossiblePermissions: string[]
): string[] {
  const expanded = new Set<string>()

  for (const perm of permissions) {
    if (perm === '*') {
      // Full wildcard - add all permissions
      for (const p of allPossiblePermissions) {
        expanded.add(p)
      }
    } else if (perm.endsWith('.*')) {
      // Category wildcard - add all in category
      const category = perm.slice(0, -2) // Remove ".*"
      for (const p of allPossiblePermissions) {
        if (p.startsWith(`${category}.`)) {
          expanded.add(p)
        }
      }
    } else if (perm.startsWith('*.')) {
      // Action wildcard - add action across all categories
      const action = perm.slice(2) // Remove "*."
      for (const p of allPossiblePermissions) {
        if (p.endsWith(`.${action}`)) {
          expanded.add(p)
        }
      }
    } else {
      // Specific permission
      expanded.add(perm)
    }
  }

  return Array.from(expanded)
}

/**
 * Check if a permission string contains wildcards
 */
export function isWildcardPermission(permission: string): boolean {
  return permission === '*' || permission.includes('*')
}

/**
 * Validate a permission string format
 *
 * Valid formats:
 * - "*" (full wildcard)
 * - "category.*" (category wildcard)
 * - "*.action" (action wildcard)
 * - "category.action" (specific permission)
 * - "category.subcategory.action" (nested permission)
 */
export function isValidPermissionFormat(permission: string): boolean {
  // Full wildcard
  if (permission === '*') {
    return true
  }

  // Must contain at least one dot for other formats
  if (!permission.includes('.')) {
    return false
  }

  const parts = permission.split('.')

  // Category wildcard: "category.*"
  if (parts.length === 2 && parts[1] === '*') {
    return parts[0] !== '' && parts[0] !== '*'
  }

  // Action wildcard: "*.action"
  if (parts.length === 2 && parts[0] === '*') {
    return parts[1] !== '' && parts[1] !== '*'
  }

  // Specific permission: all parts must be non-empty and not wildcards
  // (except for the formats above)
  return parts.every((part) => part !== '' && part !== '*')
}
