export const dynamic = 'force-dynamic'

import { handleWebhook, onWebhook } from '@cgk/shopify'

// Register default webhook handlers
// These can be extended in separate files for specific business logic

onWebhook('orders/create', async (tenantId, _payload) => {
  console.log(`[webhook] orders/create for tenant ${tenantId}`)
  // Future: Trigger order sync job
})

onWebhook('orders/updated', async (tenantId, _payload) => {
  console.log(`[webhook] orders/updated for tenant ${tenantId}`)
  // Future: Trigger order update job
})

onWebhook('orders/fulfilled', async (tenantId, _payload) => {
  console.log(`[webhook] orders/fulfilled for tenant ${tenantId}`)
  // Future: Trigger fulfillment notification
})

onWebhook('orders/cancelled', async (tenantId, _payload) => {
  console.log(`[webhook] orders/cancelled for tenant ${tenantId}`)
  // Future: Trigger cancellation handling
})

onWebhook('products/create', async (tenantId, _payload) => {
  console.log(`[webhook] products/create for tenant ${tenantId}`)
  // Future: Trigger product sync
})

onWebhook('products/update', async (tenantId, _payload) => {
  console.log(`[webhook] products/update for tenant ${tenantId}`)
  // Future: Trigger product sync
})

onWebhook('products/delete', async (tenantId, _payload) => {
  console.log(`[webhook] products/delete for tenant ${tenantId}`)
  // Future: Trigger product removal
})

onWebhook('customers/create', async (tenantId, _payload) => {
  console.log(`[webhook] customers/create for tenant ${tenantId}`)
  // Future: Trigger customer sync
})

onWebhook('customers/update', async (tenantId, _payload) => {
  console.log(`[webhook] customers/update for tenant ${tenantId}`)
  // Future: Trigger customer sync
})

onWebhook('app/uninstalled', async (tenantId, _payload) => {
  console.log(`[webhook] app/uninstalled for tenant ${tenantId}`)
  // Future: Clean up and mark as disconnected
})

/**
 * POST /api/shopify/webhooks
 *
 * Handles all incoming Shopify webhooks.
 * Routes to the appropriate tenant based on shop domain.
 */
export async function POST(request: Request) {
  return handleWebhook(request)
}
