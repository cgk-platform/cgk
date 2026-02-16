/**
 * Retell.ai Voice Call Integration
 *
 * Primary provider for AI-powered voice calls.
 * Handles inbound/outbound calls, real-time transcription, and call analysis.
 *
 * Features:
 * - Outbound call initiation
 * - Inbound call handling
 * - Real-time transcription
 * - Post-call analysis
 * - Recording management
 */

import type {
  AgentVoiceConfig,
  CreateVoiceCallInput,
  RetellWebhookEvent,
  VoiceCall,
  VoiceCallProvider,
} from '../types.js'
import {
  createTranscript,
  createVoiceCall,
  getVoiceCallBySid,
  getVoiceConfig,
  updateVoiceCallBySid,
  updateVoiceConfig,
} from '../db/voice-queries.js'

const RETELL_API_BASE = 'https://api.retellai.com'

interface RetellAgent {
  agent_id: string
  agent_name: string
  voice_id: string
  language: string
  llm_websocket_url: string
  webhook_url: string
}

interface RetellCall {
  call_id: string
  agent_id: string
  call_status: string
  start_timestamp?: number
  end_timestamp?: number
  transcript?: string
  recording_url?: string
  call_analysis?: {
    call_summary?: string
    agent_sentiment?: string
    customer_sentiment?: string
    action_items?: string[]
  }
}

interface RetellPhoneNumber {
  phone_number: string
  phone_number_id: string
  inbound_agent_id?: string
}

export class RetellVoiceCalls {
  private apiKey: string
  private tenantId: string

  constructor(apiKey: string, tenantId: string) {
    if (!apiKey) {
      throw new Error('Retell API key is required')
    }
    this.apiKey = apiKey
    this.tenantId = tenantId
  }

