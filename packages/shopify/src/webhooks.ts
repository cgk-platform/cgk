/**
 * Shopify webhook utilities
 */

import { createHmac } from 'crypto'

export type WebhookTopic =
  | 'orders/create'
  | 'orders/updated'
  | 'orders/fulfilled'
  | 'orders/cancelled'
  | 'products/create'
  | 'products/update'
  | 'products/delete'
  | 'customers/create'
  | 'customers/update'
  | 'customers/delete'
  | 'app/uninstalled'
  | string

export interface WebhookPayload {
  topic: WebhookTopic
  shop: string
  body: unknown
}

/**
 * Verify a Shopify webhook signature
 */
export function verifyWebhook(
  body: string | Buffer,
  hmacHeader: string,
  secret: string
): boolean {
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body
  const hmac = createHmac('sha256', secret)
  hmac.update(bodyBuffer)
  const calculatedHmac = hmac.digest('base64')

  // Use timing-safe comparison
  if (calculatedHmac.length !== hmacHeader.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < calculatedHmac.length; i++) {
    result |= calculatedHmac.charCodeAt(i) ^ hmacHeader.charCodeAt(i)
  }

  return result === 0
}

/**
 * Parse a webhook request
 */
export function parseWebhook(
  body: string,
  topic: string,
  shop: string
): WebhookPayload {
  return {
    topic: topic as WebhookTopic,
    shop,
    body: JSON.parse(body),
  }
}
