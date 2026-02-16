/**
 * Contractor JWT utilities
 *
 * Separate JWT signing from admin/creator auth. Contractor JWT contains
 * single-tenant context (unlike multi-brand creators).
 */

import * as jose from 'jose'

import type { ContractorJWTPayload } from '../types'

// Use separate secret for contractor tokens - MUST be set in environment
function getContractorJWTSecret(): Uint8Array {
  const secret = process.env.CONTRACTOR_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT secret not configured. Set CONTRACTOR_JWT_SECRET or JWT_SECRET environment variable.'
    )
  }
  return new TextEncoder().encode(secret)
}

export const CONTRACTOR_JWT_EXPIRATION = '7d'

/**
 * Input for signing a contractor JWT
 */
export interface SignContractorJWTInput {
  contractorId: string
  sessionId: string
  email: string
  name: string
  tenantId: string
  tenantSlug: string
}

/**
 * Sign a contractor JWT token
 *
 * @param input - Contractor and session data to include in JWT
 * @returns Signed JWT string
 */
export async function signContractorJWT(input: SignContractorJWTInput): Promise<string> {
  const payload: Omit<ContractorJWTPayload, 'iat' | 'exp'> = {
    sub: input.contractorId,
    sid: input.sessionId,
    email: input.email,
    name: input.name,
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
  }

  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(CONTRACTOR_JWT_EXPIRATION)
    .setIssuer('cgk-contractor-portal')
    .sign(getContractorJWTSecret())
}

/**
 * Verify and decode a contractor JWT token
 *
 * @param token - JWT string to verify
 * @returns Decoded JWT payload
 * @throws Error if JWT is invalid or expired
 */
export async function verifyContractorJWT(token: string): Promise<ContractorJWTPayload> {
  const { payload } = await jose.jwtVerify(token, getContractorJWTSecret(), {
    issuer: 'cgk-contractor-portal',
  })
  return payload as unknown as ContractorJWTPayload
}

/**
 * Decode a contractor JWT without verifying (for debugging only)
 *
 * @param token - JWT string to decode
 * @returns Decoded payload or null if invalid format
 */
export function decodeContractorJWT(token: string): ContractorJWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token)
    return decoded as unknown as ContractorJWTPayload
  } catch {
    return null
  }
}
