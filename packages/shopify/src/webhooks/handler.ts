/**
 * Main Shopify Webhook Handler
 *
 * Entry point for all incoming Shopify webhooks
 */

import { withTenant } from '@cgk-platform/db'
import { routeToHandler } from './router'
import type { WebhookTopic } from './types'
import {
  verifyShopifyWebhook,
  getTenantForShop,
  getShopifyCredentials,
  checkDuplicateWebhook,
  logWebhookEvent,
  updateWebhookStatus,
  extractResourceId,
  generateIdempotencyKey,
  headersToObject,
} from './utils'

/**
 * Handle an incoming Shopify webhook request
 *
 * This is the main entry point for all Shopify webhooks.
 * It performs the following:
 * 1. Validates required headers
 * 2. Routes shop domain to tenant
 * 3. Verifies HMAC signature
 * 4. Checks for duplicates (idempotency)
 * 5. Logs the event
 * 6. Routes to the appropriate handler
 *
 * @param request - The incoming webhook request
 * @returns Response to send back to Shopify
 */
export async function handleShopifyWebhook(request: Request): Promise<Response> {
  const startTime = Date.now()

  // Extract required headers
  const shop = request.headers.get('x-shopify-shop-domain')
  const topic = request.headers.get('x-shopify-topic') as WebhookTopic | null
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  const webhookId = request.headers.get('x-shopify-webhook-id')
  // Note: apiVersion header is available but not currently used
  // const apiVersion = request.headers.get('x-shopify-api-version')

  // Validate required headers
  if (!shop || !topic || !hmac) {
    console.warn('[Webhook] Missing required headers', { shop, topic, hasHmac: !!hmac })
    return new Response('Missing required headers', { status: 400 })
  }

  // Get tenant for this shop
  const tenantId = await getTenantForShop(shop)
  if (!tenantId) {
    console.warn(`[Webhook] Unknown shop: ${shop}, topic: ${topic}`)
    // Return 200 to prevent Shopify from retrying for unknown shops
    return new Response('Shop not registered', { status: 200 })
  }

  // Read body for verification and processing
  const body = await request.text()

  // Get Shopify credentials for HMAC verification
  const credentials = await withTenant(tenantId, async () => {
    return getShopifyCredentials(tenantId, shop)
  })

  if (!credentials || !credentials.webhookSecret) {
    console.error(`[Webhook] No webhook secret for shop ${shop}, tenant ${tenantId}`)
    // Return 500 for configuration errors
    return new Response('Configuration error', { status: 500 })
  }

  // Verify HMAC signature
  const isValid = verifyShopifyWebhook(body, hmac, credentials.webhookSecret)
  if (!isValid) {
    console.error(`[Webhook] Invalid HMAC signature for ${shop}, topic: ${topic}`)
    // Return 401 - Shopify will retry with valid signature
    return new Response('Invalid signature', { status: 401 })
  }

  // Parse payload
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    console.error(`[Webhook] Invalid JSON for ${shop}, topic: ${topic}`)
    return new Response('Invalid JSON', { status: 400 })
  }

  // Generate idempotency key
  const resourceId = extractResourceId(payload)
  const idempotencyKey = generateIdempotencyKey(topic, resourceId, webhookId)

  // Check for duplicate within tenant context
  const isDuplicate = await withTenant(tenantId, async () => {
    return checkDuplicateWebhook(idempotencyKey)
  })

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate ignored: ${idempotencyKey} for ${shop}`)
    return new Response('Already processed', { status: 200 })
  }

  // Log webhook event
  const eventId = await withTenant(tenantId, async () => {
    return logWebhookEvent({
      shop,
      topic,
      shopifyWebhookId: webhookId,
      payload,
      hmacVerified: true,
      idempotencyKey,
      headers: headersToObject(request.headers),
    })
  })

  // Route to topic-specific handler
  try {
    await withTenant(tenantId, async () => {
      await routeToHandler(tenantId, topic, payload, eventId)
    })

    // Mark as completed
    await withTenant(tenantId, async () => {
      await updateWebhookStatus(eventId, 'completed')
    })

    const duration = Date.now() - startTime
    console.log(`[Webhook] ${topic} processed in ${duration}ms for ${shop}`)

    return new Response('OK', { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error and mark as failed
    await withTenant(tenantId, async () => {
      await updateWebhookStatus(eventId, 'failed', errorMessage)
    })

    console.error(`[Webhook] ${topic} failed for ${shop}:`, error)

    // Return 200 anyway to prevent infinite retries from Shopify
    // We'll handle retries ourselves via background jobs
    return new Response('Processing error', { status: 200 })
  }
}

/**
 * Create a webhook handler for Next.js API routes
 *
 * @example
 * ```ts
 * // app/api/webhooks/shopify/route.ts
 * import { createWebhookRoute } from '@cgk-platform/shopify/webhooks'
 *
 * export const POST = createWebhookRoute()
 * ```
 */
export function createWebhookRoute() {
  return async function POST(request: Request): Promise<Response> {
    return handleShopifyWebhook(request)
  }
}
