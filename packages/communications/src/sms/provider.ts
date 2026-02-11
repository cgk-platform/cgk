/**
 * Twilio SMS Provider
 *
 * Wrapper for Twilio API with tenant-specific credentials.
 * Handles sending SMS and receiving delivery status webhooks.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical Each tenant uses their own Twilio credentials
 */

import type {
  SmsSendRequest,
  SmsSendResult,
  TenantSmsSettings,
  TwilioIncomingMessage,
  TwilioMessageStatus,
  TwilioVerificationResult,
} from './types.js'
import { getTwilioCredentials, getSmsSettings } from './settings.js'

// ============================================================================
// Twilio Client Interface
// ============================================================================

/**
 * Twilio REST API base URL
 */
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

/**
 * Send an SMS via Twilio
 */
export async function sendSms(
  tenantId: string,
  request: SmsSendRequest
): Promise<SmsSendResult> {
  const credentials = await getTwilioCredentials(tenantId)

  if (!credentials) {
    return {
      success: false,
      error: 'Twilio credentials not configured',
      errorCode: 'CREDENTIALS_NOT_CONFIGURED',
    }
  }

  const settings = await getSmsSettings(tenantId)

  try {
    // Use messaging service SID if available, otherwise use phone number
    const fromValue = request.messagingServiceSid ||
      settings.twilioMessagingServiceSid ||
      credentials.phoneNumber

    const body = new URLSearchParams({
      To: request.to,
      Body: request.content,
      ...(fromValue.startsWith('MG')
        ? { MessagingServiceSid: fromValue }
        : { From: fromValue }),
    })

    const response = await fetch(
      `${TWILIO_API_BASE}/Accounts/${credentials.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )

    const data = await response.json() as Record<string, unknown>

    if (response.ok) {
      return {
        success: true,
        messageSid: data.sid as string,
      }
    }

    return {
      success: false,
      error: (data.message as string) || 'Unknown error',
      errorCode: data.code?.toString(),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'SEND_FAILED',
    }
  }
}

/**
 * Verify Twilio credentials
 */
export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<TwilioVerificationResult> {
  try {
    // Verify account by fetching account details
    const accountResponse = await fetch(
      `${TWILIO_API_BASE}/Accounts/${accountSid}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      }
    )

    if (!accountResponse.ok) {
      const data = await accountResponse.json() as Record<string, unknown>
      return {
        success: false,
        error: (data.message as string) || 'Invalid credentials',
      }
    }

    // Verify phone number is valid and owned
    const phoneResponse = await fetch(
      `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
      }
    )

    if (!phoneResponse.ok) {
      return {
        success: false,
        error: 'Failed to verify phone number',
      }
    }

    const phoneData = await phoneResponse.json() as { incoming_phone_numbers?: Array<{ phone_number: string }> }

    if (!phoneData.incoming_phone_numbers || phoneData.incoming_phone_numbers.length === 0) {
      return {
        success: false,
        error: 'Phone number not found in your Twilio account',
      }
    }

    const firstNumber = phoneData.incoming_phone_numbers[0]
    return {
      success: true,
      accountSid,
      phoneNumber: firstNumber?.phone_number ?? phoneNumber,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

/**
 * Send a test SMS to verify setup
 */
export async function sendTestSms(
  tenantId: string,
  recipientPhone: string
): Promise<SmsSendResult> {
  const testMessage =
    'This is a test message from your SMS notification system. ' +
    'Reply STOP to opt out of future messages.'

  return sendSms(tenantId, {
    to: recipientPhone,
    content: testMessage,
  })
}

/**
 * Parse incoming Twilio webhook for message status
 */
export function parseTwilioStatusWebhook(
  body: Record<string, string>
): { messageSid: string; status: TwilioMessageStatus } | null {
  const messageSid = body.MessageSid
  const status = body.MessageStatus as TwilioMessageStatus

  if (!messageSid || !status) {
    return null
  }

  return { messageSid, status }
}

/**
 * Parse incoming Twilio webhook for incoming message (opt-out handling)
 */
export function parseTwilioIncomingMessage(
  body: Record<string, string>
): TwilioIncomingMessage | null {
  const from = body.From
  const to = body.To
  const messageBody = body.Body
  const messageSid = body.MessageSid

  if (!from || !to || !messageBody || !messageSid) {
    return null
  }

  return {
    from,
    to,
    body: messageBody,
    messageSid,
  }
}

/**
 * Generate TwiML response (empty response for incoming messages)
 */
export function generateEmptyTwimlResponse(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
}

/**
 * Check if a message status indicates delivery
 */
export function isDeliveredStatus(status: TwilioMessageStatus): boolean {
  return status === 'delivered'
}

/**
 * Check if a message status indicates failure
 */
export function isFailedStatus(status: TwilioMessageStatus): boolean {
  return status === 'failed' || status === 'undelivered'
}

/**
 * Get Twilio phone number for a tenant (for webhook routing)
 */
export async function getTwilioPhoneNumber(
  settings: TenantSmsSettings
): Promise<string | null> {
  return settings.twilioPhoneNumber
}
