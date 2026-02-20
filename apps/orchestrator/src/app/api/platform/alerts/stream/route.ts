import { sql } from '@cgk-platform/db'

import type { PlatformAlert } from '../../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/platform/alerts/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time alert streaming.
 * Falls back from WebSocket since Next.js Edge runtime doesn't support native WS.
 *
 * The client should connect using EventSource:
 * ```js
 * const eventSource = new EventSource('/api/platform/alerts/stream')
 * eventSource.onmessage = (event) => {
 *   const alert = JSON.parse(event.data)
 *   // Handle new alert
 * }
 * ```
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  let lastAlertId: string | null = null
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
        )
      )

      // Poll for new alerts every 5 seconds
      // In production, this would be replaced with database LISTEN/NOTIFY or a message queue
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval)
          return
        }

        try {
          const alerts = await getNewAlerts(lastAlertId)

          for (const alert of alerts) {
            lastAlertId = alert.id
            controller.enqueue(
              encoder.encode(
                `event: alert\ndata: ${JSON.stringify({ type: 'alert', alert })}\n\n`
              )
            )
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
            )
          )
        } catch (error) {
          console.error('Error polling for alerts:', error)
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch alerts' })}\n\n`
            )
          )
        }
      }, 5000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(pollInterval)
        controller.close()
      })
    },

    cancel() {
      isActive = false
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

/**
 * Get new alerts since the last known alert ID
 */
async function getNewAlerts(lastAlertId: string | null): Promise<PlatformAlert[]> {
  let result

  if (lastAlertId) {
    // Get alerts newer than the last one
    result = await sql`
      SELECT
        sal.id,
        sal.tenant_id,
        sal.metadata,
        sal.created_at,
        o.name as brand_name
      FROM public.super_admin_audit_log sal
      LEFT JOIN public.organizations o ON o.id = sal.tenant_id
      WHERE (sal.action = 'alert_created' OR (sal.action = 'api_request' AND (sal.metadata->>'error')::boolean = true))
        AND sal.id > ${lastAlertId}
      ORDER BY sal.created_at ASC
      LIMIT 10
    `
  } else {
    // Get the most recent alerts
    result = await sql`
      SELECT
        sal.id,
        sal.tenant_id,
        sal.metadata,
        sal.created_at,
        o.name as brand_name
      FROM public.super_admin_audit_log sal
      LEFT JOIN public.organizations o ON o.id = sal.tenant_id
      WHERE sal.action = 'alert_created' OR (sal.action = 'api_request' AND (sal.metadata->>'error')::boolean = true)
      ORDER BY sal.created_at DESC
      LIMIT 10
    `
  }

  return result.rows.map((row) => {
    const metadata = row.metadata as Record<string, unknown> | null

    return {
      id: row.id as string,
      title: (metadata?.title as string) || `Error in ${(metadata?.path as string) || 'API'}`,
      message:
        (metadata?.message as string) ||
        (metadata?.error as string) ||
        'An error occurred',
      priority: (metadata?.priority as 'p1' | 'p2' | 'p3') || 'p3',
      status: 'open' as const,
      brandId: (row.tenant_id as string) || null,
      brandName: (row.brand_name as string) || null,
      createdAt: new Date(row.created_at as string),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
    }
  })
}
