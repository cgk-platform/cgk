/**
 * Webhook Events API
 *
 * GET /api/admin/integrations/shopify/webhooks/events
 *
 * Lists recent webhook events with filtering and pagination
 */

import { getTenantContext } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'
import { getRecentWebhookEvents } from '@cgk/shopify/webhooks'
import type { WebhookEventStatus } from '@cgk/shopify/webhooks'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Parse query parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const status = url.searchParams.get('status') as WebhookEventStatus | null
    const topic = url.searchParams.get('topic')

    // Get shop domain
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

    // Get events
    const { events, total } = await getRecentWebhookEvents(tenantId, shop, {
      limit,
      offset,
      status: status || undefined,
      topic: topic || undefined,
    })

    return Response.json({
      events,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
    })
  } catch (error) {
    console.error('[API] Failed to get webhook events:', error)
    return Response.json(
      { error: 'Failed to get webhook events' },
      { status: 500 }
    )
  }
}
