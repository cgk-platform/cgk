export const dynamic = 'force-dynamic'

import { handleShopifyWebhook } from '@cgk-platform/shopify/webhooks'

/**
 * POST /api/shopify/webhooks
 *
 * Handles all incoming Shopify webhooks.
 * Routes to the appropriate tenant based on shop domain.
 * Uses the full webhook infrastructure with DB logging and job triggering.
 */
export async function POST(request: Request) {
  return handleShopifyWebhook(request)
}
