import * as jose from 'jose'

import type { JWTPayload } from './types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

/**
 * Sign a JWT token
 */
export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET)
  return payload as unknown as JWTPayload
}
