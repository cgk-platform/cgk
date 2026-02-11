/**
 * Authentication type definitions
 */

export type UserRole = 'super_admin' | 'owner' | 'admin' | 'member'
export type UserStatus = 'active' | 'invited' | 'disabled'
export type MagicLinkPurpose = 'login' | 'signup' | 'invite' | 'password_reset'

/**
 * Organization context stored in JWT
 */
export interface OrgContext {
  id: string
  slug: string
  role: UserRole
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string           // userId
  sid: string           // sessionId
  email: string
  org: string           // current orgSlug
  orgId: string         // current orgId
  role: UserRole
  orgs: OrgContext[]    // all accessible orgs
  iat: number
  exp: number
}

/**
 * Session record from database
 */
export interface Session {
  id: string
  userId: string
  organizationId: string | null
  tokenHash: string
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  revokedAt: Date | null
}

/**
 * Auth context extracted from request
 */
export interface AuthContext {
  userId: string
  email: string
  sessionId: string
  tenantId: string | null      // null for super admin
  tenantSlug: string | null
  role: UserRole
  orgs: OrgContext[]
}

/**
 * User record from database
 */
export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  passwordHash: string | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Magic link record from database
 */
export interface MagicLink {
  id: string
  email: string
  tokenHash: string
  purpose: MagicLinkPurpose
  organizationId: string | null
  inviteRole: UserRole | null
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

/**
 * Result of verifying a magic link
 */
export interface MagicLinkVerifyResult {
  userId: string | null
  purpose: MagicLinkPurpose
  orgId: string | null
  inviteRole: UserRole | null
}

/**
 * Session creation result
 */
export interface SessionCreateResult {
  session: Session
  token: string  // Raw token (only returned on create)
}
