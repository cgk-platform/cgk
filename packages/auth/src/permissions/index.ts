/**
 * RBAC Permissions Module
 *
 * @ai-pattern rbac
 * @ai-required Use checkPermissionOrRespond() in API routes
 */

// Permission definitions
export {
  getAllPermissions,
  getActionFromPermission,
  getCategories,
  getCategoryFromPermission,
  getPermissionsByCategory,
  PERMISSION_CATEGORIES,
} from './definitions'
export type { PermissionDefinition } from './definitions'

// Permission checking
export {
  expandWildcards,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isValidPermissionFormat,
  isWildcardPermission,
  resolvePermissions,
} from './checker'

// Role management
export {
  assignRoleToUser,
  createCustomRole,
  deleteRole,
  getPredefinedRoles,
  getRoleById,
  getRolesForTenant,
  getRoleWithInheritance,
  getUserRole,
  PREDEFINED_ROLE_IDS,
  updateRole,
} from './roles'
export type {
  CreateRoleInput,
  Role,
  RoleWithInherited,
  UpdateRoleInput,
} from './roles'

// User permissions
export {
  getDefaultRoleIdForLegacyRole,
  getUserPermissions,
  getUsersWithPermission,
  isTenantAdmin,
} from './user-permissions'

// Permission middleware
export {
  checkAllPermissionsOrRespond,
  checkAnyPermissionOrRespond,
  checkPermissionOrRespond,
  PermissionDeniedError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  withPermissionCheck,
} from './middleware'
