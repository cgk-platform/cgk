/**
 * Video Transcription Background Jobs
 *
 * Handles:
 * - Starting transcription jobs
 * - Processing transcription results
 * - AI content generation
 * - Sync schedule for stuck jobs
 *
 * NOTE: These jobs require the @cgk-platform/video package to be implemented.
 * Currently stubbed to allow build to pass.
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always include tenantId in payloads
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'

// Job Payload Types
export interface VideoTranscriptionPayload {
  tenantId: string
  videoId: string
  playbackId: string
}

export interface AIContentGenerationPayload {
  tenantId: string
  videoId: string
  transcript: string
}

export interface TranscriptionSyncPayload {
  tenantId?: string // Optional - if not provided, syncs all tenants
}

/**
 * Start video transcription job
 *
 * Triggered when video.asset.static_renditions.ready webhook fires
 * Downloads MP4 from Mux and submits to AssemblyAI
 */
export const videoTranscriptionJob = defineJob<VideoTranscriptionPayload>({
  name: 'video/transcription',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, videoId, playbackId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    if (!videoId || !playbackId) {
      return { success: false, error: { message: 'videoId and playbackId required', retryable: false } }
    }

    // @cgk-platform/video package not yet implemented
    console.log('[video/transcription] Stub - @cgk-platform/video not yet available', {
      tenantId,
      videoId,
      playbackId,
    })

    return {
      success: false,
      error: {
        message: '@cgk-platform/video package not yet implemented. Create this package to enable video transcription.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Generate AI content from transcript
 *
 * Triggered after transcription completes
 * Generates title, summary, and extracts tasks in parallel
 */
export const aiContentGenerationJob = defineJob<AIContentGenerationPayload>({
  name: 'video/ai-content-generation',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, videoId, transcript } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    if (!videoId || !transcript) {
      return { success: false, error: { message: 'videoId and transcript required', retryable: false } }
    }

    // @cgk-platform/video package not yet implemented
    console.log('[video/ai-content-generation] Stub - @cgk-platform/video not yet available', {
      tenantId,
      videoId,
      transcriptLength: transcript.length,
    })

    return {
      success: false,
      error: {
        message: '@cgk-platform/video package not yet implemented. Create this package to enable AI content generation.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

/**
 * Sync transcription statuses
 *
 * Runs on schedule to recover stuck transcription jobs
 * Polls AssemblyAI for jobs that didn't receive webhooks
 */
export const transcriptionSyncJob = defineJob<TranscriptionSyncPayload>({
  name: 'video/transcription-sync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      console.log('[video/transcription-sync] No tenantId provided, skipping')
      return { success: true, data: { message: 'No tenantId provided - needs orchestration' } }
    }

    // @cgk-platform/video package not yet implemented
    console.log('[video/transcription-sync] Stub - @cgk-platform/video not yet available', {
      tenantId,
    })

    return {
      success: false,
      error: {
        message: '@cgk-platform/video package not yet implemented. Create this package to enable transcription sync.',
        retryable: false,
      },
    }
  },
  retry: { maxAttempts: 1 },
})

// Schedule definitions
export const TRANSCRIPTION_SCHEDULES = {
  sync: '*/2 * * * *', // Every 2 minutes
} as const
