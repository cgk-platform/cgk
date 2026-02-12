/**
 * Transcription Provider Factory
 *
 * Provider-agnostic factory for easy swapping between:
 * - AssemblyAI (recommended)
 * - Deepgram
 * - Gladia
 *
 * @ai-pattern provider-factory
 */

import type { ITranscriptionProvider, TranscriptionProviderName } from '../types'
import { AssemblyAIProvider } from './assemblyai'

/**
 * Get the configured transcription provider
 *
 * Reads from TRANSCRIPTION_PROVIDER env var
 * Defaults to AssemblyAI if not set
 */
export function getTranscriptionProvider(): ITranscriptionProvider {
  const providerName = (
    process.env.TRANSCRIPTION_PROVIDER || 'assemblyai'
  ).toLowerCase() as TranscriptionProviderName

  switch (providerName) {
    case 'assemblyai':
      return new AssemblyAIProvider()

    case 'deepgram':
      // Deepgram provider not yet implemented
      console.warn('Deepgram provider not implemented, falling back to AssemblyAI')
      return new AssemblyAIProvider()

    case 'gladia':
      // Gladia provider not yet implemented
      console.warn('Gladia provider not implemented, falling back to AssemblyAI')
      return new AssemblyAIProvider()

    default:
      console.warn(`Unknown transcription provider: ${providerName}, falling back to AssemblyAI`)
      return new AssemblyAIProvider()
  }
}

/**
 * Get a specific provider by name
 */
export function getProvider(name: TranscriptionProviderName): ITranscriptionProvider {
  switch (name) {
    case 'assemblyai':
      return new AssemblyAIProvider()
    case 'deepgram':
    case 'gladia':
      // Fallback until other providers are implemented
      console.warn(`${name} provider not implemented, using AssemblyAI`)
      return new AssemblyAIProvider()
  }
}

/**
 * Check if a provider has its API key configured
 */
export function isProviderAvailable(name: TranscriptionProviderName): boolean {
  switch (name) {
    case 'assemblyai':
      return !!process.env.ASSEMBLYAI_API_KEY
    case 'deepgram':
      return !!process.env.DEEPGRAM_API_KEY
    case 'gladia':
      return !!process.env.GLADIA_API_KEY
    default:
      return false
  }
}

/**
 * List all available providers (have API keys configured)
 */
export function listAvailableProviders(): TranscriptionProviderName[] {
  const providers: TranscriptionProviderName[] = []

  if (isProviderAvailable('assemblyai')) providers.push('assemblyai')
  if (isProviderAvailable('deepgram')) providers.push('deepgram')
  if (isProviderAvailable('gladia')) providers.push('gladia')

  return providers
}

/**
 * Get the default provider name from environment
 */
export function getDefaultProviderName(): TranscriptionProviderName {
  const name = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase()
  if (name === 'assemblyai' || name === 'deepgram' || name === 'gladia') {
    return name
  }
  return 'assemblyai'
}
