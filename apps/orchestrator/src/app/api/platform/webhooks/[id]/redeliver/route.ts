import { logAuditAction } from '@cgk-platform/auth'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Helper to get request context from headers (set by middleware)
 */
function getRequestContext(request: Request): {
  userId: string
  sessionId: string
  isSuperAdmin: boolean
} {
  return {
    userId: request.headers.get('x-user-id') || '',
    sessionId: request.headers.get('x-session-id') || '',
    isSuperAdmin: request.headers.get('x-is-super-admin') === 'true',
  }
}

/**
 * POST /api/platform/webhooks/[id]/redeliver
 *
 * Redeliver a failed webhook.
 * Requires: Super admin access
 */
export async function POST(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const webhookId = resolvedParams.id

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { userId, isSuperAdmin } = getRequestContext(request)

    if (!isSuperAdmin) {
      return Response.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Get current webhook state
    const currentResult = await sql`
      SELECT * FROM public.platform_webhooks WHERE id = ${webhookId}
    `

    if (currentResult.rows.length === 0) {
      return Response.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const webhook = currentResult.rows[0] as Record<string, unknown>

    if (webhook.status !== 'failed') {
      return Response.json(
        { error: 'Only failed webhooks can be redelivered' },
        { status: 400 }
      )
    }

    // Reset webhook for redelivery
    await sql`
      UPDATE public.platform_webhooks
      SET status = 'pending',
          attempts = 0,
          last_error = NULL,
          response_status = NULL,
          response_body = NULL,
          last_attempt_at = NULL,
          delivered_at = NULL
      WHERE id = ${webhookId}
    `

    // Log the redeliver action
    await logAuditAction({
      userId,
      action: 'api_request',
      resourceType: 'api',
      resourceId: webhookId,
      tenantId: webhook.tenant_id as string | null,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || null,
      metadata: {
        action: 'redeliver_webhook',
        eventType: webhook.event_type,
        targetUrl: webhook.target_url,
        previousAttempts: webhook.attempts,
      },
    })

    return Response.json({ success: true, message: 'Webhook queued for redelivery' })
  } catch (error) {
    console.error('Redeliver webhook error:', error)
    return Response.json({ error: 'Failed to redeliver webhook' }, { status: 500 })
  }
}
