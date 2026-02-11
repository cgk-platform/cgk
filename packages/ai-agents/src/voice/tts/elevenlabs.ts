/**
 * ElevenLabs TTS Provider Implementation
 *
 * Primary TTS provider for high-quality voice synthesis.
 * Supports voice cloning, multiple languages, and real-time streaming.
 *
 * Pricing: ~$5 per 100k characters
 */

import type { TTSOptions, TTSProviderType, TTSResult, Voice } from '../types.js'
import { BaseTTSProvider } from './provider.js'

interface ElevenLabsVoice {
  voice_id: string
  name: string
  labels?: {
    gender?: string
    accent?: string
    description?: string
    age?: string
    use_case?: string
  }
  preview_url?: string
  category?: string
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[]
}

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'
const MAX_TEXT_LENGTH = 5000 // ElevenLabs max per request

export class ElevenLabsTTS extends BaseTTSProvider {
  name: TTSProviderType = 'elevenlabs'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required')
    }
    this.apiKey = apiKey
  }

  async generateSpeech(text: string, options: TTSOptions): Promise<TTSResult> {
    this.validateText(text, MAX_TEXT_LENGTH)

    const voiceId = options.voiceId
    if (!voiceId) {
      throw new Error('Voice ID is required for ElevenLabs TTS')
    }

    const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: options.model || 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    return {
      audioBuffer,
      durationMs: this.estimateDuration(text),
      characterCount: text.length,
      provider: 'elevenlabs',
    }
  }

  async getVoices(): Promise<Voice[]> {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch ElevenLabs voices: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as ElevenLabsVoicesResponse

    return data.voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      gender: this.parseGender(voice.labels?.gender),
      language: 'en',
      accent: voice.labels?.accent,
      previewUrl: voice.preview_url,
      provider: 'elevenlabs' as const,
    }))
  }

  estimateCost(text: string): number {
    // ElevenLabs pricing: ~$5 per 100k characters
    return (text.length / 100000) * 5
  }

  private parseGender(gender?: string): 'male' | 'female' | 'neutral' {
    if (!gender) return 'neutral'
    const lower = gender.toLowerCase()
    if (lower.includes('male') && !lower.includes('female')) return 'male'
    if (lower.includes('female')) return 'female'
    return 'neutral'
  }
}

/**
 * ElevenLabs voice presets for quick selection
 */
export const ELEVENLABS_PRESET_VOICES = {
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'American female, calm and professional',
  },
  drew: {
    id: '29vD33N1CtxCmqQRPOHJ',
    name: 'Drew',
    description: 'American male, confident and friendly',
  },
  clyde: {
    id: '2EiwWnXFnvU5JabPnv8n',
    name: 'Clyde',
    description: 'American male, deep and authoritative',
  },
  paul: {
    id: '5Q0t7uMcjvnagumLfvZi',
    name: 'Paul',
    description: 'American male, warm and conversational',
  },
  domi: {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    description: 'American female, strong and confident',
  },
  bella: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'American female, soft and soothing',
  },
  antoni: {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'American male, friendly and expressive',
  },
  elli: {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'American female, young and energetic',
  },
  josh: {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'American male, young and dynamic',
  },
  arnold: {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'American male, gravelly and distinctive',
  },
  sam: {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'American male, raspy and authentic',
  },
} as const
