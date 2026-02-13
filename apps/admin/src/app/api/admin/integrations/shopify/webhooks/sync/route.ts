/**
 * Webhook Sync API
 *
 * POST /api/admin/integrations/shopify/webhooks/sync
 *
 * Syncs webhook registrations with Shopify, re-registering any missing webhooks
 */

import { getTenantContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { syncWebhookRegistrations } from '@cgk-platform/shopify/webhooks'

export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Get Shopify credentials
    const credentialsResult = await withTenant(tenantId, async () => {
      return sql`
        SELECT shop, access_token, webhook_secret
        FROM shopify_connections
        WHERE status = 'active'
        LIMIT 1
      `
    })

    if (credentialsResult.rows.length === 0) {
      return Response.json(
        { error: 'No active Shopify connection found' },
        { status: 404 }
      )
    }

    const { shop, access_token, webhook_secret } = credentialsResult.rows[0] as {
      shop: string
      access_token: string
      webhook_secret: string | null
    }

    // Get webhook URL from environment
    const webhookUrl =
      process.env.PLATFORM_WEBHOOK_URL ||
      `${process.env.PLATFORM_API_URL}/api/webhooks/shopify`

    // Sync webhooks
    const result = await syncWebhookRegistrations(
      tenantId,
      shop,
      {
        shop,
        accessToken: access_token,
        webhookSecret: webhook_secret,
      },
      webhookUrl
    )

    return Response.json({
      success: true,
      result,
      message: result.added.length > 0
        ? `Re-registered ${result.added.length} webhooks`
        : 'All webhooks are in sync',
    })
  } catch (error) {
    console.error('[API] Failed to sync webhooks:', error)
    return Response.json(
      { error: 'Failed to sync webhooks' },
      { status: 500 }
    )
  }
}
