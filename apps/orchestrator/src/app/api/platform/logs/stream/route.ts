/**
 * Platform Logs Stream API - Real-time log streaming
 *
 * GET /api/platform/logs/stream - SSE endpoint for real-time log streaming
 *
 * Requires: Super admin access
 */

import { readFromStream, type PlatformLogEntry, type LogLevelName } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/platform/logs/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time log streaming.
 * Polls Redis stream for new log entries and pushes them to connected clients.
 *
 * Query params:
 * - level: Minimum log level to stream (trace, debug, info, warn, error, fatal)
 * - tenantId: Filter to specific tenant
 * - service: Filter to specific service
 *
 * The client should connect using EventSource:
 * ```js
 * const eventSource = new EventSource('/api/platform/logs/stream?level=error')
 * eventSource.onmessage = (event) => {
 *   const log = JSON.parse(event.data)
 *   // Handle new log entry
 * }
 * ```
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  // Parse filter options from query params
  const url = new URL(request.url)
  const levelFilter = url.searchParams.get('level') as LogLevelName | null
  const tenantFilter = url.searchParams.get('tenantId')
  const serviceFilter = url.searchParams.get('service')

  // Log level priority for filtering
  const levelPriority: Record<LogLevelName, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  }

  const minLevelPriority = levelFilter ? levelPriority[levelFilter] : 0

  /**
   * Filter a log entry based on query params
   */
  function shouldInclude(entry: PlatformLogEntry): boolean {
    // Level filter
    if (levelPriority[entry.level] < minLevelPriority) {
      return false
    }

    // Tenant filter
    if (tenantFilter && entry.tenantId !== tenantFilter) {
      return false
    }

    // Service filter
    if (serviceFilter && entry.service !== serviceFilter) {
      return false
    }

    return true
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  let lastStreamId: string | null = null
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString(),
            filters: { level: levelFilter, tenantId: tenantFilter, service: serviceFilter },
          })}\n\n`
        )
      )

      // Poll for new logs every 2 seconds
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval)
          return
        }

        try {
          // Read from Redis stream
          const { entries, lastId } = await readFromStream(50, lastStreamId || '0')

          if (lastId) {
            lastStreamId = lastId
          }

          // Filter and send matching entries
          for (const entry of entries) {
            if (shouldInclude(entry)) {
              controller.enqueue(
                encoder.encode(
                  `event: log\ndata: ${JSON.stringify({
                    type: 'log',
                    log: formatLogEntry(entry),
                  })}\n\n`
                )
              )
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({
                timestamp: new Date().toISOString(),
                lastStreamId,
              })}\n\n`
            )
          )
        } catch (error) {
          console.error('Error polling for logs:', error)
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch logs' })}\n\n`
            )
          )
        }
      }, 2000)

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
 * Format log entry for client consumption
 */
function formatLogEntry(entry: PlatformLogEntry): Record<string, unknown> {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    level: entry.level,
    service: entry.service,
    action: entry.action,
    message: entry.message,
    tenantId: entry.tenantId,
    tenantSlug: entry.tenantSlug,
    userId: entry.userId,
    traceId: entry.traceId,
    requestId: entry.requestId,
    data: entry.data,
    errorType: entry.errorType,
    errorCode: entry.errorCode,
    hasError: Boolean(entry.errorType || entry.errorCode || entry.errorStack),
  }
}
