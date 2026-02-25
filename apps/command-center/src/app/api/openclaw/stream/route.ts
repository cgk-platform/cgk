import { PROFILE_SLUGS } from '@cgk-platform/openclaw'

import { tryGetGatewayClient } from '@/lib/gateway-pool'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const encoder = new TextEncoder()
  let isActive = true
  const unsubscribers: Array<() => void> = []

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            profiles: PROFILE_SLUGS,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      )

      // Subscribe to push events from each gateway
      for (const slug of PROFILE_SLUGS) {
        try {
          const client = await tryGetGatewayClient(slug)
          if (!client) continue

          for (const event of ['tick', 'agent', 'presence']) {
            const unsub = client.on(event, (data) => {
              if (!isActive) return
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify({ profile: slug, ...data as Record<string, unknown> })}\n\n`
                )
              )
            })
            unsubscribers.push(unsub)
          }
        } catch {
          // Skip unreachable gateways
        }
      }

      // Heartbeat
      const heartbeat = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeat)
          return
        }
        controller.enqueue(
          encoder.encode(
            `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
          )
        )
      }, 10_000)

      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(heartbeat)
        for (const unsub of unsubscribers) unsub()
        controller.close()
      })
    },

    cancel() {
      isActive = false
      for (const unsub of unsubscribers) unsub()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
