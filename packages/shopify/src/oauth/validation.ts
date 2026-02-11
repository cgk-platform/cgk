/**
 * Shopify OAuth validation utilities
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { ShopifyError } from './errors.js'

/**
 * Valid Shopify shop domain regex
 * Matches: store.myshopify.com
 */
const SHOP_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

/**
 * Validate a Shopify shop domain
 */
export function isValidShopDomain(shop: string): boolean {
  return SHOP_DOMAIN_REGEX.test(shop)
}

/**
 * Validate shop domain and throw if invalid
 */
export function validateShopDomain(shop: string): void {
  if (!isValidShopDomain(shop)) {
    throw new ShopifyError(
      'INVALID_SHOP',
      `Invalid Shopify shop domain: ${shop}. Must be a valid .myshopify.com domain.`
    )
  }
}

/**
 * Normalize a shop domain to standard format
 */
export function normalizeShopDomain(shop: string): string {
  // Remove protocol if present
  let normalized = shop.replace(/^https?:\/\//, '')

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '')

  // Add .myshopify.com if not present
  if (!normalized.includes('.myshopify.com')) {
    normalized = `${normalized}.myshopify.com`
  }

  return normalized.toLowerCase()
}

/**
 * Verify HMAC signature for OAuth callback
 *
 * @param params - OAuth callback parameters (excluding hmac)
 * @param hmac - HMAC signature from Shopify
 * @param clientSecret - Shopify app client secret
 */
export function verifyOAuthHmac(
  params: Record<string, string>,
  hmac: string,
  clientSecret: string
): boolean {
  // Build query string for HMAC calculation
  // Sort parameters alphabetically and join with &
  const entries = Object.entries(params)
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))

  const queryString = entries
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  // Calculate HMAC
  const calculatedHmac = createHmac('sha256', clientSecret)
    .update(queryString)
    .digest('hex')

  // Use timing-safe comparison
  try {
    const hmacBuffer = Buffer.from(hmac, 'hex')
    const calculatedBuffer = Buffer.from(calculatedHmac, 'hex')

    if (hmacBuffer.length !== calculatedBuffer.length) {
      return false
    }

    return timingSafeEqual(hmacBuffer, calculatedBuffer)
  } catch {
    return false
  }
}

/**
 * Verify webhook HMAC signature
 *
 * @param body - Raw request body
 * @param hmac - HMAC signature from X-Shopify-Hmac-Sha256 header
 * @param secret - Webhook signing secret
 */
export function verifyWebhookHmac(
  body: string | Buffer,
  hmac: string,
  secret: string
): boolean {
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body

  const calculatedHmac = createHmac('sha256', secret)
    .update(bodyBuffer)
    .digest('base64')

  // Use timing-safe comparison
  try {
    const hmacBuffer = Buffer.from(hmac, 'base64')
    const calculatedBuffer = Buffer.from(calculatedHmac, 'base64')

    if (hmacBuffer.length !== calculatedBuffer.length) {
      return false
    }

    return timingSafeEqual(hmacBuffer, calculatedBuffer)
  } catch {
    return false
  }
}

/**
 * Validate OAuth timestamp is recent (within 5 minutes)
 */
export function isValidOAuthTimestamp(timestamp: string): boolean {
  const ts = parseInt(timestamp, 10)

  if (isNaN(ts)) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  const fiveMinutes = 5 * 60

  return Math.abs(now - ts) <= fiveMinutes
}
