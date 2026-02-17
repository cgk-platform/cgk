/**
 * Payment webhook verification
 *
 * Wise uses RSA-SHA256 signature verification.
 * Stripe uses their own SDK verification.
 *
 * Both implementations are Edge Runtime compatible using Web Crypto API.
 */

import Stripe from 'stripe'

/**
 * Verify a Stripe webhook signature
 */
export function verifyStripeWebhook(
  body: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = new Stripe(webhookSecret, { apiVersion: '2025-02-24.acacia' })
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

/**
 * Convert PEM-formatted public key to CryptoKey for Web Crypto API
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers and convert to binary
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  return crypto.subtle.importKey(
    'spki',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  )
}

/**
 * Verify a Wise webhook signature using RSA-SHA256
 *
 * Wise signs webhooks with their private RSA key, and we verify using
 * their public key. The signature is base64-encoded.
 *
 * @see https://docs.wise.com/api-docs/features/webhooks#signature-verification
 *
 * @param body - The raw request body as a string
 * @param signature - The X-Signature header value (base64-encoded)
 * @param publicKey - Wise's public key in PEM format
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifyWiseWebhook(
  body: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    // Import the public key for use with Web Crypto API
    const cryptoKey = await importPublicKey(publicKey)

    // Decode the base64 signature
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))

    // Encode the body as UTF-8
    const encoder = new TextEncoder()
    const bodyBytes = encoder.encode(body)

    // Verify the signature using RSA-SHA256
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      bodyBytes
    )

    return isValid
  } catch (error) {
    // Log error but don't expose details (could be attack attempt)
    console.error('[Wise Webhook] Signature verification failed:', error)
    return false
  }
}

/**
 * Synchronous verification fallback for Node.js environments
 * (When Edge Runtime is not available)
 */
export function verifyWiseWebhookSync(
  body: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Dynamic import to avoid Edge Runtime issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createVerify } = require('crypto')

    const verifier = createVerify('RSA-SHA256')
    verifier.update(body, 'utf8')

    return verifier.verify(publicKey, signature, 'base64')
  } catch (error) {
    console.error('[Wise Webhook] Sync verification failed:', error)
    return false
  }
}
