/**
 * Voice system type definitions for AI Agents
 *
 * @ai-pattern tenant-isolation
 * @ai-required All voice operations must include tenantId
 */

// ============================================================================
// Provider Types
// ============================================================================

export type TTSProviderType = 'elevenlabs' | 'openai' | 'google'
export type STTProviderType = 'assemblyai' | 'whisper' | 'google'
export type VoiceCallProvider = 'retell' | 'twilio'

// ============================================================================
// TTS Types
// ============================================================================

export interface TTSOptions {
  voiceId: string
  speakingRate?: number
  pitch?: number
  volumeGainDb?: number
  model?: string
}

export interface TTSResult {
  audioBuffer: Buffer
  audioUrl?: string
  durationMs: number
  characterCount: number
  provider: TTSProviderType
}

export interface Voice {
  id: string
  name: string
  gender: 'male' | 'female' | 'neutral'
  language: string
  accent?: string
  previewUrl?: string
  provider: TTSProviderType
}

export interface TTSProvider {
  name: TTSProviderType
  generateSpeech(text: string, options: TTSOptions): Promise<TTSResult>
  getVoices(): Promise<Voice[]>
  estimateCost(text: string): number
}

// ============================================================================
// STT Types
// ============================================================================

export interface STTOptions {
  language?: string
  model?: string
  speakerLabels?: boolean
}

export interface RealtimeSTTOptions extends STTOptions {
  sampleRate?: number
  encoding?: 'pcm_s16le' | 'pcm_mulaw'
  onTranscript: (transcript: TranscriptSegment) => void
  onError?: (error: Error) => void
}

export interface TranscriptSegment {
  text: string
  isFinal: boolean
  confidence?: number
  startTime?: number
  endTime?: number
  speaker?: string
}

export interface Transcription {
  text: string
  speakers?: SpeakerSegment[]
  confidence?: number
  durationMs?: number
}

export interface SpeakerSegment {
  speaker: string
  text: string
  start: number
  end: number
  confidence?: number
}

export interface RealtimeTranscriberHandle {
  sendAudio(audioData: Buffer): void
  close(): Promise<void>
}

export interface STTProvider {
  name: STTProviderType
  transcribeFile(audioUrl: string, options?: STTOptions): Promise<Transcription>
  transcribeRealtime(options: RealtimeSTTOptions): Promise<RealtimeTranscriberHandle>
  estimateCost(durationSeconds: number): number
}

// ============================================================================
// Voice Configuration
// ============================================================================

