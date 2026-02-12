/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements secure OAuth 2.0 PKCE flow for customer authentication.
 */

import crypto from 'crypto'
import type { PKCEChallenge } from './types'

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const bytes = crypto.randomBytes(length)
  return bytes
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length)
}

/**
 * Generate a PKCE code verifier
 * Must be between 43-128 characters, using unreserved characters
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64)
}

/**
 * Generate a PKCE code challenge from a code verifier
 * Uses SHA-256 hash encoded as base64url
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest()
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generate a complete PKCE challenge pair
 */
export function generatePKCEChallenge(): PKCEChallenge {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge }
}

/**
 * Generate a nonce for ID token validation
 */
export function generateNonce(): string {
  return generateRandomString(32)
}

/**
 * Generate a state parameter for OAuth
 */
export function generateState(): string {
  return generateRandomString(32)
}

/**
 * Verify a code challenge matches a code verifier
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string
): boolean {
  const expectedChallenge = generateCodeChallenge(codeVerifier)
  return expectedChallenge === codeChallenge
}
