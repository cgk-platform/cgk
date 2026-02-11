/**
 * @cgk/auth - Authentication utilities
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
