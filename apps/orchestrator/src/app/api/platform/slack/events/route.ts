/**
 * Slack Events API Webhook
 *
 * POST /api/platform/slack/events
 *
 * Receives inbound events from Slack (app_mention, message, etc.).
 * Verifies the X-Slack-Signature HMAC before processing.
 * Responds 200 immediately; LLM processing runs fire-and-forget.
 */

export const dynamic = 'force-dynamic'

// Maximum allowed age of a Slack request (5 minutes)
const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60

/**
 * Verify Slack request signature using HMAC-SHA256 via Web Crypto API.
 * Compatible with Edge Runtime and Node.js.
 */
async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  // Reject stale timestamps to prevent replay attacks
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > MAX_TIMESTAMP_AGE_SECONDS) {
    return false
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const baseString = `v0:${timestamp}:${rawBody}`
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expected = `v0=${sigHex}`

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Post a message back to a Slack channel
 */
async function postSlackMessage(
  channel: string,
  text: string,
  threadTs?: string,
): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN
  if (!botToken) {
    console.error('[Slack Events] SLACK_BOT_TOKEN not configured')
    return
  }

  const body: Record<string, string> = { channel, text }
  if (threadTs) body.thread_ts = threadTs

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('[Slack Events] Failed to post message:', res.status, await res.text())
  }
}

/**
 * Call the platform LLM (Anthropic) with the user's message and a
 * super-admin system prompt describing the CGK platform.
 */
async function callPlatformLLM(userText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return 'LLM not configured (ANTHROPIC_API_KEY missing).'
  }

  const systemPrompt = [
    'You are the CGK Platform Assistant — a helpful AI embedded in the super-admin',
    'Slack workspace for the Commerce Growth Kit multi-tenant platform.',
    'You help platform operators monitor tenants, debug issues, and understand',
    'platform health. Be concise and use plain text (no markdown) in Slack replies.',
  ].join(' ')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    }),
  })

  if (!res.ok) {
    console.error('[Slack Events] LLM call failed:', res.status, await res.text())
    return 'Sorry, I encountered an error processing your request.'
  }

  interface AnthropicResponse {
    content: Array<{ type: string; text: string }>
  }
  const data = (await res.json()) as AnthropicResponse
  return data.content.find((c) => c.type === 'text')?.text ?? 'No response generated.'
}

/**
 * Process an app_mention or direct message event.
 * Strips the bot mention prefix, calls LLM, replies in thread.
 */
async function processMessageEvent(event: Record<string, unknown>): Promise<void> {
  const channel = event.channel as string | undefined
  const threadTs = (event.thread_ts ?? event.ts) as string | undefined
  let text = (event.text as string | undefined) ?? ''

  // Strip <@BOTID> mention prefix if present
  text = text.replace(/^<@[A-Z0-9]+>\s*/i, '').trim()

  if (!text || !channel) return

  try {
    const reply = await callPlatformLLM(text)
    await postSlackMessage(channel, reply, threadTs)
  } catch (err) {
    console.error('[Slack Events] Error processing message event:', err)
  }
}

/**
 * POST /api/platform/slack/events
 */
export async function POST(request: Request): Promise<Response> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    console.error('[Slack Events] SLACK_SIGNING_SECRET not configured')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Read raw body once (needed for both signature verification and parsing)
  const rawBody = await request.text()

  const timestamp = request.headers.get('x-slack-request-timestamp') ?? ''
  const signature = request.headers.get('x-slack-signature') ?? ''

  const isValid = await verifySlackSignature(signingSecret, timestamp, rawBody, signature)
  if (!isValid) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Slack challenge verification (initial endpoint setup)
  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge })
  }

  // Acknowledge Slack immediately — must respond within 3 seconds
  // All processing runs asynchronously after the response
  if (payload.type === 'event_callback') {
    const event = payload.event as Record<string, unknown> | undefined
    const eventType = event?.type as string | undefined

    // Process app_mention and direct messages to the bot
    if (event && (eventType === 'app_mention' || eventType === 'message')) {
      // Ignore bot's own messages to prevent loops
      if (!event.bot_id) {
        // Fire-and-forget — do not await, respond to Slack first
        processMessageEvent(event).catch((err) =>
          console.error('[Slack Events] Async processing error:', err),
        )
      }
    }
  }

  return Response.json({ ok: true })
}
