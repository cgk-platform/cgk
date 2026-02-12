/**
 * Contractor authentication module
 *
 * Exports all auth utilities for the contractor portal.
 */

// Authentication
export {
  authenticateContractor,
  createContractor,
  getContractorByEmail,
  getContractorById,
  getContractorWithStats,
  getTenantBySlug,
  updateContractorPassword,
} from './authenticate'

// Cookies
export { AUTH_COOKIE_NAME, getAuthCookie, getClearCookieHeader, getSetCookieHeader } from './cookies'

// JWT
export {
  CONTRACTOR_JWT_EXPIRATION,
  decodeContractorJWT,
  signContractorJWT,
  verifyContractorJWT,
  type SignContractorJWTInput,
} from './jwt'

// Magic links
export {
  cleanupExpiredContractorMagicLinks,
  createContractorMagicLink,
  sendContractorMagicLinkEmail,
  verifyContractorMagicLink,
  type MagicLinkPurpose,
} from './magic-link'

// Middleware
export {
  forbiddenResponse,
  getContractorAuthContext,
  requireContractorAuth,
  unauthorizedResponse,
  type ContractorAuthContext,
} from './middleware'

// Password
export { hashPassword, validatePassword, verifyPassword } from './password'

// Password reset
export {
  createPasswordResetToken,
  markPasswordResetTokenUsed,
  sendPasswordResetEmail,
  verifyPasswordResetToken,
} from './password-reset'

// Rate limiting
export {
  checkPasswordResetRateLimit,
  checkRateLimit,
  clearRateLimit,
  getClientIP,
  getRateLimitHeaders,
  recordPasswordResetAttempt,
  recordRateLimitAttempt,
} from './rate-limit'

// Session
export {
  createContractorSession,
  getContractorSessions,
  revokeAllContractorSessions,
  revokeContractorSession,
  updateContractorSessionActivity,
  validateContractorSession,
  validateContractorSessionById,
} from './session'
