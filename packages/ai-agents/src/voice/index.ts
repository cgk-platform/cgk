/**
 * Voice System for AI Agents
 *
 * Provides text-to-speech, speech-to-text, and voice call capabilities
 * for AI agents in the CGK platform.
 *
 * @ai-pattern tenant-isolation
 * @ai-required All voice operations must be tenant-scoped
 */

// Types
export type {
  // Provider types
  TTSProviderType,
  STTProviderType,
  VoiceCallProvider,
  // TTS types
  TTSOptions,
  TTSResult,
  TTSProvider,
  Voice,
  // STT types
  STTOptions,
  STTProvider,
  RealtimeSTTOptions,
  RealtimeTranscriberHandle,
  TranscriptSegment,
  Transcription,
  SpeakerSegment,
  // Voice config types
  AgentVoiceConfig,
  CreateVoiceConfigInput,
  UpdateVoiceConfigInput,
  // Voice call types
  VoiceCall,
  VoiceCallStatus,
  VoiceCallDirection,
  CallSentiment,
  CreateVoiceCallInput,
  UpdateVoiceCallInput,
  ActionItem,
  // Transcript types
  VoiceTranscript,
  TranscriptSpeaker,
  CreateTranscriptInput,
  // Voice response types
  VoiceResponse,
  CreateVoiceResponseInput,
  // Credentials types
  TenantVoiceCredentials,
  UpdateVoiceCredentialsInput,
  // Session types
  VoiceCallSession,
  ConversationTurn,
  // Webhook types
  RetellWebhookEvent,
  // Filter types
  VoiceCallFilters,
  VoiceCallStats,
} from './types.js'

// TTS Providers
export { createTTSProvider, generateSpeechWithFallback, BaseTTSProvider } from './tts/provider.js'
export { ElevenLabsTTS, ELEVENLABS_PRESET_VOICES } from './tts/elevenlabs.js'
export { OpenAITTS, OPENAI_VOICES, OPENAI_VOICE_DESCRIPTIONS } from './tts/openai.js'
export { GoogleTTS, GOOGLE_PRESET_VOICES } from './tts/google.js'

// STT Providers
export { createSTTProvider, transcribeWithFallback, BaseSTTProvider } from './stt/provider.js'
export { AssemblyAISTT, ASSEMBLYAI_LANGUAGES } from './stt/assemblyai.js'
export { WhisperSTT, WHISPER_LANGUAGES } from './stt/whisper.js'
export { GoogleSTT, GOOGLE_STT_LANGUAGES, GOOGLE_STT_MODELS } from './stt/google.js'

// Voice Calls
export {
  RetellVoiceCalls,
  createRetellClient,
  verifyRetellSignature,
  RETELL_PROVIDER,
} from './calls/retell.js'
export {
  TwilioVoiceCalls,
  createTwilioClient,
  verifyTwilioSignature,
  TWILIO_PROVIDER,
} from './calls/twilio.js'
export {
  createSession,
  getSession,
  getSessionBySid,
  addConversationTurn,
  getConversationHistory,
  endSession,
  listActiveSessions,
  listAgentSessions,
  getActiveSessionCount,
  cleanupStaleSessions,
  formatConversationForLLM,
  getSessionStats,
} from './calls/session.js'

// Configuration
export {
  getAgentVoiceConfig,
  createAgentVoiceConfig,
  updateAgentVoiceConfig,
  getAgentTTSProvider,
  getAgentSTTProvider,
  getAvailableVoices,
  testTTSConfig,
  testSTTConfig,
  estimateMonthlyVoiceCost,
  validateVoiceConfig,
  DEFAULT_VOICE_CONFIG,
} from './config.js'

// Models and Provider Info
export {
  TTS_PROVIDERS,
  STT_PROVIDERS,
  VOICE_CALL_PROVIDERS,
  SUPPORTED_LANGUAGES,
  PROVIDER_RECOMMENDATIONS,
  getTTSProviderInfo,
  getSTTProviderInfo,
  getVoiceCallProviderInfo,
  getProvidersForLanguage,
  getRecommendationForUseCase,
  supportsRealtime,
  supportsVoiceCloning,
  type TTSProviderInfo,
  type STTProviderInfo,
  type VoiceCallProviderInfo,
  type LanguageOption,
  type UseCaseRecommendation,
} from './models.js'

// Database queries
export {
  // Voice config queries
  getVoiceConfig,
  createVoiceConfig,
  updateVoiceConfig,
  // Voice call queries
  createVoiceCall,
  getVoiceCall,
  getVoiceCallBySid,
  updateVoiceCall,
  updateVoiceCallBySid,
  listVoiceCalls,
  getVoiceCallStats,
  // Transcript queries
  createTranscript,
  getCallTranscripts,
  getFullTranscriptText,
  // Voice response queries
  createVoiceResponse,
  getCallResponses,
  // Credentials queries
  getVoiceCredentials,
  updateVoiceCredentials,
} from './db/voice-queries.js'
