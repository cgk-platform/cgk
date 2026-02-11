/**
 * Twilio Webhook Handlers
 *
 * Handles incoming Twilio webhooks for:
 * - Message delivery status updates
 * - Incoming SMS (for opt-out handling)
 *
 * @ai-pattern webhook
 * @ai-critical Always respond with valid TwiML
 */

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
 * Note: In production, implement proper signature verification using
 * Twilio's validateRequest function with your auth token.
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  _params: Record<string, string>
): boolean {
  // Implementation note:
  // Use Twilio's validateRequest from the twilio package
  // For now, this is a placeholder that should be implemented properly
  //
  // Example with twilio package:
  // import twilio from 'twilio'
  // return twilio.validateRequest(authToken, signature, url, params)
  //
  // For production, always validate the X-Twilio-Signature header

  // Placeholder - in production, implement proper verification
  if (!authToken || !signature || !url) {
    return false
  }

  // TODO: Implement proper Twilio signature verification
  return true
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
