/**
 * App Webhook Handler
 *
 * Handles app/uninstalled webhook
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'

/**
 * Handle app/uninstalled webhook
 *
 * Marks the Shopify connection as disconnected and triggers cleanup
 */
export async function handleAppUninstalled(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  // The payload for app/uninstalled contains the shop info
  const shop = payload as { myshopify_domain?: string; domain?: string }
  const shopDomain = shop.myshopify_domain || shop.domain || ''

  await withTenant(tenantId, async () => {
    // Mark the connection as disconnected
    await sql`
      UPDATE shopify_connections
      SET
        status = 'disconnected',
        access_token_encrypted = NULL,
        webhook_secret_encrypted = NULL
      WHERE shop = ${shopDomain}
    `

    // Mark all webhook registrations as deleted
    await sql`
      UPDATE webhook_registrations
      SET
        status = 'deleted',
        updated_at = NOW()
      WHERE shop = ${shopDomain}
    `
  })

  // Trigger cleanup via handleOrderCreatedTask as a generic cleanup trigger
  // Note: A dedicated 'app-disconnect' task should be created in the future
  await tasks.trigger('commerce-handle-order-created', {
    tenantId,
    orderId: 'app-uninstall',
    shopifyOrderId: shopDomain,
    customerId: null,
    totalAmount: 0,
    currency: 'USD',
  })

  console.log(`[Webhook] App uninstalled for shop ${shopDomain}, tenant ${tenantId}`)
}
