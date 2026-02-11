/**
 * Twilio Voice Call Integration
 *
 * Alternative provider for voice calls with more flexibility.
 * Use when you need custom call flows or Twilio-specific features.
 *
 * Note: Twilio integration requires manual LLM integration unlike Retell.
 * Best for custom scenarios where Retell doesn't fit.
 */

import type {
  CreateVoiceCallInput,
  VoiceCall,
  VoiceCallProvider,
} from '../types.js'
import {
  createVoiceCall,
  updateVoiceCallBySid,
} from '../db/voice-queries.js'

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

interface TwilioCallResponse {
  sid: string
  status: string
  direction: string
  from: string
  to: string
  date_created: string
  start_time?: string
  end_time?: string
  duration?: string
}

interface TwilioWebhookPayload {
  CallSid: string
  CallStatus: string
  From: string
  To: string
  Direction: string
  Duration?: string
  RecordingUrl?: string
  RecordingSid?: string
  Timestamp?: string
}

export class TwilioVoiceCalls {
  private accountSid: string
  private authToken: string
  private tenantId: string

  constructor(accountSid: string, authToken: string, tenantId: string) {
    if (!accountSid || !authToken) {
      throw new Error('Twilio account SID and auth token are required')
    }
    this.accountSid = accountSid
    this.authToken = authToken
    this.tenantId = tenantId
  }

  /**
   * Create an outbound phone call
   */
  async createOutboundCall(params: {
    agentId: string
    toNumber: string
    fromNumber: string
    webhookUrl: string
    statusCallbackUrl?: string
    recordCall?: boolean
    creatorId?: string
    contactId?: string
  }): Promise<VoiceCall> {
    const url = `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Calls.json`
    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

    const formData = new URLSearchParams()
    formData.append('To', params.toNumber)
    formData.append('From', params.fromNumber)
    formData.append('Url', params.webhookUrl) // TwiML endpoint
    formData.append('Method', 'POST')

    if (params.statusCallbackUrl) {
      formData.append('StatusCallback', params.statusCallbackUrl)
      formData.append('StatusCallbackMethod', 'POST')
      formData.append('StatusCallbackEvent', 'initiated ringing answered completed')
    }

    if (params.recordCall) {
      formData.append('Record', 'true')
      formData.append('RecordingStatusCallback', `${params.webhookUrl}/recording`)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Twilio call creation failed: ${response.status} - ${errorText}`)
    }

    const twilioCall = (await response.json()) as TwilioCallResponse

    // Create call record in our database
    const callInput: CreateVoiceCallInput = {
      agentId: params.agentId,
      callSid: twilioCall.sid,
      provider: 'twilio',
      direction: 'outbound',
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      creatorId: params.creatorId,
      contactId: params.contactId,
    }

    return createVoiceCall(this.tenantId, callInput)
  }

  /**
   * Handle incoming Twilio webhook (status callback)
   */
  async handleStatusCallback(payload: TwilioWebhookPayload): Promise<void> {
    const callSid = payload.CallSid
    const status = this.mapTwilioStatus(payload.CallStatus)

    const updates: Parameters<typeof updateVoiceCallBySid>[1] = {
      status,
    }

    if (status === 'in_progress') {
      updates.answeredAt = new Date()
    }

    if (status === 'completed' || status === 'failed') {
      updates.endedAt = new Date()
      if (payload.Duration) {
        updates.durationSeconds = parseInt(payload.Duration, 10)
      }
    }

    if (payload.RecordingUrl) {
      updates.recordingUrl = payload.RecordingUrl
    }

    await updateVoiceCallBySid(callSid, updates)
  }

  /**
   * Get call details from Twilio
   */
  async getCall(callSid: string): Promise<TwilioCallResponse> {
    const url = `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Calls/${callSid}.json`
    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Twilio call not found: ${callSid}`)
    }

    return (await response.json()) as TwilioCallResponse
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    const url = `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Calls/${callSid}.json`
    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

    const formData = new URLSearchParams()
    formData.append('Status', 'completed')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to end call: ${response.status} - ${errorText}`)
    }
  }

  /**
   * Generate TwiML for voice response
   */
  generateTwiML(options: {
    say?: string
    gather?: {
      input: 'speech' | 'dtmf' | 'speech dtmf'
      action: string
      timeout?: number
      speechTimeout?: number
      hints?: string
      language?: string
      prompt?: string
    }
    play?: string
    record?: {
      action: string
      maxLength?: number
      playBeep?: boolean
    }
    redirect?: string
    hangup?: boolean
  }): string {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n'

    if (options.say) {
      twiml += `  <Say>${this.escapeXml(options.say)}</Say>\n`
    }

    if (options.gather) {
      const { input, action, timeout = 3, speechTimeout = 'auto', hints, language = 'en-US', prompt } = options.gather
      twiml += `  <Gather input="${input}" action="${action}" timeout="${timeout}" speechTimeout="${speechTimeout}" language="${language}"`
      if (hints) {
        twiml += ` hints="${hints}"`
      }
      twiml += '>\n'
      if (prompt) {
        twiml += `    <Say>${this.escapeXml(prompt)}</Say>\n`
      }
      twiml += '  </Gather>\n'
    }

    if (options.play) {
      twiml += `  <Play>${options.play}</Play>\n`
    }

    if (options.record) {
      const { action, maxLength = 60, playBeep = true } = options.record
      twiml += `  <Record action="${action}" maxLength="${maxLength}" playBeep="${playBeep}" />\n`
    }

    if (options.redirect) {
      twiml += `  <Redirect>${options.redirect}</Redirect>\n`
    }

    if (options.hangup) {
      twiml += '  <Hangup />\n'
    }

    twiml += '</Response>'
    return twiml
  }

  private mapTwilioStatus(twilioStatus: string): VoiceCall['status'] {
    const statusMap: Record<string, VoiceCall['status']> = {
      queued: 'initiated',
      initiated: 'initiated',
      ringing: 'ringing',
      'in-progress': 'in_progress',
      completed: 'completed',
      busy: 'missed',
      failed: 'failed',
      'no-answer': 'missed',
      canceled: 'cancelled',
    }
    return statusMap[twilioStatus] || 'failed'
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

/**
 * Create a Twilio voice calls client for a tenant
 */
export function createTwilioClient(
  accountSid: string,
  authToken: string,
  tenantId: string
): TwilioVoiceCalls {
  return new TwilioVoiceCalls(accountSid, authToken, tenantId)
}

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // Sort the POST params alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join('')

  // Compute the signature
  const crypto = require('crypto')
  const data = url + sortedParams
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64')

  return signature === expectedSignature
}

/**
 * Provider type constant
 */
export const TWILIO_PROVIDER: VoiceCallProvider = 'twilio'
