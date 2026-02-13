/**
 * @cgk-platform/video/permissions - Permission exports
 */

export type {
  PermissionCheckResult,
  PermissionTargetType,
  PermissionTarget,
  PermissionUserContext,
} from './types.js'

export {
  getVideoPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  deleteVideoPermissions,
  hasPublicPermission,
  getUserPermission,
  getEmailPermission,
} from './db.js'

export {
  checkVideoPermission,
  canEditVideo,
  canDeleteVideo,
  canCommentOnVideo,
  permissionIncludes,
} from './check.js'
