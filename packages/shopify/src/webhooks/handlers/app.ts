/**
 * App Webhook Handler
 *
 * Handles app/uninstalled webhook
 */

import { withTenant, sql } from '@cgk-platform/db'

/**
 * Handle app/uninstalled webhook
 *
 * Marks the Shopify connection as disconnected and clears tokens
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

  // TODO: Trigger dedicated app-disconnect cleanup job once created

  console.log(`[Webhook] App uninstalled for shop ${shopDomain}, tenant ${tenantId}`)
}
