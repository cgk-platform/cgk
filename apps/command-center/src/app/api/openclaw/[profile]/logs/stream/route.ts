import { getGatewayClient } from '@/lib/gateway-pool'
import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const encoder = new TextEncoder()
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            profile: result.profile,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      )

      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval)
          return
        }

        try {
          const client = await getGatewayClient(result.profile)
          const logData = await client.logsTail()

          // logsTail returns { lines: string[], ... } where lines are JSON strings
          for (const line of logData.lines) {
            try {
              const entry = JSON.parse(line)
              controller.enqueue(
                encoder.encode(
                  `event: log\ndata: ${JSON.stringify(entry)}\n\n`
                )
              )
            } catch {
              // Skip malformed lines
            }
          }

          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
            )
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: err instanceof Error ? err.message : 'Failed to fetch logs',
              })}\n\n`
            )
          )
        }
      }, 3000)

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
      'X-Accel-Buffering': 'no',
    },
  })
}
