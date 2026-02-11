/**
 * Webhook Health API
 *
 * GET /api/admin/integrations/shopify/webhooks/health
 *
 * Returns webhook registration status and recent event statistics
 */

import { getTenantContext } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'
import { getWebhookHealth, getWebhookEventsByTopic } from '@cgk/shopify/webhooks'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Get shop domain for this tenant
    const shopResult = await withTenant(tenantId, async () => {
      return sql`
        SELECT shop FROM shopify_connections
        WHERE status = 'active'
        LIMIT 1
      `
    })

    const shopRow = shopResult.rows[0]
    if (!shopRow) {
      return Response.json(
        { error: 'No active Shopify connection found' },
        { status: 404 }
      )
    }

    const shop = shopRow.shop as string

    // Get webhook health status
    const health = await getWebhookHealth(tenantId, shop)

    // Get events by topic for the last 7 days
    const eventsByTopic = await getWebhookEventsByTopic(tenantId, shop, 7)

    return Response.json({
      health,
      eventsByTopic,
    })
  } catch (error) {
    console.error('[API] Failed to get webhook health:', error)
    return Response.json(
      { error: 'Failed to get webhook health' },
      { status: 500 }
    )
  }
}
