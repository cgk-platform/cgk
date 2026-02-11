/**
 * Abstract STT Provider Interface
 *
 * All STT implementations must follow this contract.
 * The factory function creates providers based on configuration.
 */

import type {
  RealtimeSTTOptions,
  RealtimeTranscriberHandle,
  STTOptions,
  STTProvider,
  STTProviderType,
  Transcription,
} from '../types.js'

/**
 * Create an STT provider instance based on type
 */
export async function createSTTProvider(
  type: STTProviderType,
  apiKey: string
): Promise<STTProvider> {
  switch (type) {
    case 'assemblyai': {
      const { AssemblyAISTT } = await import('./assemblyai.js')
      return new AssemblyAISTT(apiKey)
    }
    case 'whisper': {
      const { WhisperSTT } = await import('./whisper.js')
      return new WhisperSTT(apiKey)
    }
    case 'google': {
      const { GoogleSTT } = await import('./google.js')
      return new GoogleSTT(apiKey)
    }
    default:
      throw new Error(`Unknown STT provider type: ${type}`)
  }
}

/**
 * Transcribe with fallback support
 */
export async function transcribeWithFallback(
  audioUrl: string,
  options: STTOptions,
  primaryProvider: STTProvider,
  fallbackProvider?: STTProvider
): Promise<Transcription> {
  try {
    return await primaryProvider.transcribeFile(audioUrl, options)
  } catch (error) {
    if (fallbackProvider) {
      console.warn(`Primary STT provider ${primaryProvider.name} failed, using fallback:`, error)
      return await fallbackProvider.transcribeFile(audioUrl, options)
    }
    throw error
  }
}

/**
 * Estimate total cost for multiple STT operations
 */
export function estimateTotalSTTCost(durationSeconds: number[], provider: STTProvider): number {
  return durationSeconds.reduce((total, duration) => total + provider.estimateCost(duration), 0)
}

/**
 * Abstract base class with common STT functionality
 */
export abstract class BaseSTTProvider implements STTProvider {
  abstract name: STTProviderType
  abstract transcribeFile(audioUrl: string, options?: STTOptions): Promise<Transcription>
  abstract transcribeRealtime(options: RealtimeSTTOptions): Promise<RealtimeTranscriberHandle>
  abstract estimateCost(durationSeconds: number): number

  /**
   * Validate audio URL
   */
  protected validateAudioUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new Error('Audio URL is required for transcription')
    }
    try {
      new URL(url)
    } catch {
      throw new Error('Invalid audio URL format')
    }
  }

  /**
   * Normalize language code to common format
   */
  protected normalizeLanguageCode(language?: string): string {
    if (!language) return 'en-US'
    // Convert 'en' to 'en-US', 'en_US' to 'en-US', etc.
    const normalized = language.replace('_', '-')
    if (normalized.length === 2) {
      return `${normalized}-${normalized.toUpperCase()}`
    }
    return normalized
  }
}
