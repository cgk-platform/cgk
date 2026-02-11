/**
 * Real-time log stream API using Server-Sent Events
 *
 * GET /api/platform/logs/stream - Subscribe to real-time logs
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { requireAuth } from '@cgk/auth'
import { readFromStream } from '@cgk/logging'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return new Response('Tenant not found', { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  const lastId = url.searchParams.get('lastId') ?? '0'

  // Parse optional filters
  const filters = {
    service: url.searchParams.get('service'),
    level: url.searchParams.get('level'),
  }

  // Create a readable stream that polls Redis
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let currentLastId = lastId
      let isActive = true

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        if (isActive) {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        }
      }, 30000)

      // Poll for new logs
      while (isActive) {
        try {
          const { entries, lastId: newLastId } = await readFromStream(50, currentLastId)

          if (newLastId) {
            currentLastId = newLastId
          }

          for (const entry of entries) {
            // Apply client-side filters
            if (filters.service && entry.service !== filters.service) {
              continue
            }
            if (filters.level && entry.level !== filters.level) {
              continue
            }

            // Filter by tenant
            if (entry.tenantId !== tenantId) {
              continue
            }

            // Send as SSE event
            const data = JSON.stringify(entry)
            controller.enqueue(
              encoder.encode(`id: ${currentLastId}\ndata: ${data}\n\n`)
            )
          }

          // If no new logs, wait before polling again
          if (entries.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error('Stream error:', error)
          // Send error event
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Stream error' })}\n\n`)
          )
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }

        // Check if the request was aborted
        if (request.signal.aborted) {
          isActive = false
        }
      }

      clearInterval(keepaliveInterval)
      controller.close()
    },

    cancel() {
      // Clean up when client disconnects
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
