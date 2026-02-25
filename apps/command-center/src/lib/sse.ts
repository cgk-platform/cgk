/**
 * SSE stream creation helper.
 * Creates a ReadableStream that sends Server-Sent Events.
 */

export function createSSEStream(
  handler: (send: (event: string, data: unknown) => void, signal: AbortSignal) => Promise<void> | void
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        await handler(send, new AbortController().signal)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        send('error', { error: message })
        controller.close()
      }
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
