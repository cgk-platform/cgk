/**
 * OAuth state HMAC utilities
 *
 * Creates and validates HMAC-signed OAuth state parameters to prevent
 * CSRF attacks during OAuth flows (GSC, Shopify, etc.).
 *
 * State format: base64url(JSON payload) + "." + hex(HMAC-SHA256)
 */

/**
 * Get the HMAC secret for OAuth state signing.
 * Falls back through multiple env vars for flexibility.
 */
function getOAuthSecret(): string {
  const secret =
    process.env.GSC_OAUTH_SECRET ||
    process.env.OAUTH_STATE_SECRET ||
    process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      'OAuth state secret not configured. Set GSC_OAUTH_SECRET, OAUTH_STATE_SECRET, or SESSION_SECRET.'
    )
  }
  return secret
}

/**
 * Compute HMAC-SHA256 of data using Web Crypto API (Edge-compatible).
 */
async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create an HMAC-signed OAuth state token.
 *
 * @param data - Arbitrary state data to include (will be JSON-serialized)
 * @returns Signed state string: base64url(payload).hmac
 */
export async function createOAuthState(data: Record<string, unknown>): Promise<string> {
  const payload = JSON.stringify({
    ...data,
    timestamp: Date.now(),
  })
  const encoded = Buffer.from(payload).toString('base64url')
  const secret = getOAuthSecret()
  const hmac = await hmacSha256(secret, encoded)
  return `${encoded}.${hmac}`
}

/**
 * Validate and decode an HMAC-signed OAuth state token.
 *
 * @param state - The signed state string from the OAuth callback
 * @param maxAgeMs - Maximum age of the state token (default: 1 hour)
 * @returns Decoded state data
 * @throws Error if signature is invalid or state has expired
 */
export async function validateOAuthState<T extends Record<string, unknown>>(
  state: string,
  maxAgeMs: number = 60 * 60 * 1000
): Promise<T & { timestamp: number }> {
  const dotIndex = state.lastIndexOf('.')
  if (dotIndex === -1) {
    throw new Error('Invalid state format')
  }

  const encoded = state.substring(0, dotIndex)
  const providedHmac = state.substring(dotIndex + 1)

  const secret = getOAuthSecret()
  const expectedHmac = await hmacSha256(secret, encoded)

  // Constant-time comparison to prevent timing attacks
  if (providedHmac.length !== expectedHmac.length) {
    throw new Error('Invalid state signature')
  }

  const a = new TextEncoder().encode(providedHmac)
  const b = new TextEncoder().encode(expectedHmac)
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  if (mismatch !== 0) {
    throw new Error('Invalid state signature')
  }

  // Decode payload
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as T & { timestamp: number }

  // Check expiration
  if (Date.now() - payload.timestamp > maxAgeMs) {
    throw new Error('State token expired')
  }

  return payload
}
