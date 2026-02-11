/**
 * OpenAI TTS Provider Implementation
 *
 * Fallback TTS provider with good quality and simple API.
 * Supports multiple voices and models.
 *
 * Pricing: ~$15 per 1M characters (tts-1), ~$30 per 1M characters (tts-1-hd)
 */

import type { TTSOptions, TTSProviderType, TTSResult, Voice } from '../types.js'
import { BaseTTSProvider } from './provider.js'

const OPENAI_API_BASE = 'https://api.openai.com/v1'
const MAX_TEXT_LENGTH = 4096 // OpenAI TTS max per request

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
type OpenAIModel = 'tts-1' | 'tts-1-hd'

export class OpenAITTS extends BaseTTSProvider {
  name: TTSProviderType = 'openai'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }
    this.apiKey = apiKey
  }

  async generateSpeech(text: string, options: TTSOptions): Promise<TTSResult> {
    this.validateText(text, MAX_TEXT_LENGTH)

    const voice = (options.voiceId as OpenAIVoice) || 'alloy'
    const model: OpenAIModel = (options.model as OpenAIModel) || 'tts-1'

    const response = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: 'mp3',
        speed: options.speakingRate || 1.0,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI TTS failed: ${response.status} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    return {
      audioBuffer,
      durationMs: this.estimateDuration(text),
      characterCount: text.length,
      provider: 'openai',
    }
  }

  async getVoices(): Promise<Voice[]> {
    // OpenAI has a fixed set of voices
    return OPENAI_VOICES.map((voice) => ({
      ...voice,
      provider: 'openai' as const,
    }))
  }

  estimateCost(text: string): number {
    // OpenAI TTS-1 pricing: ~$15 per 1M characters
    return (text.length / 1000000) * 15
  }
}

/**
 * OpenAI's available voices
 */
export const OPENAI_VOICES: Omit<Voice, 'provider'>[] = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'neutral',
    language: 'en',
    accent: 'American',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'male',
    language: 'en',
    accent: 'American',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'neutral',
    language: 'en',
    accent: 'British',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'male',
    language: 'en',
    accent: 'American',
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'female',
    language: 'en',
    accent: 'American',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'female',
    language: 'en',
    accent: 'American',
  },
]

/**
 * OpenAI voice descriptions for UI
 */
export const OPENAI_VOICE_DESCRIPTIONS: Record<OpenAIVoice, string> = {
  alloy: 'Balanced and neutral, great for general use',
  echo: 'Warm male voice, conversational tone',
  fable: 'Expressive British accent, good for storytelling',
  onyx: 'Deep male voice, authoritative and professional',
  nova: 'Friendly female voice, clear and engaging',
  shimmer: 'Soft female voice, calm and soothing',
}
