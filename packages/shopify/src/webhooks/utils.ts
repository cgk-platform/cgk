/**
 * Shopify Webhook Utilities
 */

import crypto from 'crypto'
import { sql } from '@cgk-platform/db'
import type { ShopifyCredentials, WebhookEvent, WebhookEventStatus } from './types'

/**
 * Verify a Shopify webhook HMAC signature
 *
 * @param body - Raw request body as string
 * @param signature - HMAC signature from x-shopify-hmac-sha256 header
 * @param secret - Webhook secret from Shopify app settings
 * @returns True if signature is valid
 */
export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature)
    )
  } catch {
    // Buffer lengths don't match
    return false
  }
}

/**
 * Get tenant ID for a Shopify shop domain
 *
 * Looks up the shop in the shopify_connections table to find the tenant
 */
export async function getTenantForShop(shop: string): Promise<string | null> {
  // The shopify_connections table is in the tenant schema, so we need to check
  // the public organizations table which maps shops to tenants
  const result = await sql`
    SELECT o.id as tenant_id
    FROM organizations o
    WHERE o.shopify_domain = ${shop}
    AND o.status = 'active'
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return row ? (row.tenant_id as string) : null
}

/**
 * Get Shopify credentials for a tenant
 */
export async function getShopifyCredentials(
  _tenantId: string,
  shop: string
): Promise<ShopifyCredentials | null> {
  // Query from public schema since we need to look up by tenant
  const result = await sql`
    SELECT
      shop,
      access_token,
      webhook_secret
    FROM shopify_connections
    WHERE shop = ${shop}
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    shop: row.shop as string,
    accessToken: row.access_token as string,
    webhookSecret: row.webhook_secret as string | null,
  }
}

/**
 * Check for duplicate webhook by idempotency key
 */
export async function checkDuplicateWebhook(
  idempotencyKey: string
): Promise<boolean> {
  const result = await sql`
    SELECT id FROM webhook_events
    WHERE idempotency_key = ${idempotencyKey}
    AND status IN ('completed', 'processing')
    LIMIT 1
  `

  return result.rows.length > 0
}

/**
 * Log a webhook event to the database
 */
export async function logWebhookEvent(params: {
  shop: string
  topic: string
  shopifyWebhookId: string | null
  payload: unknown
  hmacVerified: boolean
  idempotencyKey: string
  headers: Record<string, string>
}): Promise<string> {
  const result = await sql`
    INSERT INTO webhook_events (
      shop,
      topic,
      shopify_webhook_id,
      payload,
      hmac_verified,
      idempotency_key,
      headers,
      status
    ) VALUES (
      ${params.shop},
      ${params.topic},
      ${params.shopifyWebhookId},
      ${JSON.stringify(params.payload)},
      ${params.hmacVerified},
      ${params.idempotencyKey},
      ${JSON.stringify(params.headers)},
      'pending'
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      retry_count = webhook_events.retry_count + 1,
      status = 'pending'
    RETURNING id
  `

  const row = result.rows[0]
  return row ? (row.id as string) : ''
}

/**
 * Update webhook event status
 */
export async function updateWebhookStatus(
  eventId: string,
  status: WebhookEventStatus,
  errorMessage?: string
): Promise<void> {
  if (status === 'completed') {
    await sql`
      UPDATE webhook_events
      SET
        status = ${status},
        processed_at = NOW(),
        error_message = NULL
      WHERE id = ${eventId}
    `
  } else if (status === 'failed') {
    await sql`
      UPDATE webhook_events
      SET
        status = ${status},
        error_message = ${errorMessage || null},
        retry_count = retry_count + 1
      WHERE id = ${eventId}
    `
  } else {
    await sql`
      UPDATE webhook_events
      SET status = ${status}
      WHERE id = ${eventId}
    `
  }
}

/**
 * Get webhook event by ID
 */
export async function getWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
  const result = await sql`
    SELECT
      id,
      shop,
      topic,
      shopify_webhook_id as "shopifyWebhookId",
      payload,
      hmac_verified as "hmacVerified",
      status,
      processed_at as "processedAt",
      error_message as "errorMessage",
      retry_count as "retryCount",
      idempotency_key as "idempotencyKey",
      received_at as "receivedAt",
      headers
    FROM webhook_events
    WHERE id = ${eventId}
  `

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0] as unknown as WebhookEvent
}

/**
 * Parse price string to cents
 */
export function parseCents(priceString: string | number | undefined | null): number {
  if (priceString === undefined || priceString === null) {
    return 0
  }

  const price = typeof priceString === 'string' ? parseFloat(priceString) : priceString
  return Math.round(price * 100)
}

/**
 * Map Shopify financial status to internal status
 */
export function mapFinancialStatus(status: string | null | undefined): string {
  if (!status) return 'pending'

  const statusMap: Record<string, string> = {
    pending: 'pending',
    authorized: 'authorized',
    partially_paid: 'partially_paid',
    paid: 'paid',
    partially_refunded: 'partially_refunded',
    refunded: 'refunded',
    voided: 'voided',
  }

  return statusMap[status] || 'pending'
}

/**
 * Map Shopify fulfillment status to internal status
 */
export function mapFulfillmentStatus(status: string | null | undefined): string {
  if (!status) return 'unfulfilled'

  const statusMap: Record<string, string> = {
    fulfilled: 'fulfilled',
    partial: 'partial',
    unfulfilled: 'unfulfilled',
    restocked: 'restocked',
  }

  return statusMap[status] || 'unfulfilled'
}

/**
 * Extract resource ID from webhook payload for idempotency
 */
export function extractResourceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const p = payload as Record<string, unknown>

  // Try common ID fields
  if ('id' in p && (typeof p.id === 'string' || typeof p.id === 'number')) {
    return String(p.id)
  }

  if ('order_id' in p && (typeof p.order_id === 'string' || typeof p.order_id === 'number')) {
    return String(p.order_id)
  }

  return null
}

/**
 * Generate idempotency key for webhook
 */
export function generateIdempotencyKey(topic: string, resourceId: string | null, webhookId: string | null): string {
  const id = resourceId || webhookId || Date.now().toString()
  return `${topic}:${id}`
}

/**
 * Convert headers iterator to object
 */
export function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}
