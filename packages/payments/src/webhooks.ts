/**
 * Payment webhook verification
 */

import { createHmac } from 'crypto'

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
 * Verify a Wise webhook signature
 */
export function verifyWiseWebhook(
  body: string,
  signature: string,
  publicKey: string
): boolean {
  // Wise uses RSA-SHA256 signatures
  // This is a placeholder - actual implementation requires crypto verification
  const hmac = createHmac('sha256', publicKey)
  hmac.update(body)
  const expectedSignature = hmac.digest('base64')

  return signature === expectedSignature
}
