/**
 * Shopify Webhook Receiver Endpoint
 *
 * Main entry point for all incoming Shopify webhooks
 *
 * POST /api/webhooks/shopify
 */

import { handleShopifyWebhook } from '@cgk/shopify/webhooks'

// Disable body parsing - we need the raw body for HMAC verification
export const dynamic = 'force-dynamic'

/**
 * Handle incoming Shopify webhooks
 *
 * This endpoint:
 * 1. Validates required headers
 * 2. Routes shop to correct tenant
 * 3. Verifies HMAC signature
 * 4. Checks for duplicates (idempotency)
 * 5. Logs the event
 * 6. Routes to appropriate handler
 */
export async function POST(request: Request): Promise<Response> {
  return handleShopifyWebhook(request)
}

// Shopify requires a 200 response for GET requests during webhook registration
export async function GET(): Promise<Response> {
  return new Response('Shopify webhook endpoint', { status: 200 })
}
