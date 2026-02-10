/**
 * @cgk/auth - Authentication utilities
 *
 * @ai-pattern authentication
 * @ai-required Use getTenantContext() at the start of every API route
 */

export { getTenantContext, requireAuth } from './context'
export { validateSession, createSession, deleteSession } from './session'
export { signJWT, verifyJWT } from './jwt'
export { sendMagicLink, verifyMagicLink } from './magic-link'

export type { JWTPayload, Session, AuthContext } from './types'
