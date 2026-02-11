/**
 * Creator Portal Authentication Module
 *
 * Provides authentication utilities for creators who can work with
 * multiple brands simultaneously. Separate from admin auth system.
 */

export {
  authenticateCreator,
  getCreatorByEmail,
  getCreatorById,
  loadBrandMemberships,
} from './authenticate'

export {
  signCreatorJWT,
  verifyCreatorJWT,
  decodeCreatorJWT,
  CREATOR_JWT_EXPIRATION,
} from './jwt'

export {
  createCreatorSession,
  validateCreatorSession,
  validateCreatorSessionById,
  revokeCreatorSession,
  revokeAllCreatorSessions,
  revokeOtherCreatorSessions,
  getCreatorSessions,
  updateCreatorSessionActivity,
} from './session'

export {
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed,
  getPasswordResetRequestCount,
  cleanupExpiredPasswordResetTokens,
  sendPasswordResetEmail,
} from './password-reset'

export {
  createCreatorMagicLink,
  verifyCreatorMagicLink,
  sendCreatorMagicLinkEmail,
} from './magic-link'

export {
  hashPassword,
  verifyPassword,
} from './password'

export {
  requireCreatorAuth,
  getCreatorContext,
  CreatorAuthError,
} from './middleware'

export {
  checkRateLimit,
  checkPasswordResetRateLimit,
  recordRateLimitAttempt,
  recordPasswordResetAttempt,
  clearRateLimit,
  getClientIP,
  getRateLimitHeaders,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_SECONDS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_WINDOW_SECONDS,
} from './rate-limit'

export {
  CREATOR_AUTH_COOKIE_NAME,
  setCreatorAuthCookie,
  getCreatorAuthCookie,
  clearCreatorAuthCookie,
  getSetCookieHeader,
  getClearCookieHeader,
  getTokenFromRequest,
} from './cookies'

export type { CreatorAuthContext } from './middleware'
