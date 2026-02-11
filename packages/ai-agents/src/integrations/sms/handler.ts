/**
 * SMS integration for AI Agents using Twilio
 */

import * as crypto from 'node:crypto'
import {
  getSMSConfig,
  upsertSMSConfig,
  getAgentPhoneNumber,
  getOrCreateSMSConversation,
  getSMSConversation,
  createSMSMessage,
  updateSMSMessageStatus,
  updateSMSConversationOptOut,
  checkAndIncrementRateLimit,
} from '../db/queries.js'
import { decrypt, safeDecrypt, encrypt } from '../utils/encryption.js'
import { logAction } from '../../actions/logger.js'
import type {
  TenantSMSConfig,
  AgentSMSConversation,
  AgentSMSMessage,
  SendSMSParams,
  SMSResult,
  TwilioWebhookPayload,
  SMSPhoneNumber,
} from '../types.js'

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

/**
 * SMS integration class
 */
export class SMSIntegration {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  /**
   * Get Twilio client credentials
   */
  private async getCredentials(): Promise<{
    accountSid: string
    authToken: string
  } | null> {
    const config = await getSMSConfig()
    if (!config?.enabled) return null

    const accountSid = safeDecrypt(config.twilioAccountSidEncrypted)
    const authToken = safeDecrypt(config.twilioAuthTokenEncrypted)

    if (!accountSid || !authToken) return null

    return { accountSid, authToken }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(params: SendSMSParams): Promise<SMSResult> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, error: 'SMS not configured' }
    }

    // Get agent's phone number
    const fromNumber = await getAgentPhoneNumber(params.agentId)
    if (!fromNumber) {
      return { success: false, error: 'No phone number assigned to agent' }
    }

    // Check rate limits
    const rateLimit = await checkAndIncrementRateLimit(params.agentId, 'sms')
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded (${rateLimit.limitType}). Try again later.`,
      }
    }

    // Check opt-out status
    const conversation = await getSMSConversation(fromNumber, params.to)
    if (conversation?.optedOut) {
      return { success: false, error: 'Recipient has opted out of SMS' }
    }

    try {
      // Send via Twilio API
      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${creds.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: params.to,
            Body: params.body,
            ...(params.mediaUrls?.length ? { MediaUrl: params.mediaUrls.join(',') } : {}),
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json() as { message?: string; code?: number }
        throw new Error(error.message || `Twilio error: ${response.status}`)
      }

      const result = await response.json() as {
        sid: string
        status: string
        error_code?: number
        error_message?: string
      }

      // Get or create conversation
      const conv = await getOrCreateSMSConversation(
        params.agentId,
        fromNumber,
        params.to
      )

      // Record message
      await createSMSMessage({
        conversationId: conv.id,
        direction: 'outbound',
        fromNumber,
        toNumber: params.to,
        body: params.body,
        mediaUrls: params.mediaUrls,
        providerMessageId: result.sid,
        status: 'sent',
      })

      // Log action
      await logAction({
        agentId: params.agentId,
        actionType: 'send_sms',
        actionCategory: 'messaging',
        actionDescription: `Sent SMS to ${maskPhoneNumber(params.to)}`,
        inputData: { to: maskPhoneNumber(params.to), bodyLength: params.body.length },
        outputData: { messageSid: result.sid },
      })

      return { success: true, messageSid: result.sid, status: result.status }
    } catch (error) {
      console.error('[sms] Failed to send SMS:', error)

      await logAction({
        agentId: params.agentId,
        actionType: 'send_sms',
        actionCategory: 'messaging',
        actionDescription: `Failed to send SMS to ${maskPhoneNumber(params.to)}`,
        inputData: { to: maskPhoneNumber(params.to) },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      }
    }
  }

  /**
   * Handle inbound SMS webhook from Twilio
   */
  async handleInboundSMS(
    webhook: TwilioWebhookPayload
  ): Promise<{ processed: boolean; agentId?: string; conversationId?: string }> {
    // Find agent by phone number
    const config = await getSMSConfig()
    if (!config?.enabled) {
      return { processed: false }
    }

    // Find which agent this phone number is assigned to
    const phoneConfig = config.phoneNumbers.find(
      (p) => normalizePhoneNumber(p.number) === normalizePhoneNumber(webhook.To)
    )
    const agentId = phoneConfig?.agentId || config.defaultAgentId
    if (!agentId) {
      console.log('[sms] No agent configured for phone number:', webhook.To)
      return { processed: false }
    }

    // Get or create conversation
    const conversation = await getOrCreateSMSConversation(
      agentId,
      webhook.To,
      webhook.From
    )

    // Check for opt-out keywords
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end']
    const messageBody = webhook.Body.toLowerCase().trim()
    if (optOutKeywords.includes(messageBody)) {
      await updateSMSConversationOptOut(conversation.id, true)

      // Send confirmation
      await this.sendSMS({
        agentId,
        to: webhook.From,
        body: "You've been unsubscribed. Reply START to resubscribe.",
      })

      return { processed: true, agentId, conversationId: conversation.id }
    }

    // Check for opt-in keywords
    const optInKeywords = ['start', 'yes', 'subscribe']
    if (optInKeywords.includes(messageBody) && conversation.optedOut) {
      await updateSMSConversationOptOut(conversation.id, false)

      await this.sendSMS({
        agentId,
        to: webhook.From,
        body: "You've been resubscribed to messages.",
      })

      return { processed: true, agentId, conversationId: conversation.id }
    }

    // Record inbound message
    await createSMSMessage({
      conversationId: conversation.id,
      direction: 'inbound',
      fromNumber: webhook.From,
      toNumber: webhook.To,
      body: webhook.Body,
      mediaUrls: extractMediaUrls(webhook),
      providerMessageId: webhook.MessageSid,
      status: 'delivered',
    })

    // Log action
    await logAction({
      agentId,
      actionType: 'receive_sms',
      actionCategory: 'messaging',
      actionDescription: `Received SMS from ${maskPhoneNumber(webhook.From)}`,
      inputData: {
        from: maskPhoneNumber(webhook.From),
        bodyLength: webhook.Body.length,
        hasMedia: Boolean(webhook.NumMedia && parseInt(webhook.NumMedia) > 0),
      },
      conversationId: conversation.id,
    })

    return { processed: true, agentId, conversationId: conversation.id }
  }

  /**
   * Process inbound SMS with agent and send reply
   */
  async processAndReply(
    agentId: string,
    conversationId: string,
    fromNumber: string,
    message: string,
    processor: (params: {
      agentId: string
      message: string
      context: Record<string, unknown>
    }) => Promise<{ text: string; toolsUsed?: string[] }>
  ): Promise<SMSResult> {
    // Process message with agent
    const response = await processor({
      agentId,
      message,
      context: {
        channel: 'sms',
        phoneNumber: maskPhoneNumber(fromNumber),
        conversationId,
      },
    })

    // Send response
    return this.sendSMS({
      agentId,
      to: fromNumber,
      body: response.text,
    })
  }

  /**
   * Handle Twilio status callback
   */
  async handleStatusCallback(
    messageSid: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const mappedStatus = mapTwilioStatus(status)
    await updateSMSMessageStatus(messageSid, mappedStatus, errorCode, errorMessage)
  }

  /**
   * Verify Twilio webhook signature
   */
  verifyWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
    authToken: string
  ): boolean {
    // Sort params and build string
    const sortedKeys = Object.keys(params).sort()
    let paramString = url
    for (const key of sortedKeys) {
      paramString += key + params[key]
    }

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(paramString, 'utf8')
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}

// ============================================================================
// Configuration Functions
// ============================================================================

/**
 * Configure SMS for tenant
 */
export async function configureSMS(config: {
  provider: 'twilio' | 'telnyx'
  accountSid?: string
  authToken?: string
  phoneNumbers?: SMSPhoneNumber[]
  defaultPhoneNumber?: string
  defaultAgentId?: string
  enabled?: boolean
}): Promise<TenantSMSConfig> {
  const encryptedSid = config.accountSid ? encrypt(config.accountSid) : null
  const encryptedToken = config.authToken ? encrypt(config.authToken) : null

  return upsertSMSConfig({
    provider: config.provider,
    twilioAccountSidEncrypted: encryptedSid,
    twilioAuthTokenEncrypted: encryptedToken,
    phoneNumbers: config.phoneNumbers || [],
    defaultPhoneNumber: config.defaultPhoneNumber || null,
    defaultAgentId: config.defaultAgentId || null,
    enabled: config.enabled ?? true,
  })
}

/**
 * Get SMS configuration status
 */
export async function getSMSStatus(): Promise<{
  configured: boolean
  enabled: boolean
  provider?: string
  phoneNumbers?: string[]
  defaultPhoneNumber?: string
}> {
  const config = await getSMSConfig()

  if (!config) {
    return { configured: false, enabled: false }
  }

  return {
    configured: Boolean(config.twilioAccountSidEncrypted),
    enabled: config.enabled,
    provider: config.provider,
    phoneNumbers: config.phoneNumbers.map((p) => maskPhoneNumber(p.number)),
    defaultPhoneNumber: config.defaultPhoneNumber
      ? maskPhoneNumber(config.defaultPhoneNumber)
      : undefined,
  }
}

/**
 * Check if SMS is configured
 */
export async function isSMSConfigured(): Promise<boolean> {
  const config = await getSMSConfig()
  return Boolean(config?.enabled && config.twilioAccountSidEncrypted)
}

/**
 * Add a phone number to the configuration
 */
export async function addPhoneNumber(
  number: string,
  options: { agentId?: string; purpose?: string; messagingServiceSid?: string } = {}
): Promise<TenantSMSConfig> {
  const config = await getSMSConfig()
  if (!config) {
    throw new Error('SMS not configured')
  }

  const phoneNumbers = [
    ...config.phoneNumbers,
    {
      number: normalizePhoneNumber(number),
      agentId: options.agentId,
      purpose: options.purpose,
      messagingServiceSid: options.messagingServiceSid,
    },
  ]

  return upsertSMSConfig({
    ...config,
    phoneNumbers,
  })
}

/**
 * Create SMS integration instance for a tenant
 */
export function createSMSIntegration(tenantId: string): SMSIntegration {
  return new SMSIntegration(tenantId)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Add + prefix if missing (assume US number)
  if (!normalized.startsWith('+')) {
    if (normalized.length === 10) {
      normalized = '+1' + normalized
    } else if (normalized.length === 11 && normalized.startsWith('1')) {
      normalized = '+' + normalized
    }
  }

  return normalized
}

/**
 * Mask phone number for logging
 */
function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  if (normalized.length < 8) return '***'
  return normalized.slice(0, -4) + '****'
}

/**
 * Extract media URLs from Twilio webhook
 */
function extractMediaUrls(webhook: TwilioWebhookPayload): string[] {
  const urls: string[] = []
  const numMedia = parseInt(webhook.NumMedia || '0', 10)

  for (let i = 0; i < numMedia; i++) {
    const url = webhook[`MediaUrl${i}`]
    if (url) urls.push(url)
  }

  return urls
}

/**
 * Map Twilio status to our status
 */
function mapTwilioStatus(
  status: string
): 'delivered' | 'failed' | 'undelivered' {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'delivered'
    case 'undelivered':
      return 'undelivered'
    case 'failed':
      return 'failed'
    default:
      return 'delivered'
  }
}

/**
 * Generate TwiML response (empty - no auto-reply)
 */
export function generateEmptyTwiML(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
}

/**
 * Generate TwiML response with message
 */
export function generateMessageTwiML(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}
