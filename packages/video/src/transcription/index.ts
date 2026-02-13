/**
 * @cgk-platform/video/transcription - Video Transcription Module
 *
 * Provides:
 * - AssemblyAI integration for transcription
 * - Word-level timestamps with speaker diarization
 * - Auto-generated chapters
 * - VTT/SRT caption generation
 * - Database operations with tenant isolation
 *
 * @ai-pattern transcription-module
 */

// Types
export type {
  TranscriptionWord,
  TranscriptionChapter,
  TranscriptionJobStatus,
  TranscriptionStatus,
  TranscribeOptions,
  TranscriptionJob,
  TranscriptionResult,
  ITranscriptionProvider,
  TranscriptionProviderName,
  AITask,
  AssemblyAIWebhookPayload,
  VideoWithTranscription,
  CaptionFormat,
  CaptionExportOptions,
} from './types'

// Providers
export {
  AssemblyAIProvider,
  verifyAssemblyAIWebhookSignature,
  getTranscriptionProvider,
  getProvider,
  isProviderAvailable,
  listAvailableProviders,
  getDefaultProviderName,
} from './providers'

// Database operations
export {
  getVideoTranscription,
  startTranscription,
  saveTranscriptionResult,
  failTranscription,
  resetTranscription,
  saveAIContent,
  updateTaskCompletion,
  getVideosPendingTranscription,
  getVideosReadyForTranscription,
  searchVideosByTranscript,
  getVideoByTranscriptionJobId,
} from './db'

// Caption generation
export {
  generateVtt,
  generateSrt,
  generateCaptions,
  getCaptionContentType,
  getCaptionExtension,
} from './captions'
