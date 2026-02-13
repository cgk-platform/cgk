/**
 * OAuth state management with CSRF protection
 *
 * @ai-pattern security
 * @ai-required All OAuth flows MUST use signed state parameters
 */

import crypto from 'crypto'

import { createTenantCache } from '@cgk-platform/db'

import type { OAuthStatePayload, SignedOAuthState } from './types.js'

/** State TTL in seconds (10 minutes) */
const STATE_TTL = 600

/** Redis key prefix for OAuth states */
const STATE_KEY_PREFIX = 'oauth_state'

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Create an HMAC signature for OAuth state
 *
 * @param payload - The state payload to sign
 * @param secret - The secret key for HMAC (app secret)
 * @returns HMAC-SHA256 signature as hex string
 */
export function signStatePayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Verify an HMAC signature for OAuth state
 *
 * @param payload - The state payload that was signed
 * @param signature - The signature to verify
 * @param secret - The secret key for HMAC
 * @returns true if signature is valid
 */
export function verifyStateSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signStatePayload(payload, secret)
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Create a signed OAuth state parameter
 *
 * @param tenantId - The tenant initiating the OAuth flow
 * @param returnUrl - URL to redirect after OAuth completion
 * @param secret - App secret for HMAC signing
 * @returns Base64URL-encoded signed state
 */
export async function createOAuthState(
  tenantId: string,
  returnUrl: string,
  secret: string
): Promise<{ state: string; nonce: string }> {
  const nonce = generateNonce()
  const timestamp = Date.now()

  const payload: OAuthStatePayload = {
    tenantId,
    returnUrl,
    nonce,
    timestamp,
  }

  const payloadString = JSON.stringify(payload)
  const hmac = signStatePayload(payloadString, secret)

  const signedState: SignedOAuthState = {
    payload: payloadString,
    hmac,
  }

  // Encode as base64url for URL safety
  const state = Buffer.from(JSON.stringify(signedState)).toString('base64url')

  // Store nonce in Redis for validation
  const cache = createTenantCache('_oauth')
  await cache.set(
    `${STATE_KEY_PREFIX}:${nonce}`,
    { tenantId, returnUrl },
    { ttl: STATE_TTL }
  )

  return { state, nonce }
}

/**
 * Validate and parse an OAuth state parameter
 *
 * @param state - The base64url-encoded state from OAuth callback
 * @param secret - App secret for HMAC verification
 * @returns Parsed and validated state payload
 * @throws Error if state is invalid, expired, or already used
 */
export async function validateOAuthState(
  state: string,
  secret: string
): Promise<OAuthStatePayload> {
  // Decode from base64url
  let signedState: SignedOAuthState
  try {
    signedState = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    throw new Error('Invalid OAuth state format')
  }

  // Verify HMAC signature
  if (!verifyStateSignature(signedState.payload, signedState.hmac, secret)) {
    throw new Error('Invalid OAuth state signature')
  }

  // Parse payload
  const payload: OAuthStatePayload = JSON.parse(signedState.payload)

  // Check timestamp (max 10 minutes old)
  if (Date.now() - payload.timestamp > STATE_TTL * 1000) {
    throw new Error('OAuth state expired')
  }

  // Verify nonce exists in Redis (prevents replay attacks)
  const cache = createTenantCache('_oauth')
  const storedState = await cache.get<{ tenantId: string; returnUrl: string }>(
    `${STATE_KEY_PREFIX}:${payload.nonce}`
  )

  if (!storedState) {
    throw new Error('OAuth state not found or already used')
  }

  // Delete nonce to prevent reuse
  await cache.delete(`${STATE_KEY_PREFIX}:${payload.nonce}`)

  // Verify stored values match
  if (
    storedState.tenantId !== payload.tenantId ||
    storedState.returnUrl !== payload.returnUrl
  ) {
    throw new Error('OAuth state mismatch')
  }

  return payload
}

/**
 * Store OAuth state in Redis without HMAC signing
 * Used for simpler OAuth flows (Google, TikTok) that don't need custom state payload
 *
 * @param provider - OAuth provider name (used in key prefix)
 * @param tenantId - The tenant initiating the OAuth flow
 * @param returnUrl - URL to redirect after OAuth completion
 * @returns The state token to pass to OAuth provider
 */
export async function storeSimpleOAuthState(
  provider: string,
  tenantId: string,
  returnUrl: string
): Promise<string> {
  const state = generateNonce(32)

  const cache = createTenantCache('_oauth')
  await cache.set(
    `${provider}_oauth_state:${state}`,
    { tenantId, returnUrl },
    { ttl: STATE_TTL }
  )

  return state
}

/**
 * Validate and retrieve simple OAuth state from Redis
 *
 * @param provider - OAuth provider name (used in key prefix)
 * @param state - The state token from OAuth callback
 * @returns The stored tenant ID and return URL
 * @throws Error if state is invalid or not found
 */
export async function validateSimpleOAuthState(
  provider: string,
  state: string
): Promise<{ tenantId: string; returnUrl: string }> {
  const cache = createTenantCache('_oauth')
  const storedState = await cache.get<{ tenantId: string; returnUrl: string }>(
    `${provider}_oauth_state:${state}`
  )

  if (!storedState) {
    throw new Error('Invalid or expired OAuth state')
  }

  // Delete state to prevent reuse
  await cache.delete(`${provider}_oauth_state:${state}`)

  return storedState
}
