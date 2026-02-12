/**
 * Edge-compatible crypto utilities
 *
 * Uses Web Crypto API instead of Node.js crypto module
 * to ensure compatibility with Edge Runtime (Vercel middleware, Cloudflare Workers, etc.)
 */

/**
 * Hash a string using SHA-256 (Edge-compatible)
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate secure random bytes (Edge-compatible)
 *
 * @param length - Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Generate a secure random token as base64url string (Edge-compatible)
 *
 * @param length - Number of random bytes (token will be longer due to base64 encoding)
 * @returns Base64url-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = randomBytes(length)
  // Convert to base64url (URL-safe base64 without padding)
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a random UUID v4 (Edge-compatible)
 *
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}
