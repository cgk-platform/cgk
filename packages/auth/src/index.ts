/**
 * @cgk-platform/auth - Authentication utilities
 *
 * @ai-pattern authentication
 * @ai-required Use getTenantContext() at the start of every API route
 */

// Password utilities
export { hashPassword, verifyPassword } from './password'

// Session management
export {
  createSession,
  getUserSessions,
  revokeAllSessions,
  revokeSession,
  updateSessionOrganization,
  validateSession,
  validateSessionById,
} from './session'

// JWT utilities
export { decodeJWT, signJWT, verifyJWT } from './jwt'
export type { SignJWTInput } from './jwt'

// Magic link utilities
export {
  cleanupExpiredMagicLinks,
  createMagicLink,
  sendMagicLinkEmail,
  verifyMagicLink,
} from './magic-link'

// Cookie utilities
export {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  cookieOptions,
  getAuthCookie,
  setAuthCookie,
} from './cookies'

// Auth middleware
export {
  authMiddleware,
  composeMiddleware,
  hasRole,
  requireRole,
} from './middleware'

// Context utilities
export {
  addUserToOrganization,
  AuthenticationError,
  createUser,
  getTenantContext,
  getUserByEmail,
  getUserById,
  getUserOrganizations,
  requireAuth,
  updateUserLastLogin,
} from './context'

// Super Admin utilities
export {
  checkIpAllowlist,
  checkRateLimit,
  cleanupExpiredSessions,
  createSuperAdminSession,
  getAllSuperAdmins,
  getAuditLog,
  getSuperAdminUser,
  isSuperAdmin,
  logAuditAction,
  markMfaVerified,
  revokeAllSuperAdminSessions,
  revokeSuperAdminSession,
  setMfaChallengeExpiration,
  validateSuperAdminSession,
  validateSuperAdminSessionById,
} from './super-admin'

export type {
  AuditAction,
  AuditLogEntry,
  ResourceType,
  SuperAdminRole,
  SuperAdminSession,
  SuperAdminSessionResult,
  SuperAdminUser,
} from './super-admin'

// Team management utilities
export {
  acceptInvitation,
  canUserLeaveOrganization,
  createInvitation,
  getInvitation,
  getInvitationCountToday,
  getInvitations,
  getTeamAuditLog,
  getTeamMember,
  getTeamMemberCount,
  getTeamMembers,
  leaveOrganization,
  removeMember,
  resendInvitation,
  revokeInvitation,
  updateMemberRole,
} from './team'

export type {
  TeamAuditEntry,
  TeamInvitation,
  TeamMember,
} from './team'

// User Admin utilities (super admin only)
export {
  disableUser,
  enableUser,
  getAllUsers,
  getSuperAdminRegistry,
  getUserActivityLog,
  getUserWithMemberships,
  grantSuperAdmin,
  logUserActivity,
  revokeSuperAdmin,
  searchUsers,
  TRACKED_ACTIONS,
} from './user-admin'

export type {
  PaginatedUsers,
  PaginationOptions,
  PlatformUser,
  PlatformUserStatus,
  TrackedAction,
  UserActivityEntry,
  UserMembership,
  UserQueryOptions,
  UserWithMemberships,
} from './user-admin'

// RBAC Permissions
export {
  // Permission definitions
  getAllPermissions,
  getActionFromPermission,
  getCategories,
  getCategoryFromPermission,
  getPermissionsByCategory,
  PERMISSION_CATEGORIES,
  // Permission checking
  expandWildcards,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isValidPermissionFormat,
  isWildcardPermission,
  resolvePermissions,
  // Role management
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
  // User permissions
  getDefaultRoleIdForLegacyRole,
  getUserPermissions,
  getUsersWithPermission,
  isTenantAdmin,
  // Permission middleware
  checkAllPermissionsOrRespond,
  checkAnyPermissionOrRespond,
  checkPermissionOrRespond,
  PermissionDeniedError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  withPermissionCheck,
} from './permissions'

export type {
  CreateRoleInput,
  PermissionDefinition,
  Role,
  RoleWithInherited,
  UpdateRoleInput,
} from './permissions'

// Tenant context switching
export {
  getDefaultTenant,
  getUserTenants,
  setDefaultTenant,
  shouldShowWelcomeModal,
  switchTenantContext,
  TenantAccessError,
  updateMembershipActivity,
} from './tenant-context'

export type {
  SwitchTenantResult,
  TenantContext,
} from './tenant-context'

// Impersonation utilities
export {
  cleanupExpiredImpersonationSessions,
  endImpersonation,
  formatRemainingTime,
  getActiveImpersonationSessions,
  getImpersonationHistory,
  getImpersonationSession,
  getRemainingSessionTime,
  ImpersonationError,
  isImpersonationToken,
  startImpersonation,
  validateImpersonationSession,
  verifyImpersonationJWT,
} from './impersonation'

export type {
  ImpersonationJWTPayload,
  ImpersonationResult,
  ImpersonationSession,
} from './impersonation'

// Feature Flag Enforcement
export {
  checkFeatureOrRespond,
  FeatureNotEnabledError,
  getTenantFeatures,
  isFeatureEnabled,
  requireFeature,
  setTenantFeature,
  withFeatureFlag,
} from './feature-flags'

// Types
export type {
  AuthContext,
  JWTPayload,
  MagicLink,
  MagicLinkPurpose,
  MagicLinkVerifyResult,
  OrgContext,
  Session,
  SessionCreateResult,
  User,
  UserRole,
  UserStatus,
} from './types'
