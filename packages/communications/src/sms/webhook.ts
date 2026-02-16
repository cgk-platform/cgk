/**
 * Twilio Webhook Handlers
 *
 * Handles incoming Twilio webhooks for:
 * - Message delivery status updates
 * - Incoming SMS (for opt-out handling)
 *
 * @ai-pattern webhook
 * @ai-critical Always respond with valid TwiML
 * @ai-critical Always verify webhook signatures before processing
 */

import twilio from 'twilio'

import { isOptInMessage, isOptOutMessage } from './compliance.js'
import { findTenantByTwilioNumber, handleStartKeyword, handleStopKeyword } from './opt-out.js'
import {
  generateEmptyTwimlResponse,
  isDeliveredStatus,
  isFailedStatus,
  parseTwilioIncomingMessage,
  parseTwilioStatusWebhook,
} from './provider.js'
import { getSmsQueueEntryByMessageSid, markSmsDelivered, markSmsFailed } from './queue.js'

// ============================================================================
// Webhook Handler Types
// ============================================================================

/**
 * Webhook handling result
 */
export interface WebhookResult {
  success: boolean
  response: string
  contentType: string
  processed?: boolean
  action?: string
}

// ============================================================================
// Incoming Message Webhook
// ============================================================================

/**
 * Handle incoming SMS webhook (for opt-out processing)
 *
 * This endpoint should be configured as the Messaging URL in Twilio.
 */
export async function handleIncomingSmsWebhook(
  body: Record<string, string>
): Promise<WebhookResult> {
  const message = parseTwilioIncomingMessage(body)

  if (!message) {
    return {
      success: false,
      response: generateEmptyTwimlResponse(),
      contentType: 'text/xml',
      processed: false,
    }
  }

  // Find the tenant by the Twilio phone number (the "To" field)
  const tenantId = await findTenantByTwilioNumber(message.to)

  if (!tenantId) {
    // Unknown phone number - just acknowledge
    return {
      success: true,
      response: generateEmptyTwimlResponse(),
      contentType: 'text/xml',
      processed: false,
      action: 'unknown_tenant',
    }
  }

  // Check for opt-out keywords
  if (isOptOutMessage(message.body)) {
    await handleStopKeyword(tenantId, message.from, message.body)
    return {
      success: true,
      response: generateEmptyTwimlResponse(),
      contentType: 'text/xml',
      processed: true,
      action: 'opt_out',
    }
  }

  // Check for opt-in keywords
  if (isOptInMessage(message.body)) {
    await handleStartKeyword(tenantId, message.from)
    return {
      success: true,
      response: generateEmptyTwimlResponse(),
      contentType: 'text/xml',
      processed: true,
      action: 'opt_in',
    }
  }

  // Other messages - just acknowledge
  return {
    success: true,
    response: generateEmptyTwimlResponse(),
    contentType: 'text/xml',
    processed: false,
    action: 'ignored',
  }
}

// ============================================================================
// Status Callback Webhook
// ============================================================================

/**
 * Handle message status webhook
 *
 * This endpoint should be configured as the Status Callback URL in Twilio.
 */
export async function handleStatusWebhook(
  tenantId: string,
  body: Record<string, string>
): Promise<WebhookResult> {
  const status = parseTwilioStatusWebhook(body)

  if (!status) {
    return {
      success: false,
      response: JSON.stringify({ error: 'Invalid webhook payload' }),
      contentType: 'application/json',
      processed: false,
    }
  }

  // Find the queue entry by message SID
  const entry = await getSmsQueueEntryByMessageSid(tenantId, status.messageSid)

  if (!entry) {
    // Message not found - might be from a different system
    return {
      success: true,
      response: JSON.stringify({ status: 'ignored', reason: 'message_not_found' }),
      contentType: 'application/json',
      processed: false,
    }
  }

  // Update status based on Twilio status
  if (isDeliveredStatus(status.status)) {
    await markSmsDelivered(tenantId, status.messageSid)
    return {
      success: true,
      response: JSON.stringify({ status: 'delivered' }),
      contentType: 'application/json',
      processed: true,
      action: 'delivered',
    }
  }

  if (isFailedStatus(status.status)) {
    const errorMessage = body.ErrorMessage || body.ErrorCode || 'Delivery failed'
    await markSmsFailed(tenantId, entry.id, errorMessage)
    return {
      success: true,
      response: JSON.stringify({ status: 'failed', error: errorMessage }),
      contentType: 'application/json',
      processed: true,
      action: 'failed',
    }
  }

  // Other statuses (queued, sending, sent) - just acknowledge
  return {
    success: true,
    response: JSON.stringify({ status: status.status }),
    contentType: 'application/json',
    processed: false,
    action: status.status,
  }
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verify Twilio webhook signature
 *
 * Uses Twilio's validateRequest function to verify that the webhook
 * request actually came from Twilio.
 *
 * @param authToken - The Twilio Auth Token (from tenant settings or env)
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full URL of the webhook endpoint
 * @param params - The POST parameters from the webhook request
 * @returns true if the signature is valid, false otherwise
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) {
    console.error('[Twilio Webhook] Auth token not provided')
    return false
  }

  if (!signature) {
    console.error('[Twilio Webhook] Signature header missing')
    return false
  }

  if (!url) {
    console.error('[Twilio Webhook] URL not provided')
    return false
  }

  try {
    // Use Twilio's official validation function
    // This validates that the signature matches what Twilio would generate
    // using the auth token and the request parameters
    return twilio.validateRequest(authToken, signature, url, params)
  } catch (error) {
    console.error('[Twilio Webhook] Signature verification error:', error)
    return false
  }
}

/**
 * Get the Twilio auth token for webhook verification
 *
 * For incoming webhooks, we may not know the tenant yet (incoming SMS),
 * so we fall back to the platform-level TWILIO_AUTH_TOKEN env var.
 *
 * For status webhooks, we should use the tenant's auth token.
 */
export function getTwilioAuthTokenForWebhook(): string | null {
  // Fall back to platform-level token for incoming SMS webhooks
  // where we don't know the tenant yet
  return process.env.TWILIO_AUTH_TOKEN || null
}

// ============================================================================
// Request Parsing Helpers
// ============================================================================

/**
 * Parse form data from request
 */
export async function parseFormData(request: Request): Promise<Record<string, string>> {
  try {
    const formData = await request.formData()
    const result: Record<string, string> = {}

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        result[key] = value
      }
    }

    return result
  } catch {
    return {}
  }
}

/**
 * Create a TwiML response
 */
export function createTwimlResponse(body: string = ''): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`
  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

/**
 * Create a JSON response
 */
export function createJsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
