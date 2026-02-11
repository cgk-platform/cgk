/**
 * Google Cloud TTS Provider Implementation
 *
 * Alternative TTS provider with many voice options and stable API.
 * Best for bulk/batch processing with good cost efficiency.
 *
 * Pricing: ~$4 per 1M characters (Standard), ~$16 per 1M characters (WaveNet/Neural2)
 */

import type { TTSOptions, TTSProviderType, TTSResult, Voice } from '../types.js'
import { BaseTTSProvider } from './provider.js'

const GOOGLE_TTS_API_BASE = 'https://texttospeech.googleapis.com/v1'
const MAX_TEXT_LENGTH = 5000 // Google Cloud TTS max per request

interface GoogleVoice {
  name: string
  languageCodes: string[]
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL'
  naturalSampleRateHertz: number
}

interface GoogleVoicesResponse {
  voices: GoogleVoice[]
}

interface GoogleSynthesizeResponse {
  audioContent: string // Base64 encoded audio
}

export class GoogleTTS extends BaseTTSProvider {
  name: TTSProviderType = 'google'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('Google Cloud API key is required')
    }
    this.apiKey = apiKey
  }

  async generateSpeech(text: string, options: TTSOptions): Promise<TTSResult> {
    this.validateText(text, MAX_TEXT_LENGTH)

    const voiceName = options.voiceId || 'en-US-Neural2-A'
    const languageCode = voiceName.split('-').slice(0, 2).join('-')

    const response = await fetch(`${GOOGLE_TTS_API_BASE}/text:synthesize?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: options.speakingRate || 1.0,
          pitch: options.pitch || 0.0,
          volumeGainDb: options.volumeGainDb || 0.0,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google TTS failed: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as GoogleSynthesizeResponse
    const audioBuffer = Buffer.from(data.audioContent, 'base64')

    return {
      audioBuffer,
      durationMs: this.estimateDuration(text),
      characterCount: text.length,
      provider: 'google',
    }
  }

  async getVoices(): Promise<Voice[]> {
    const response = await fetch(`${GOOGLE_TTS_API_BASE}/voices?key=${this.apiKey}`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch Google voices: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as GoogleVoicesResponse

    return data.voices
      .filter((voice) => voice.languageCodes.some((code) => code.startsWith('en')))
      .map((voice) => ({
        id: voice.name,
        name: this.formatVoiceName(voice.name),
        gender: this.parseGender(voice.ssmlGender),
        language: voice.languageCodes[0] || 'en-US',
        provider: 'google' as const,
      }))
  }

  estimateCost(text: string): number {
    // Google Neural2 pricing: ~$16 per 1M characters
    // Standard pricing: ~$4 per 1M characters
    // Using Neural2 estimate as default
    return (text.length / 1000000) * 16
  }

  private formatVoiceName(voiceName: string): string {
    // Convert en-US-Neural2-A to Neural2 A (US)
    const parts = voiceName.split('-')
    if (parts.length >= 4) {
      const region = parts[1]
      const type = parts[2]
      const variant = parts[3]
      return `${type} ${variant} (${region})`
    }
    return voiceName
  }

  private parseGender(ssmlGender: string): 'male' | 'female' | 'neutral' {
    switch (ssmlGender) {
      case 'MALE':
        return 'male'
      case 'FEMALE':
        return 'female'
      default:
        return 'neutral'
    }
  }
}

/**
 * Popular Google Cloud TTS voices for quick selection
 */
export const GOOGLE_PRESET_VOICES = {
  // Neural2 voices (highest quality)
  neural2A: {
    id: 'en-US-Neural2-A',
    name: 'Neural2 A (US)',
    description: 'Female, natural and expressive',
  },
  neural2C: {
    id: 'en-US-Neural2-C',
    name: 'Neural2 C (US)',
    description: 'Female, warm and conversational',
  },
  neural2D: {
    id: 'en-US-Neural2-D',
    name: 'Neural2 D (US)',
    description: 'Male, authoritative and clear',
  },
  neural2E: {
    id: 'en-US-Neural2-E',
    name: 'Neural2 E (US)',
    description: 'Female, professional and friendly',
  },
  neural2F: {
    id: 'en-US-Neural2-F',
    name: 'Neural2 F (US)',
    description: 'Female, youthful and energetic',
  },
  neural2G: {
    id: 'en-US-Neural2-G',
    name: 'Neural2 G (US)',
    description: 'Female, mature and sophisticated',
  },
  neural2H: {
    id: 'en-US-Neural2-H',
    name: 'Neural2 H (US)',
    description: 'Female, soft and calming',
  },
  neural2I: {
    id: 'en-US-Neural2-I',
    name: 'Neural2 I (US)',
    description: 'Male, friendly and approachable',
  },
  neural2J: {
    id: 'en-US-Neural2-J',
    name: 'Neural2 J (US)',
    description: 'Male, confident and professional',
  },
  // British voices
  gbNeural2A: {
    id: 'en-GB-Neural2-A',
    name: 'Neural2 A (GB)',
    description: 'Female, British accent',
  },
  gbNeural2B: {
    id: 'en-GB-Neural2-B',
    name: 'Neural2 B (GB)',
    description: 'Male, British accent',
  },
} as const
