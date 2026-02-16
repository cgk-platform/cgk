export const dynamic = 'force-dynamic'

import { checkAndMarkWebhook } from '@cgk-platform/db'

import {
  createTwimlResponse,
  getTwilioAuthTokenForWebhook,
  handleIncomingSmsWebhook,
  parseFormData,
  verifyTwilioSignature,
} from '@cgk-platform/communications'

/**
 * POST /api/webhooks/twilio/incoming
 * Handle incoming SMS from Twilio (for opt-out processing)
 *
 * Configure this URL as the Messaging URL in Twilio Console:
 * https://your-domain.com/api/webhooks/twilio/incoming
 *
 * Security: Verifies X-Twilio-Signature header to ensure request is from Twilio
 */
export async function POST(request: Request) {
  try {
    // Clone the request to read body twice (once for signature, once for form data)
    const clonedRequest = request.clone()

    // Parse form data from Twilio
    const body = await parseFormData(clonedRequest)

    // Verify Twilio signature
    const signature = request.headers.get('X-Twilio-Signature') || ''
    const authToken = getTwilioAuthTokenForWebhook()

    if (!authToken) {
      console.error('[Twilio Webhook] TWILIO_AUTH_TOKEN not configured')
      // Return empty TwiML to acknowledge but log the error
      return createTwimlResponse()
    }

    // Construct the full URL for signature verification
    const url = new URL(request.url)
    const webhookUrl = url.toString()

    if (!verifyTwilioSignature(authToken, signature, webhookUrl, body)) {
      console.error('[Twilio Webhook] Invalid signature - request rejected')
      // Return 403 for invalid signatures
      return new Response('Invalid signature', { status: 403 })
    }

    if (!body.From || !body.To || !body.Body) {
      return createTwimlResponse()
    }

    // Check idempotency using MessageSid
    const messageSid = body.MessageSid || body.SmsSid
    if (messageSid) {
      const isDuplicate = await checkAndMarkWebhook('twilio-incoming', messageSid, {
        from: body.From,
        to: body.To,
      })

      if (isDuplicate) {
        console.log('[Twilio Webhook] Duplicate incoming message ignored:', messageSid)
        return createTwimlResponse()
      }
    }

    // Process the incoming message (handles STOP/START keywords)
    const result = await handleIncomingSmsWebhook(body)

    // Always return TwiML response to Twilio
    return new Response(result.response, {
      status: 200,
      headers: { 'Content-Type': result.contentType },
    })
  } catch (error) {
    console.error('Error handling incoming SMS webhook:', error)
    // Still return valid TwiML even on error
    return createTwimlResponse()
  }
}
