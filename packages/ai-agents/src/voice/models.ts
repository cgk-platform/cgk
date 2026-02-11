/**
 * Voice Models and Provider Information
 *
 * Centralized reference for available voice models, supported languages,
 * and provider capabilities.
 */

import type { TTSProviderType, STTProviderType, VoiceCallProvider } from './types.js'

// ============================================================================
// TTS Provider Information
// ============================================================================

export interface TTSProviderInfo {
  id: TTSProviderType
  name: string
  description: string
  pricing: string
  features: string[]
  maxTextLength: number
  supportsStreaming: boolean
  supportsVoiceCloning: boolean
}

export const TTS_PROVIDERS: TTSProviderInfo[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Industry-leading voice synthesis with natural, expressive voices',
    pricing: '$5 per 100k characters',
    features: [
      'Ultra-realistic voices',
      'Voice cloning',
      'Multilingual support',
      'Streaming audio',
      'Custom voice design',
    ],
    maxTextLength: 5000,
    supportsStreaming: true,
    supportsVoiceCloning: true,
  },
  {
    id: 'openai',
    name: 'OpenAI TTS',
    description: 'High-quality, cost-effective text-to-speech',
    pricing: '$15 per 1M characters',
    features: [
      'Natural sounding voices',
      'Fast generation',
      'Multiple voices',
      'Adjustable speed',
    ],
    maxTextLength: 4096,
    supportsStreaming: true,
    supportsVoiceCloning: false,
  },
  {
    id: 'google',
    name: 'Google Cloud TTS',
    description: 'Reliable, scalable text-to-speech with many voice options',
    pricing: '$4-16 per 1M characters',
    features: [
      'Wide language support',
      'WaveNet/Neural2 voices',
      'SSML support',
      'Adjustable pitch/speed',
    ],
    maxTextLength: 5000,
    supportsStreaming: false,
    supportsVoiceCloning: false,
  },
]

// ============================================================================
// STT Provider Information
// ============================================================================

export interface STTProviderInfo {
  id: STTProviderType
  name: string
  description: string
  pricing: string
  features: string[]
  supportsRealtime: boolean
  supportsSpeakerDiarization: boolean
}

export const STT_PROVIDERS: STTProviderInfo[] = [
  {
    id: 'assemblyai',
    name: 'AssemblyAI',
    description: 'Best-in-class accuracy with real-time transcription',
    pricing: '$0.37 per minute',
    features: [
      'Real-time transcription',
      'Speaker diarization',
      'Punctuation & formatting',
      'Custom vocabulary',
      'Sentiment analysis',
    ],
    supportsRealtime: true,
    supportsSpeakerDiarization: true,
  },
  {
    id: 'whisper',
    name: 'OpenAI Whisper',
    description: 'Cost-effective, accurate batch transcription',
    pricing: '$0.006 per minute',
    features: [
      'High accuracy',
      'Multilingual support',
      'Automatic language detection',
      'Simple API',
    ],
    supportsRealtime: false,
    supportsSpeakerDiarization: false,
  },
  {
    id: 'google',
    name: 'Google Cloud STT',
    description: 'Scalable speech recognition with streaming support',
    pricing: '$0.024 per minute',
    features: [
      'Real-time streaming (gRPC)',
      'Speaker diarization',
      'Automatic punctuation',
      'Word-level timestamps',
    ],
    supportsRealtime: true,
    supportsSpeakerDiarization: true,
  },
]

// ============================================================================
// Voice Call Provider Information
// ============================================================================

export interface VoiceCallProviderInfo {
  id: VoiceCallProvider
  name: string
  description: string
  features: string[]
  requiresCustomLLM: boolean
}

export const VOICE_CALL_PROVIDERS: VoiceCallProviderInfo[] = [
  {
    id: 'retell',
    name: 'Retell.ai',
    description: 'Purpose-built AI voice agent platform',
    features: [
      'Built-in LLM integration',
      'Real-time transcription',
      'Call analysis',
      'Voicemail detection',
      'Call recording',
    ],
    requiresCustomLLM: false,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Flexible telephony platform for custom integrations',
    features: [
      'Full telephony control',
      'TwiML flexibility',
      'Phone number management',
      'Call recording',
      'Conference calls',
    ],
    requiresCustomLLM: true,
  },
]

// ============================================================================
// Language Support
// ============================================================================

