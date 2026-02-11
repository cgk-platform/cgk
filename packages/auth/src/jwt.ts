import * as jose from 'jose'

import type { JWTPayload, OrgContext, UserRole } from './types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

const JWT_EXPIRATION = '7d'

/**
 * Input for creating a JWT
 */
export interface SignJWTInput {
  userId: string
  sessionId: string
  email: string
  orgSlug: string
  orgId: string
  role: UserRole
  orgs: OrgContext[]
}

/**
 * Sign a JWT token
 *
 * @param input - User and session data to include in JWT
 * @returns Signed JWT string
 */
export async function signJWT(input: SignJWTInput): Promise<string> {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: input.userId,
    sid: input.sessionId,
    email: input.email,
    org: input.orgSlug,
    orgId: input.orgId,
    role: input.role,
    orgs: input.orgs,
  }

  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET)
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT string to verify
 * @returns Decoded JWT payload
 * @throws Error if JWT is invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET)
  return payload as unknown as JWTPayload
}

/**
 * Decode a JWT without verifying (for debugging only)
 *
 * @param token - JWT string to decode
 * @returns Decoded payload or null if invalid format
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token)
    return decoded as unknown as JWTPayload
  } catch {
    return null
  }
}
