/**
 * SSE Bridge — Redis-backed message bus for MCP SSE transport
 *
 * On Vercel Edge, GET (SSE stream) and POST (request handler) run in
 * separate isolates. This bridge uses Upstash Redis as a message bus
 * so POST can deliver responses back to the SSE stream.
 *
 * Flow:
 * 1. GET creates session, returns SSE stream that polls Redis
 * 2. POST processes request, writes response to Redis
 * 3. SSE stream picks up the response and sends it to the client
 */

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// Session TTL: 5 minutes (sessions are short-lived)
const SESSION_TTL_SECONDS = 300
// Response TTL: 60 seconds (picked up quickly then expired)
const RESPONSE_TTL_SECONDS = 60

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Execute an Upstash REST command
 */
async function kvCommand(command: string[]): Promise<unknown> {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN are required for SSE transport')
  }

  const res = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!res.ok) {
    throw new Error(`KV command failed: ${res.status}`)
  }

  const data = (await res.json()) as { result: unknown }
  return data.result
}

/**
 * Push a response message for an SSE session
 */
export async function pushSessionMessage(
  sessionId: string,
  message: string
): Promise<void> {
  const key = `mcp:sse:${sessionId}:messages`
  // RPUSH the message onto the list
  await kvCommand(['RPUSH', key, message])
  // Ensure TTL is set
  await kvCommand(['EXPIRE', key, String(RESPONSE_TTL_SECONDS)])
}

/**
 * Pop pending messages for an SSE session (non-blocking)
 * Returns all pending messages at once.
 */
export async function popSessionMessages(sessionId: string): Promise<string[]> {
  const key = `mcp:sse:${sessionId}:messages`

  // Get the length first
  const len = (await kvCommand(['LLEN', key])) as number
  if (!len || len === 0) return []

  // Get all messages
  const messages = (await kvCommand(['LRANGE', key, '0', '-1'])) as string[]

  // Clear the list
  await kvCommand(['DEL', key])

  return messages || []
}

/**
 * Register a session (mark it as active)
 */
export async function registerSession(sessionId: string): Promise<void> {
  const key = `mcp:sse:${sessionId}:active`
  await kvCommand(['SET', key, '1', 'EX', String(SESSION_TTL_SECONDS)])
}

/**
 * Check if a session is active
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const key = `mcp:sse:${sessionId}:active`
  const result = await kvCommand(['EXISTS', key])
  return result === 1
}

/**
 * Clean up a session
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  await kvCommand(['DEL', `mcp:sse:${sessionId}:active`])
  await kvCommand(['DEL', `mcp:sse:${sessionId}:messages`])
}

/**
 * Check if SSE bridge is available (KV credentials configured)
 */
export function isSSEBridgeAvailable(): boolean {
  return Boolean(KV_URL && KV_TOKEN)
}
