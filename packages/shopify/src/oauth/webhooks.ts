/**
 * Shopify webhook registration and routing
 */

import { sql } from '@cgk-platform/db'
import { getShopifyCredentials, updateLastWebhookAt } from './credentials.js'
import { ShopifyError } from './errors.js'
import { verifyWebhookHmac } from './validation.js'

/**
 * Webhook topics to register
 */
export const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/fulfilled',
  'orders/cancelled',
  'orders/paid',
  'products/create',
  'products/update',
  'products/delete',
  'customers/create',
  'customers/update',
  'customers/delete',
  'refunds/create',
  'fulfillments/create',
  'fulfillments/update',
  'inventory_levels/update',
  'app/uninstalled',
] as const

export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number]

/**
 * Webhook handler function type
 */
export type WebhookHandler = (
  tenantId: string,
  payload: unknown
) => Promise<void>

/**
 * Registered webhook handlers
 */
const webhookHandlers = new Map<string, WebhookHandler[]>()

/**
 * Register a webhook handler
 *
 * @param topic - Webhook topic
 * @param handler - Handler function
 */
export function onWebhook(topic: string, handler: WebhookHandler): void {
  const handlers = webhookHandlers.get(topic) || []
  handlers.push(handler)
  webhookHandlers.set(topic, handlers)
}

/**
 * Get tenant ID for a shop domain
 *
 * @param shop - Shop domain
 * @returns Tenant ID or null if not found
 */
export async function getTenantIdForShop(shop: string): Promise<string | null> {
  const result = await sql`
    SELECT tenant_id
    FROM shopify_connections
    WHERE shop = ${shop}
    AND status = 'active'
    LIMIT 1
  `

  return (result.rows[0] as { tenant_id: string } | undefined)?.tenant_id || null
}

/**
 * Handle an incoming webhook
 *
 * Verifies the signature, routes to the correct tenant,
 * and calls registered handlers.
 *
 * @param request - Incoming request
 * @returns Response
 */
export async function handleWebhook(request: Request): Promise<Response> {
  // Extract headers
  const shop = request.headers.get('x-shopify-shop-domain')
  const topic = request.headers.get('x-shopify-topic')
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  const webhookId = request.headers.get('x-shopify-webhook-id')

  if (!shop || !topic || !hmac) {
    return new Response('Missing required headers', { status: 400 })
  }

  // Get tenant for this shop
  const tenantId = await getTenantIdForShop(shop)

  if (!tenantId) {
    console.warn(`[shopify-webhook] Webhook from unknown shop: ${shop}`)
    return new Response('Shop not found', { status: 404 })
  }

  // Get the raw body for HMAC verification
  const body = await request.text()

  // Get credentials to verify webhook
  let credentials
  try {
    credentials = await getShopifyCredentials(tenantId)
  } catch (error) {
    if (error instanceof ShopifyError && error.code === 'NOT_CONNECTED') {
      return new Response('Shop not connected', { status: 404 })
    }
    throw error
  }

  // Use webhook secret or app secret for verification
  const secret =
    credentials.webhookSecret || process.env.SHOPIFY_CLIENT_SECRET

  if (!secret) {
    console.error('[shopify-webhook] No webhook secret available')
    return new Response('Configuration error', { status: 500 })
  }

  // Verify HMAC signature
  if (!verifyWebhookHmac(body, hmac, secret)) {
    console.error(`[shopify-webhook] Invalid signature for shop: ${shop}`)
    return new Response('Invalid signature', { status: 401 })
  }

  // Parse the payload
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Update last webhook timestamp
  await updateLastWebhookAt(tenantId)

  // Route to handlers
  const handlers = webhookHandlers.get(topic) || []

  console.log(`[shopify-webhook] Processing ${topic} for tenant ${tenantId} (${webhookId})`)

  // Execute handlers
  const handlerPromises = handlers.map(async (handler) => {
    try {
      await handler(tenantId, payload)
    } catch (error) {
      console.error(
        `[shopify-webhook] Handler error for ${topic}:`,
        error instanceof Error ? error.message : error
      )
    }
  })

  // Wait for all handlers to complete
  await Promise.all(handlerPromises)

  return new Response('OK', { status: 200 })
}

/**
 * Register webhooks with Shopify
 *
 * @param tenantId - Tenant ID
 * @param shop - Shop domain
 * @param baseUrl - Base URL for webhook endpoints
 */
export async function registerWebhooks(
  tenantId: string,
  shop: string,
  baseUrl: string
): Promise<{ registered: string[]; errors: string[] }> {
  const credentials = await getShopifyCredentials(tenantId)

  const registered: string[] = []
  const errors: string[] = []

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const webhookAddress = `${baseUrl}/api/shopify/webhooks/${topic.replace('/', '-')}`

      const response = await fetch(
        `https://${shop}/admin/api/${credentials.apiVersion}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': credentials.accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookAddress,
              format: 'json',
            },
          }),
        }
      )

      if (response.ok) {
        registered.push(topic)
      } else {
        const errorData = await response.text()
        errors.push(`${topic}: ${response.status} - ${errorData}`)
      }
    } catch (error) {
      errors.push(
        `${topic}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { registered, errors }
}

/**
 * Unregister all webhooks for a shop
 *
 * @param tenantId - Tenant ID
 */
export async function unregisterWebhooks(tenantId: string): Promise<void> {
  const credentials = await getShopifyCredentials(tenantId)

  // Get all webhooks
  const response = await fetch(
    `https://${credentials.shop}/admin/api/${credentials.apiVersion}/webhooks.json`,
    {
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
      },
    }
  )

  if (!response.ok) {
    throw new ShopifyError(
      'TOKEN_EXCHANGE_FAILED',
      `Failed to list webhooks: ${response.status}`
    )
  }

  const data = await response.json() as {
    webhooks: Array<{ id: number }>
  }

  // Delete each webhook
  for (const webhook of data.webhooks) {
    await fetch(
      `https://${credentials.shop}/admin/api/${credentials.apiVersion}/webhooks/${webhook.id}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
        },
      }
    )
  }
}
