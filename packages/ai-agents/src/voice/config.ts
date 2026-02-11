/**
 * Voice Configuration Helpers
 *
 * High-level functions for managing agent voice configuration,
 * including provider setup and credential management.
 */

import type {
  AgentVoiceConfig,
  CreateVoiceConfigInput,
  TTSProvider,
  TTSProviderType,
  STTProvider,
  STTProviderType,
  UpdateVoiceConfigInput,
  Voice,
} from './types.js'
import {
  createVoiceConfig as dbCreateVoiceConfig,
  getVoiceConfig as dbGetVoiceConfig,
  getVoiceCredentials,
  updateVoiceConfig as dbUpdateVoiceConfig,
} from './db/voice-queries.js'
import { createTTSProvider } from './tts/provider.js'
import { createSTTProvider } from './stt/provider.js'

/**
 * Get voice configuration for an agent
 */
export async function getAgentVoiceConfig(agentId: string): Promise<AgentVoiceConfig | null> {
  return dbGetVoiceConfig(agentId)
}

/**
 * Create or update voice configuration for an agent
 */
export async function createAgentVoiceConfig(
  tenantId: string,
  input: CreateVoiceConfigInput
): Promise<AgentVoiceConfig> {
  return dbCreateVoiceConfig(tenantId, input)
}

/**
 * Update voice configuration for an agent
 */
export async function updateAgentVoiceConfig(
  agentId: string,
  input: UpdateVoiceConfigInput
): Promise<AgentVoiceConfig | null> {
  return dbUpdateVoiceConfig(agentId, input)
}

/**
 * Get TTS provider for an agent based on their configuration
 */
export async function getAgentTTSProvider(
  agentId: string,
  tenantId: string
): Promise<TTSProvider | null> {
  const config = await dbGetVoiceConfig(agentId)
  if (!config) return null

  const credentials = await getVoiceCredentials(tenantId)
  if (!credentials) return null

  const apiKey = getProviderApiKey(config.ttsProvider, credentials)
  if (!apiKey) return null

  return createTTSProvider(config.ttsProvider, apiKey)
}

/**
 * Get STT provider for an agent based on their configuration
 */
export async function getAgentSTTProvider(
  agentId: string,
  tenantId: string
): Promise<STTProvider | null> {
  const config = await dbGetVoiceConfig(agentId)
  if (!config) return null

  const credentials = await getVoiceCredentials(tenantId)
  if (!credentials) return null

  const apiKey = getProviderApiKey(config.sttProvider, credentials)
  if (!apiKey) return null

  return createSTTProvider(config.sttProvider, apiKey)
}

/**
 * Get available voices for a tenant's TTS provider
 */
