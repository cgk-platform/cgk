/**
 * Abstract TTS Provider Interface
 *
 * All TTS implementations must follow this contract.
 * The factory function creates providers based on configuration.
 */

import type { TTSOptions, TTSProvider, TTSProviderType, TTSResult, Voice } from '../types.js'

/**
 * Create a TTS provider instance based on type
 */
export async function createTTSProvider(
  type: TTSProviderType,
  apiKey: string
): Promise<TTSProvider> {
  switch (type) {
    case 'elevenlabs': {
      const { ElevenLabsTTS } = await import('./elevenlabs.js')
      return new ElevenLabsTTS(apiKey)
    }
    case 'openai': {
      const { OpenAITTS } = await import('./openai.js')
      return new OpenAITTS(apiKey)
    }
    case 'google': {
      const { GoogleTTS } = await import('./google.js')
      return new GoogleTTS(apiKey)
    }
    default:
      throw new Error(`Unknown TTS provider type: ${type}`)
  }
}

/**
 * Generate speech with fallback support
 */
export async function generateSpeechWithFallback(
  text: string,
  options: TTSOptions,
  primaryProvider: TTSProvider,
  fallbackProvider?: TTSProvider
): Promise<TTSResult> {
  try {
    return await primaryProvider.generateSpeech(text, options)
  } catch (error) {
    if (fallbackProvider) {
      console.warn(`Primary TTS provider ${primaryProvider.name} failed, using fallback:`, error)
      return await fallbackProvider.generateSpeech(text, options)
    }
    throw error
  }
}

/**
 * Estimate total cost for multiple TTS operations
 */
export function estimateTotalTTSCost(texts: string[], provider: TTSProvider): number {
  return texts.reduce((total, text) => total + provider.estimateCost(text), 0)
}

/**
 * Abstract base class with common TTS functionality
 */
export abstract class BaseTTSProvider implements TTSProvider {
  abstract name: TTSProviderType
  abstract generateSpeech(text: string, options: TTSOptions): Promise<TTSResult>
  abstract getVoices(): Promise<Voice[]>
  abstract estimateCost(text: string): number

  /**
   * Estimate duration based on text length
   * Average speaking rate: ~150 words per minute
   */
  protected estimateDuration(text: string): number {
    const words = text.split(/\s+/).length
    return Math.round((words / 150) * 60 * 1000)
  }

  /**
   * Validate text before synthesis
   */
  protected validateText(text: string, maxLength: number): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for speech synthesis')
    }
    if (text.length > maxLength) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`)
    }
  }
}
