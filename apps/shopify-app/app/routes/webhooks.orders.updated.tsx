/**
 * Webhook handler for orders/updated
 *
 * Re-processes bundle data when an order is updated (e.g., partial refund).
 * Delegates to the same extraction logic as orders/create.
 */
import type { ActionFunctionArgs } from '@remix-run/node'
import { authenticate } from '../shopify.server'

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request)

  console.log(`[BundleWebhook] Received ${topic} for ${shop}`)

  // For now, order updates are logged but not re-synced.
  // Full re-sync would require checking if the bundle order record
  // already exists and updating discount/total if items were refunded.
  // This is a placeholder for Phase 3 completion.

  return new Response()
}
