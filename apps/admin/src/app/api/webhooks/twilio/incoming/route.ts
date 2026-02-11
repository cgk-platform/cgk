export const dynamic = 'force-dynamic'

import {
  createTwimlResponse,
  handleIncomingSmsWebhook,
  parseFormData,
} from '@cgk/communications'

/**
 * POST /api/webhooks/twilio/incoming
 * Handle incoming SMS from Twilio (for opt-out processing)
 *
 * Configure this URL as the Messaging URL in Twilio Console:
 * https://your-domain.com/api/webhooks/twilio/incoming
 */
export async function POST(request: Request) {
  try {
    // Parse form data from Twilio
    const body = await parseFormData(request)

    if (!body.From || !body.To || !body.Body) {
      return createTwimlResponse()
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