  /**
   * Create an outbound phone call
   */
  async createOutboundCall(params: {
    agentId: string
    toNumber: string
    fromNumber: string
    context?: string
    creatorId?: string
    contactId?: string
  }): Promise<VoiceCall> {
    // Get agent voice configuration
    const voiceConfig = await getVoiceConfig(params.agentId)
    if (!voiceConfig) {
      throw new Error(`Voice configuration not found for agent ${params.agentId}`)
    }

    // Ensure Retell agent exists
    const retellAgentId = await this.ensureRetellAgent(params.agentId, voiceConfig)

    // Create the call via Retell API
    const response = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: retellAgentId,
        to_number: params.toNumber,
        from_number: params.fromNumber,
        metadata: {
          tenant_id: this.tenantId,
          agent_id: params.agentId,
          creator_id: params.creatorId,
          contact_id: params.contactId,
          context: params.context,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Retell call creation failed: ${response.status} - ${errorText}`)
    }

    const retellCall = (await response.json()) as RetellCall

    // Create call record in our database
    const callInput: CreateVoiceCallInput = {
      agentId: params.agentId,
      callSid: retellCall.call_id,
      provider: 'retell',
      direction: 'outbound',
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      creatorId: params.creatorId,
      contactId: params.contactId,
    }

    return createVoiceCall(this.tenantId, callInput)
  }

  /**
   * Handle incoming Retell webhook events
   */
  async handleWebhook(event: RetellWebhookEvent): Promise<void> {
    const callSid = event.call_id

    switch (event.event) {
      case 'call_started':
        await updateVoiceCallBySid(callSid, {
          status: 'in_progress',
          answeredAt: new Date(),
        })
        break

      case 'call_ended':
        await updateVoiceCallBySid(callSid, {
          status: 'completed',
          endedAt: new Date(),
          durationSeconds: event.call_duration,
          recordingUrl: event.recording_url,
        })
        break

      case 'call_analyzed':
        if (event.call_analysis) {
          await updateVoiceCallBySid(callSid, {
            summary: event.call_analysis.call_summary,
            sentiment: this.mapSentiment(event.call_analysis.agent_sentiment),
            actionItems: event.call_analysis.action_items?.map((item) => ({
              description: item,
              completed: false,
            })),
          })
        }
        break

      case 'transcript':
        if (event.transcript) {
          const call = await getVoiceCallBySid(callSid)
          if (call) {
            for (const entry of event.transcript) {
              await createTranscript(this.tenantId, {
                callId: call.id,
                speaker: entry.role === 'agent' ? 'agent' : 'caller',
                text: entry.content,
                startedAt: new Date(entry.timestamp),
                isFinal: true,
              })
            }
          }
        }
        break

      case 'recording_ready':
        await updateVoiceCallBySid(callSid, {
          recordingUrl: event.recording_url,
        })
        break
    }
  }

  /**
   * Get or create a Retell agent for our agent
   */
  private async ensureRetellAgent(agentId: string, config: AgentVoiceConfig): Promise<string> {
    // Check if we already have a Retell agent ID
    if (config.retellAgentId) {
      // Verify it still exists
      try {
        await this.getRetellAgent(config.retellAgentId)
        return config.retellAgentId
      } catch {
        // Agent no longer exists, create new one
      }
    }

    // Create new Retell agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    if (!appUrl) {
      throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
    }

    const response = await fetch(`${RETELL_API_BASE}/v2/create-agent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: `Agent ${agentId}`,
        voice_id: config.ttsVoiceId || 'eleven_turbo_v2',
        language: 'en-US',
        llm_websocket_url: `${appUrl}/api/ai-agents/${agentId}/voice/llm`,
        webhook_url: `${appUrl}/api/ai-agents/voice/webhooks/retell`,
        ambient_sound: null,
        ambient_sound_volume: 0,
        responsiveness: 0.5,
        interruption_sensitivity: 0.5,
        enable_backchannel: true,
        backchannel_frequency: 0.5,
        backchannel_words: ['yeah', 'uh-huh', 'ok', 'I see'],
        reminder_trigger_ms: 10000,
        reminder_max_count: 2,
        normalize_for_speech: true,
        enable_voicemail_detection: config.voicemailEnabled,
        voicemail_message: config.voicemailGreeting,
        max_call_duration_ms: config.maxCallDurationMinutes * 60 * 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create Retell agent: ${response.status} - ${errorText}`)
    }

    const retellAgent = (await response.json()) as RetellAgent

    // Save Retell agent ID to our config
    await updateVoiceConfig(agentId, {
      retellAgentId: retellAgent.agent_id,
    })

    return retellAgent.agent_id
  }

  /**
   * Get a Retell agent by ID
   */
  private async getRetellAgent(retellAgentId: string): Promise<RetellAgent> {
    const response = await fetch(`${RETELL_API_BASE}/v2/get-agent/${retellAgentId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Retell agent not found: ${retellAgentId}`)
    }

    return (await response.json()) as RetellAgent
  }

  /**
   * Update a Retell agent's configuration
   */
  async updateRetellAgent(
    retellAgentId: string,
    updates: Partial<{
      agent_name: string
      voice_id: string
      language: string
      voicemail_message: string
      max_call_duration_ms: number
    }>
  ): Promise<RetellAgent> {
    const response = await fetch(`${RETELL_API_BASE}/v2/update-agent/${retellAgentId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update Retell agent: ${response.status} - ${errorText}`)
    }

    return (await response.json()) as RetellAgent
  }

  /**
   * Get call details from Retell
   */
  async getRetellCall(callId: string): Promise<RetellCall> {
    const response = await fetch(`${RETELL_API_BASE}/v2/get-call/${callId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Retell call not found: ${callId}`)
    }

    return (await response.json()) as RetellCall
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<void> {
    const response = await fetch(`${RETELL_API_BASE}/v2/end-call/${callId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to end call: ${response.status} - ${errorText}`)
    }
  }

  /**
   * List phone numbers associated with the account
   */
  async listPhoneNumbers(): Promise<RetellPhoneNumber[]> {
    const response = await fetch(`${RETELL_API_BASE}/v2/list-phone-numbers`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list phone numbers: ${response.status} - ${errorText}`)
    }

    return (await response.json()) as RetellPhoneNumber[]
  }

  /**
   * Assign an agent to handle inbound calls for a phone number
   */
  async assignInboundAgent(phoneNumberId: string, retellAgentId: string): Promise<void> {
    const response = await fetch(`${RETELL_API_BASE}/v2/update-phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inbound_agent_id: retellAgentId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to assign inbound agent: ${response.status} - ${errorText}`)
    }
  }

  private mapSentiment(sentiment?: string): 'positive' | 'neutral' | 'negative' | undefined {
    if (!sentiment) return undefined
    const lower = sentiment.toLowerCase()
    if (lower.includes('positive')) return 'positive'
    if (lower.includes('negative')) return 'negative'
    return 'neutral'
  }
}

/**
 * Create a Retell voice calls client for a tenant
 */
export function createRetellClient(apiKey: string, tenantId: string): RetellVoiceCalls {
  return new RetellVoiceCalls(apiKey, tenantId)
}

/**
 * Verify Retell webhook signature - MANDATORY
 * Returns false if secret is not configured or signature is invalid
 */
export function verifyRetellSignature(body: string, signature: string | null): boolean {
  if (!signature) return false

  // Retell uses HMAC-SHA256 for webhook signatures
  const webhookSecret = process.env.RETELL_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('RETELL_WEBHOOK_SECRET not configured - rejecting webhook')
    return false // Reject if secret not configured
  }

  // Use crypto to verify HMAC
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  return signature === expectedSignature
}

/**
 * Provider type constant
 */
export const RETELL_PROVIDER: VoiceCallProvider = 'retell'
