/**
 * App Webhook Handler
 *
 * Handles app/uninstalled webhook
 */

import { withTenant, sql } from '@cgk-platform/db'
import { createJobQueue } from '@cgk-platform/jobs'

// Create job queue for app-related background jobs
const appJobQueue = createJobQueue({ name: 'app-webhooks' })

/**
 * Handle app/uninstalled webhook
 *
 * Marks the Shopify connection as uninstalled and triggers cleanup
 */
export async function handleAppUninstalled(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  // The payload for app/uninstalled contains the shop info
  const shop = (payload as { myshopify_domain?: string; domain?: string })
  const shopDomain = shop.myshopify_domain || shop.domain || ''

  await withTenant(tenantId, async () => {
    // Mark the connection as uninstalled
    await sql`
      UPDATE shopify_connections
      SET
        status = 'uninstalled',
        uninstalled_at = NOW(),
        access_token = NULL,
        webhook_secret = NULL
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

  // Trigger cleanup background job
  await appJobQueue.enqueue('app/connection-cleanup', {
    tenantId,
    shop: shopDomain,
    reason: 'app_uninstalled',
  }, { tenantId })

  console.log(`[Webhook] App uninstalled for shop ${shopDomain}, tenant ${tenantId}`)
}
