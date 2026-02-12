/**
 * Transcription Provider Types
 * Shared types for transcription provider abstraction
 *
 * @ai-pattern transcription-types
 */

/**
 * Word with timestamp from transcription
 */
export interface TranscriptionWord {
  /** The transcribed word or punctuation */
  text: string
  /** Start time in milliseconds from video start */
  startMs: number
  /** End time in milliseconds */
  endMs: number
  /** Confidence score from 0 to 1 */
  confidence: number
  /** Speaker identifier if diarization enabled */
  speaker?: string
  /** Whether this is a filler word (um, uh, like, you know) */
  isFiller?: boolean
}

/**
 * Chapter generated from transcription or AI
 */
export interface TranscriptionChapter {
  /** Chapter headline/title */
  headline: string
  /** Brief summary of chapter content */
  summary: string
  /** Start time in milliseconds */
  startMs: number
  /** End time in milliseconds */
  endMs: number
}

/**
 * Transcription job status
 */
export type TranscriptionJobStatus = 'queued' | 'processing' | 'completed' | 'error'

/**
 * Transcription status for video record
 */
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Transcription options
 */
export interface TranscribeOptions {
  /** Language code (e.g., 'en', 'es', 'fr') - default 'en' */
  languageCode?: string
  /** Enable speaker diarization - default true */
  speakerDiarization?: boolean
  /** Maximum number of speakers expected */
  maxSpeakers?: number
  /** Enable auto-generated chapters - default true */
  autoChapters?: boolean
  /** Filter profanity - default false */
  filterProfanity?: boolean
  /** Detect filler words (um, uh, like, you know) - default true */
  detectFillers?: boolean
  /** Webhook URL for completion callback */
  webhookUrl?: string
}

/**
 * Transcription job info returned when starting transcription
 */
export interface TranscriptionJob {
  /** Provider-specific job ID */
  id: string
  /** Provider name */
  provider: string
  /** Current job status */
  status: TranscriptionJobStatus
}

/**
 * Full transcription result
 */
export interface TranscriptionResult {
  /** Full transcript text */
  text: string
  /** Word-level timestamps */
  words: TranscriptionWord[]
  /** Total duration in milliseconds */
  durationMs: number
  /** Overall confidence score from 0 to 1 */
  confidence: number
  /** Unique speaker labels if diarization enabled */
  speakers?: string[]
  /** Auto-generated chapters if enabled */
  chapters?: TranscriptionChapter[]
}

/**
 * Provider interface - all transcription providers must implement this
 */
export interface ITranscriptionProvider {
  /** Provider name identifier */
  name: string

  /**
   * Upload a file to the provider's servers
   * Use when source URL is not directly accessible
   * @returns URL to use for transcription
   */
  uploadFile?(fileBuffer: Buffer | ArrayBuffer): Promise<string>

  /**
   * Start a transcription job
   * @param audioUrl - URL of audio/video file to transcribe
   * @param options - Transcription configuration
   * @returns Job info with ID and initial status
   */
  transcribe(audioUrl: string, options?: TranscribeOptions): Promise<TranscriptionJob>

  /**
   * Get current job status
   * @param jobId - Provider-specific job ID
   * @returns Current status
   */
  getStatus(jobId: string): Promise<TranscriptionJobStatus>

  /**
   * Get completed transcription result
   * @param jobId - Provider-specific job ID
   * @returns Full transcription with words, chapters, etc.
   * @throws Error if transcription not complete
   */
  getResult(jobId: string): Promise<TranscriptionResult>
}

/**
 * Provider name enum
 */
export type TranscriptionProviderName = 'assemblyai' | 'deepgram' | 'gladia'

/**
 * AI-generated task/action item extracted from transcript
 */
export interface AITask {
  /** Task description */
  text: string
  /** Timestamp in seconds where task was mentioned (optional) */
  timestampSeconds?: number
  /** Whether task has been completed */
  completed: boolean
}

/**
 * AssemblyAI webhook payload
 */
export interface AssemblyAIWebhookPayload {
  transcript_id: string
  status: 'completed' | 'error'
  text?: string
  error?: string
}

/**
 * Video with transcription data
 */
export interface VideoWithTranscription {
  id: string
  tenantId: string
  title: string
  transcriptionStatus: TranscriptionStatus
  transcriptionJobId: string | null
  transcriptionText: string | null
  transcriptionWords: TranscriptionWord[] | null
  aiTitle: string | null
  aiSummary: string | null
  aiChapters: TranscriptionChapter[] | null
  aiTasks: AITask[] | null
}

/**
 * VTT/SRT caption format
 */
export type CaptionFormat = 'vtt' | 'srt'

/**
 * Caption export options
 */
export interface CaptionExportOptions {
  /** Output format - default 'vtt' */
  format?: CaptionFormat
  /** Max characters per line - default 42 */
  maxLineLength?: number
  /** Max lines per caption - default 2 */
  maxLines?: number
}