export interface LanguageOption {
  code: string
  name: string
  tts: TTSProviderType[]
  stt: STTProviderType[]
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)', tts: ['elevenlabs', 'openai', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'en-GB', name: 'English (UK)', tts: ['elevenlabs', 'openai', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'es-ES', name: 'Spanish (Spain)', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'es-MX', name: 'Spanish (Mexico)', tts: ['google'], stt: ['whisper', 'google'] },
  { code: 'fr-FR', name: 'French', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'de-DE', name: 'German', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'it-IT', name: 'Italian', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'nl-NL', name: 'Dutch', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'pl-PL', name: 'Polish', tts: ['elevenlabs', 'google'], stt: ['assemblyai', 'whisper', 'google'] },
  { code: 'ja-JP', name: 'Japanese', tts: ['google'], stt: ['whisper', 'google'] },
  { code: 'ko-KR', name: 'Korean', tts: ['google'], stt: ['whisper', 'google'] },
  { code: 'zh-CN', name: 'Chinese (Simplified)', tts: ['google'], stt: ['whisper', 'google'] },
  { code: 'hi-IN', name: 'Hindi', tts: ['google'], stt: ['whisper', 'google'] },
  { code: 'ar-SA', name: 'Arabic', tts: ['google'], stt: ['whisper', 'google'] },
]

// ============================================================================
// Provider Recommendations
// ============================================================================

export interface UseCaseRecommendation {
  useCase: string
  ttsProvider: TTSProviderType
  sttProvider: STTProviderType
  callProvider: VoiceCallProvider
  reason: string
}

export const PROVIDER_RECOMMENDATIONS: UseCaseRecommendation[] = [
  {
    useCase: 'Customer Support Calls',
    ttsProvider: 'elevenlabs',
    sttProvider: 'assemblyai',
    callProvider: 'retell',
    reason: 'Best voice quality for customer interactions with accurate real-time transcription',
  },
  {
    useCase: 'High Volume Outreach',
    ttsProvider: 'openai',
    sttProvider: 'whisper',
    callProvider: 'retell',
    reason: 'Cost-effective for large scale with good quality',
  },
  {
    useCase: 'Custom Call Flows',
    ttsProvider: 'google',
    sttProvider: 'google',
    callProvider: 'twilio',
    reason: 'Maximum flexibility with TwiML and programmatic control',
  },
  {
    useCase: 'Multilingual Support',
    ttsProvider: 'google',
    sttProvider: 'whisper',
    callProvider: 'retell',
    reason: 'Widest language support across providers',
  },
  {
    useCase: 'Premium Brand Experience',
    ttsProvider: 'elevenlabs',
    sttProvider: 'assemblyai',
    callProvider: 'retell',
    reason: 'Highest quality voices with voice cloning capability',
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get provider info by ID
 */
export function getTTSProviderInfo(id: TTSProviderType): TTSProviderInfo | undefined {
  return TTS_PROVIDERS.find((p) => p.id === id)
}

export function getSTTProviderInfo(id: STTProviderType): STTProviderInfo | undefined {
  return STT_PROVIDERS.find((p) => p.id === id)
}

export function getVoiceCallProviderInfo(id: VoiceCallProvider): VoiceCallProviderInfo | undefined {
  return VOICE_CALL_PROVIDERS.find((p) => p.id === id)
}

/**
 * Get providers that support a specific language
 */
export function getProvidersForLanguage(languageCode: string): {
  tts: TTSProviderType[]
  stt: STTProviderType[]
} {
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode)
  if (!language) {
    return { tts: [], stt: [] }
  }
  return { tts: language.tts, stt: language.stt }
}

/**
 * Get recommendation for a use case
 */
export function getRecommendationForUseCase(useCase: string): UseCaseRecommendation | undefined {
  return PROVIDER_RECOMMENDATIONS.find(
    (r) => r.useCase.toLowerCase() === useCase.toLowerCase()
  )
}

/**
 * Check if a provider supports real-time transcription
 */
export function supportsRealtime(provider: STTProviderType): boolean {
  const info = getSTTProviderInfo(provider)
  return info?.supportsRealtime ?? false
}

/**
 * Check if a provider supports voice cloning
 */
export function supportsVoiceCloning(provider: TTSProviderType): boolean {
  const info = getTTSProviderInfo(provider)
  return info?.supportsVoiceCloning ?? false
}
