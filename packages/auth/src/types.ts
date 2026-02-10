/**
 * Authentication type definitions
 */

export interface JWTPayload {
  sub: string           // User ID
  email: string
  org: string           // Organization ID (tenant)
  role: 'superadmin' | 'admin' | 'member'
  orgs: string[]        // All accessible orgs
  iat: number
  exp: number
}

export interface Session {
  id: string
  userId: string
  organizationId: string
  tokenHash: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface AuthContext {
  tenantId: string
  tenantSlug: string
  userId: string
  email: string
  role: 'superadmin' | 'admin' | 'member'
}
