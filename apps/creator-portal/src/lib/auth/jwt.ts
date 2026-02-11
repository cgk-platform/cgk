/**
 * Creator JWT utilities
 *
 * Separate JWT signing from admin auth. Creator JWT contains
 * brand membership claims for multi-brand access.
 */

import * as jose from 'jose'

import type { BrandMembership, CreatorJWTPayload, MembershipStatus } from '../types'

// Use separate secret for creator tokens
const CREATOR_JWT_SECRET = new TextEncoder().encode(
  process.env.CREATOR_JWT_SECRET || process.env.JWT_SECRET || 'creator-development-secret'
)

export const CREATOR_JWT_EXPIRATION = '7d'

/**
 * Input for signing a creator JWT
 */
export interface SignCreatorJWTInput {
  creatorId: string
  sessionId: string
  email: string
  name: string
  memberships: BrandMembership[]
}

/**
 * Sign a creator JWT token
 *
 * @param input - Creator and session data to include in JWT
 * @returns Signed JWT string
 */
export async function signCreatorJWT(input: SignCreatorJWTInput): Promise<string> {
  // Only include active memberships in JWT for access control
  const activeMemberships = input.memberships
    .filter((m) => m.status === 'active')
    .map((m) => ({
      brandId: m.brandId,
      brandSlug: m.brandSlug,
      status: m.status as MembershipStatus,
    }))

  const payload: Omit<CreatorJWTPayload, 'iat' | 'exp'> = {
    sub: input.creatorId,
    sid: input.sessionId,
    email: input.email,
    name: input.name,
    memberships: activeMemberships,
  }

  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(CREATOR_JWT_EXPIRATION)
    .setIssuer('cgk-creator-portal')
    .sign(CREATOR_JWT_SECRET)
}

/**
 * Verify and decode a creator JWT token
 *
 * @param token - JWT string to verify
 * @returns Decoded JWT payload
 * @throws Error if JWT is invalid or expired
 */
export async function verifyCreatorJWT(token: string): Promise<CreatorJWTPayload> {
  const { payload } = await jose.jwtVerify(token, CREATOR_JWT_SECRET, {
    issuer: 'cgk-creator-portal',
  })
  return payload as unknown as CreatorJWTPayload
}

/**
 * Decode a creator JWT without verifying (for debugging only)
 *
 * @param token - JWT string to decode
 * @returns Decoded payload or null if invalid format
 */
export function decodeCreatorJWT(token: string): CreatorJWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token)
    return decoded as unknown as CreatorJWTPayload
  } catch {
    return null
  }
}

/**
 * Check if a creator has access to a specific brand
 *
 * @param payload - Decoded JWT payload
 * @param brandId - Brand ID to check access for
 * @returns True if creator has active membership with the brand
 */
export function hasCreatorBrandAccess(
  payload: CreatorJWTPayload,
  brandId: string
): boolean {
  return payload.memberships.some(
    (m) => m.brandId === brandId && m.status === 'active'
  )
}

/**
 * Get all brand IDs a creator has access to
 *
 * @param payload - Decoded JWT payload
 * @returns Array of brand IDs
 */
export function getCreatorBrandIds(payload: CreatorJWTPayload): string[] {
  return payload.memberships
    .filter((m) => m.status === 'active')
    .map((m) => m.brandId)
}