export async function getAvailableVoices(
  tenantId: string,
  provider: TTSProviderType
): Promise<Voice[]> {
  const credentials = await getVoiceCredentials(tenantId)
  if (!credentials) {
    throw new Error('Voice credentials not configured for this tenant')
  }

  const apiKey = getProviderApiKey(provider, credentials)
  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${provider}`)
  }

  const ttsProvider = await createTTSProvider(provider, apiKey)
  return ttsProvider.getVoices()
}

/**
 * Test TTS configuration by generating a sample speech
 */
export async function testTTSConfig(
  tenantId: string,
  provider: TTSProviderType,
  voiceId: string,
  sampleText: string = 'Hello! This is a test of the text-to-speech configuration.'
): Promise<{ success: boolean; durationMs?: number; error?: string }> {
  try {
    const credentials = await getVoiceCredentials(tenantId)
    if (!credentials) {
      return { success: false, error: 'Voice credentials not configured' }
    }

    const apiKey = getProviderApiKey(provider, credentials)
    if (!apiKey) {
      return { success: false, error: `API key not configured for provider: ${provider}` }
    }

    const ttsProvider = await createTTSProvider(provider, apiKey)
    const result = await ttsProvider.generateSpeech(sampleText, { voiceId })

    return {
      success: true,
      durationMs: result.durationMs,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test STT configuration by transcribing a sample audio
 */
export async function testSTTConfig(
  tenantId: string,
  provider: STTProviderType,
  audioUrl: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const credentials = await getVoiceCredentials(tenantId)
    if (!credentials) {
      return { success: false, error: 'Voice credentials not configured' }
    }

    const apiKey = getProviderApiKey(provider, credentials)
    if (!apiKey) {
      return { success: false, error: `API key not configured for provider: ${provider}` }
    }

    const sttProvider = await createSTTProvider(provider, apiKey)
    const result = await sttProvider.transcribeFile(audioUrl)

    return {
      success: true,
      text: result.text,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Estimate monthly cost for voice usage
 */
export function estimateMonthlyVoiceCost(params: {
  ttsProvider: TTSProviderType
  sttProvider: STTProviderType
  estimatedTTSCharacters: number
  estimatedSTTMinutes: number
}): {
  ttsCost: number
  sttCost: number
  totalCost: number
} {
  const ttsRates: Record<TTSProviderType, number> = {
    elevenlabs: 5 / 100000, // $5 per 100k chars
    openai: 15 / 1000000, // $15 per 1M chars
    google: 16 / 1000000, // $16 per 1M chars (Neural2)
  }

  const sttRates: Record<STTProviderType, number> = {
    assemblyai: 0.37, // $0.37 per minute
    whisper: 0.006, // $0.006 per minute
    google: 0.024, // $0.024 per minute
  }

  const ttsCost = params.estimatedTTSCharacters * ttsRates[params.ttsProvider]
  const sttCost = params.estimatedSTTMinutes * sttRates[params.sttProvider]

  return {
    ttsCost: Math.round(ttsCost * 100) / 100,
    sttCost: Math.round(sttCost * 100) / 100,
    totalCost: Math.round((ttsCost + sttCost) * 100) / 100,
  }
}

/**
 * Get provider API key from credentials
 */
function getProviderApiKey(
  provider: TTSProviderType | STTProviderType,
  credentials: {
    elevenlabsApiKeyEncrypted: string | null
    assemblyaiApiKeyEncrypted: string | null
    openaiApiKeyEncrypted: string | null
    retellApiKeyEncrypted: string | null
    googleServiceAccountEncrypted: string | null
  }
): string | null {
  switch (provider) {
    case 'elevenlabs':
      return credentials.elevenlabsApiKeyEncrypted
    case 'assemblyai':
      return credentials.assemblyaiApiKeyEncrypted
    case 'openai':
    case 'whisper':
      return credentials.openaiApiKeyEncrypted
    case 'google':
      return credentials.googleServiceAccountEncrypted
    default:
      return null
  }
}

/**
 * Validate voice configuration
 */
export function validateVoiceConfig(config: Partial<AgentVoiceConfig>): string[] {
  const errors: string[] = []

  // Validate speaking rate
  if (config.speakingRate !== undefined) {
    if (config.speakingRate < 0.5 || config.speakingRate > 2.0) {
      errors.push('Speaking rate must be between 0.5 and 2.0')
    }
  }

  // Validate pitch
  if (config.pitch !== undefined) {
    if (config.pitch < -20 || config.pitch > 20) {
      errors.push('Pitch must be between -20 and 20')
    }
  }

  // Validate volume gain
  if (config.volumeGainDb !== undefined) {
    if (config.volumeGainDb < -96 || config.volumeGainDb > 16) {
      errors.push('Volume gain must be between -96 and 16 dB')
    }
  }

  // Validate max call duration
  if (config.maxCallDurationMinutes !== undefined) {
    if (config.maxCallDurationMinutes < 1 || config.maxCallDurationMinutes > 120) {
      errors.push('Max call duration must be between 1 and 120 minutes')
    }
  }

  // Validate phone number format (basic E.164 check)
  if (config.phoneNumber) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(config.phoneNumber)) {
      errors.push('Phone number must be in E.164 format (e.g., +15551234567)')
    }
  }

  return errors
}

/**
 * Default voice configuration values
 */
export const DEFAULT_VOICE_CONFIG: Partial<CreateVoiceConfigInput> = {
  ttsProvider: 'elevenlabs',
  sttProvider: 'assemblyai',
  sttLanguage: 'en',
  speakingRate: 1.0,
  pitch: 0.0,
  volumeGainDb: 0.0,
  voicemailEnabled: true,
  maxCallDurationMinutes: 30,
}
