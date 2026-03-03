/**
 * @cgk-platform/video-editor - SSE activity stream
 *
 * Returns a ReadableStream that polls video_editor_activity for new entries
 * and formats them as Server-Sent Events.
 *
 * Usage (in a Next.js route handler):
 *   const stream = createActivityStream(tenantId, projectId)
 *   return new Response(stream, {
 *     headers: {
 *       'Content-Type': 'text/event-stream',
 *       'Cache-Control': 'no-cache',
 *       'Connection': 'keep-alive',
 *     },
 *   })
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

const POLL_INTERVAL_MS = 2000

export function createActivityStream(
  tenantId: string,
  projectId: string
): ReadableStream<Uint8Array> {
  let intervalId: ReturnType<typeof setInterval> | null = null
  let lastCreatedAt: string | null = null
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Send an initial heartbeat comment so the client knows the stream is open
      controller.enqueue(encoder.encode(': connected\n\n'))

      intervalId = setInterval(() => {
        void pollActivity(controller)
      }, POLL_INTERVAL_MS)
    },
    cancel() {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    },
  })

  async function pollActivity(controller: ReadableStreamDefaultController<Uint8Array>) {
    try {
      let rows: Array<Record<string, unknown>>

      if (lastCreatedAt) {
        const since = lastCreatedAt
        const result = await withTenant(
          tenantId,
          async () =>
            sql`
            SELECT *
            FROM video_editor_activity
            WHERE project_id = ${projectId}
              AND tenant_id = ${tenantId}
              AND created_at > ${since}::timestamptz
            ORDER BY created_at ASC
          `
        )
        rows = result.rows as Array<Record<string, unknown>>
      } else {
        const result = await withTenant(
          tenantId,
          async () =>
            sql`
            SELECT *
            FROM video_editor_activity
            WHERE project_id = ${projectId}
              AND tenant_id = ${tenantId}
            ORDER BY created_at DESC
            LIMIT 50
          `
        )
        rows = (result.rows as Array<Record<string, unknown>>).reverse()
      }

      for (const row of rows) {
        const activity = {
          id: row['id'] as string,
          tenantId: row['tenant_id'] as string,
          projectId: row['project_id'] as string,
          source: row['source'] as string,
          action: row['action'] as string,
          data: row['data'] as Record<string, unknown> | null,
          createdAt: row['created_at'] as string,
        }
        const event = `data: ${JSON.stringify(activity)}\n\n`
        controller.enqueue(encoder.encode(event))
        lastCreatedAt = activity.createdAt
      }
    } catch {
      // On error, send a heartbeat comment to keep the connection alive
      // without crashing the stream; the client will retry via EventSource
      try {
        controller.enqueue(encoder.encode(': error\n\n'))
      } catch {
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    }
  }
}
