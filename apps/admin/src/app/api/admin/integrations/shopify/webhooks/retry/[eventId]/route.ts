/**
 * Manual Webhook Retry API
 *
 * POST /api/admin/integrations/shopify/webhooks/retry/[eventId]
 *
 * Manually retry a failed webhook event
 */

import { getTenantContext } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import {
  getWebhookEvent,
  updateWebhookStatus,
  routeToHandler,
} from '@cgk-platform/shopify/webhooks'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { eventId } = await params

  if (!eventId) {
    return Response.json({ error: 'Event ID required' }, { status: 400 })
  }

  try {
    // Get the webhook event
    const event = await withTenant(tenantId, async () => {
      return getWebhookEvent(eventId)
    })

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status === 'completed') {
      return Response.json(
        { error: 'Event already completed', status: event.status },
        { status: 400 }
      )
    }

    // Mark as processing
    await withTenant(tenantId, async () => {
      await updateWebhookStatus(eventId, 'processing')
    })

    // Re-process the webhook
    try {
      await withTenant(tenantId, async () => {
        await routeToHandler(tenantId, event.topic, event.payload, eventId)
      })

      // Mark as completed
      await withTenant(tenantId, async () => {
        await updateWebhookStatus(eventId, 'completed')
      })

      return Response.json({
        success: true,
        message: 'Webhook event retried successfully',
        status: 'completed',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Mark as failed
      await withTenant(tenantId, async () => {
        await updateWebhookStatus(eventId, 'failed', errorMessage)
      })

      return Response.json({
        success: false,
        message: 'Webhook retry failed',
        error: errorMessage,
        status: 'failed',
      })
    }
  } catch (error) {
    console.error('[API] Failed to retry webhook:', error)
    return Response.json(
      { error: 'Failed to retry webhook' },
      { status: 500 }
    )
  }
}