export interface AgentVoiceConfig {
  id: string
  tenantId: string
  agentId: string
  // TTS Settings
  ttsProvider: TTSProviderType
  ttsVoiceId: string | null
  ttsVoiceName: string | null
  ttsFallbackProvider: TTSProviderType | null
  // STT Settings
  sttProvider: STTProviderType
  sttLanguage: string
  sttModel: string | null
  // Voice characteristics
  speakingRate: number
  pitch: number
  volumeGainDb: number
  // Call settings
  phoneNumber: string | null
  voicemailEnabled: boolean
  voicemailGreeting: string | null
  maxCallDurationMinutes: number
  // Provider-specific IDs
  retellAgentId: string | null
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface CreateVoiceConfigInput {
  agentId: string
  ttsProvider?: TTSProviderType
  ttsVoiceId?: string
  ttsVoiceName?: string
  ttsFallbackProvider?: TTSProviderType
  sttProvider?: STTProviderType
  sttLanguage?: string
  sttModel?: string
  speakingRate?: number
  pitch?: number
  volumeGainDb?: number
  phoneNumber?: string
  voicemailEnabled?: boolean
  voicemailGreeting?: string
  maxCallDurationMinutes?: number
}

export interface UpdateVoiceConfigInput {
  ttsProvider?: TTSProviderType
  ttsVoiceId?: string | null
  ttsVoiceName?: string | null
  ttsFallbackProvider?: TTSProviderType | null
  sttProvider?: STTProviderType
  sttLanguage?: string
  sttModel?: string | null
  speakingRate?: number
  pitch?: number
  volumeGainDb?: number
  phoneNumber?: string | null
  voicemailEnabled?: boolean
  voicemailGreeting?: string | null
  maxCallDurationMinutes?: number
  retellAgentId?: string | null
}

// ============================================================================
// Voice Call Types
// ============================================================================

export type VoiceCallStatus =
  | 'initiated'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'voicemail'
  | 'missed'
  | 'cancelled'

export type VoiceCallDirection = 'inbound' | 'outbound'

export type CallSentiment = 'positive' | 'neutral' | 'negative'

export interface VoiceCall {
  id: string
  tenantId: string
  agentId: string
  // Call identifiers
  callSid: string
  provider: VoiceCallProvider
  // Call details
  direction: VoiceCallDirection
  fromNumber: string | null
  toNumber: string | null
  callerName: string | null
  // Status
  status: VoiceCallStatus
  startedAt: Date
  answeredAt: Date | null
  endedAt: Date | null
  durationSeconds: number | null
  // Related entities
  creatorId: string | null
  contactId: string | null
  // Recording
  recordingUrl: string | null
  recordingDurationSeconds: number | null
  // Summary (generated after call)
  summary: string | null
  sentiment: CallSentiment | null
  actionItems: ActionItem[]
  // Timestamps
  createdAt: Date
}

export interface ActionItem {
  description: string
  completed: boolean
  dueDate?: string
  assignee?: string
}

export interface CreateVoiceCallInput {
  agentId: string
  callSid: string
  provider: VoiceCallProvider
  direction: VoiceCallDirection
  fromNumber?: string
  toNumber?: string
  callerName?: string
  creatorId?: string
  contactId?: string
}

export interface UpdateVoiceCallInput {
  status?: VoiceCallStatus
  answeredAt?: Date
  endedAt?: Date
  durationSeconds?: number
  recordingUrl?: string
  recordingDurationSeconds?: number
  summary?: string
  sentiment?: CallSentiment
  actionItems?: ActionItem[]
}

// ============================================================================
// Transcript Types
// ============================================================================

export type TranscriptSpeaker = 'agent' | 'caller' | 'system'

export interface VoiceTranscript {
  id: string
  tenantId: string
  callId: string
  // Transcript entry
  speaker: TranscriptSpeaker
  speakerName: string | null
  text: string
  confidence: number | null
  // Timing
  startedAt: Date
  endedAt: Date | null
  durationMs: number | null
  // Whether this is final or interim
  isFinal: boolean
  // Timestamps
  createdAt: Date
}

export interface CreateTranscriptInput {
  callId: string
  speaker: TranscriptSpeaker
  speakerName?: string
  text: string
  confidence?: number
  startedAt: Date
  endedAt?: Date
  durationMs?: number
  isFinal?: boolean
}

// ============================================================================
// Voice Response Types
// ============================================================================

export interface VoiceResponse {
  id: string
  tenantId: string
  callId: string
  // Response details
  responseText: string
  sourceTranscript: string | null
  toolsUsed: string[]
  // Audio
  audioUrl: string | null
  audioDurationMs: number | null
  // Timestamps
  createdAt: Date
}

export interface CreateVoiceResponseInput {
  callId: string
  responseText: string
  sourceTranscript?: string
  toolsUsed?: string[]
  audioUrl?: string
  audioDurationMs?: number
}

// ============================================================================
// Tenant Voice Credentials
// ============================================================================

export interface TenantVoiceCredentials {
  id: string
  tenantId: string
  // Provider API keys (encrypted)
  elevenlabsApiKeyEncrypted: string | null
  assemblyaiApiKeyEncrypted: string | null
  openaiApiKeyEncrypted: string | null
  retellApiKeyEncrypted: string | null
  retellPhoneNumber: string | null
  googleServiceAccountEncrypted: string | null
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface UpdateVoiceCredentialsInput {
  elevenlabsApiKey?: string | null
  assemblyaiApiKey?: string | null
  openaiApiKey?: string | null
  retellApiKey?: string | null
  retellPhoneNumber?: string | null
  googleServiceAccount?: string | null
}

// ============================================================================
// Voice Call Session Types (for real-time)
// ============================================================================

export interface VoiceCallSession {
  callId: string
  agentId: string
  tenantId: string
  callSid: string
  voiceConfig: AgentVoiceConfig
  conversationHistory: ConversationTurn[]
  isActive: boolean
  startedAt: Date
}

export interface ConversationTurn {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface RetellWebhookEvent {
  event:
    | 'call_started'
    | 'call_ended'
    | 'call_analyzed'
    | 'transcript'
    | 'recording_ready'
  call_id: string
  agent_id?: string
  call_duration?: number
  recording_url?: string
  call_analysis?: {
    call_summary?: string
    agent_sentiment?: CallSentiment
    customer_sentiment?: CallSentiment
    action_items?: string[]
  }
  transcript?: {
    role: 'agent' | 'user'
    content: string
    timestamp: number
  }[]
}

// ============================================================================
// Voice Call Filters
// ============================================================================

export interface VoiceCallFilters {
  agentId?: string
  direction?: VoiceCallDirection
  status?: VoiceCallStatus
  creatorId?: string
  contactId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ============================================================================
// Voice Statistics
// ============================================================================

export interface VoiceCallStats {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  avgDurationSeconds: number
  totalDurationSeconds: number
  inboundCalls: number
  outboundCalls: number
  positiveCallPercent: number
  negativeCallPercent: number
}
