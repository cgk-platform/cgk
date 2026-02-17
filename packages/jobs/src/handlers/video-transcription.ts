/**
 * Video Transcription Background Jobs
 *
 * Handles:
 * - Starting transcription jobs
 * - Processing transcription results
 * - AI content generation
 * - Sync schedule for stuck jobs
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always include tenantId in payloads
 */

import { withTenant } from '@cgk-platform/db'

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

    try {
      // Dynamic imports to avoid bundling issues
      const { getTranscriptionProvider, startTranscription, getVideoTranscription } = await import(
        '@cgk-platform/video/transcription'
      )
      const { getTenantAssemblyAIClient } = await import('@cgk-platform/integrations')

      // Check if AssemblyAI is configured for tenant
      const assemblyClient = await getTenantAssemblyAIClient(tenantId)
      if (!assemblyClient) {
        console.log(`[video/transcription] AssemblyAI not configured for tenant ${tenantId}`)
        return {
          success: false,
          error: { message: 'AssemblyAI not configured for tenant', retryable: false },
        }
      }

      // Check if already transcribing
      const existing = await getVideoTranscription(tenantId, videoId)
      if (existing?.transcriptionStatus === 'processing') {
        console.log(`[video/transcription] Already processing videoId=${videoId}`)
        return { success: true, data: { alreadyProcessing: true } }
      }

      // Get MP4 download URL from Mux
      const mp4Url = `https://stream.mux.com/${playbackId}/high.mp4`

      // Start transcription
      const provider = getTranscriptionProvider('assemblyai')
      const transcriptionJob = await provider.transcribe(mp4Url, {
        speakerDiarization: true,
        autoChapters: true,
        detectFillers: true,
      })

      // Save job ID to database
      await startTranscription(tenantId, videoId, transcriptionJob.id)

      console.log(`[video/transcription] Started transcription for videoId=${videoId} jobId=${transcriptionJob.id}`)

      return {
        success: true,
        data: { jobId: transcriptionJob.id },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[video/transcription] Error for videoId=${videoId}:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
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

    try {
      const { saveAIContent } = await import('@cgk-platform/video/transcription')
      const { getTenantAnthropicClient } = await import('@cgk-platform/integrations')

      // Check if Anthropic is configured for tenant
      const anthropic = await getTenantAnthropicClient(tenantId)
      if (!anthropic) {
        console.log(`[video/ai-content-generation] Anthropic not configured for tenant ${tenantId}`)
        return {
          success: false,
          error: { message: 'Anthropic not configured for tenant', retryable: false },
        }
      }

      // Truncate transcript if too long (max ~8000 words for context)
      const maxWords = 8000
      const words = transcript.split(/\s+/)
      const truncatedTranscript = words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : transcript

      // Generate title
      const titleResponse = await anthropic.createMessage({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Generate a concise, descriptive title (max 60 characters) for this video based on the transcript. Return only the title, no quotes or explanation.\n\nTranscript:\n${truncatedTranscript.substring(0, 2000)}`,
          },
        ],
      })
      const title = titleResponse.content[0]?.text?.trim() || 'Untitled Video'

      // Generate summary
      const summaryResponse = await anthropic.createMessage({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Write a brief summary (2-3 sentences, max 200 words) of this video based on the transcript. Focus on the main topics and key takeaways.\n\nTranscript:\n${truncatedTranscript}`,
          },
        ],
      })
      const summary = summaryResponse.content[0]?.text?.trim() || ''

      // Extract action items/tasks
      const tasksResponse = await anthropic.createMessage({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Extract any action items, tasks, or to-dos mentioned in this video transcript. Return as a JSON array of objects with "text" field. If no tasks found, return empty array [].\n\nTranscript:\n${truncatedTranscript}`,
          },
        ],
      })

      let tasks: Array<{ text: string; completed: boolean }> = []
      try {
        const tasksText = tasksResponse.content[0]?.text || '[]'
        const parsed = JSON.parse(tasksText.replace(/```json\n?/g, '').replace(/```\n?/g, ''))
        if (Array.isArray(parsed)) {
          tasks = parsed.map((t: { text?: string }) => ({
            text: t.text || String(t),
            completed: false,
          }))
        }
      } catch {
        // Failed to parse tasks, continue with empty array
      }

      // Save AI content to database
      await saveAIContent(tenantId, videoId, { title, summary, tasks })

      console.log(
        `[video/ai-content-generation] Generated content for videoId=${videoId}: title="${title.substring(0, 30)}..." tasks=${tasks.length}`
      )

      return {
        success: true,
        data: { title, summaryLength: summary.length, tasksCount: tasks.length },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[video/ai-content-generation] Error for videoId=${videoId}:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
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

    try {
      const { getVideosPendingTranscription, saveTranscriptionResult, failTranscription } = await import(
        '@cgk-platform/video/transcription'
      )
      const { getTenantAssemblyAIClient } = await import('@cgk-platform/integrations')

      // Check if AssemblyAI is configured for tenant
      const assemblyClient = await getTenantAssemblyAIClient(tenantId)
      if (!assemblyClient) {
        console.log(`[video/transcription-sync] AssemblyAI not configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'AssemblyAI not configured' } }
      }

      // Get videos with pending transcriptions
      const pendingVideos = await getVideosPendingTranscription(tenantId)

      if (pendingVideos.length === 0) {
        return { success: true, data: { checked: 0, updated: 0 } }
      }

      let updated = 0

      for (const video of pendingVideos) {
        if (!video.transcriptionJobId) continue

        try {
          // Poll AssemblyAI for status
          const result = await assemblyClient.getTranscript(video.transcriptionJobId)

          if (result.status === 'completed' && result.text) {
            // Save completed transcription
            await saveTranscriptionResult(tenantId, video.id, result.text, result.words || [], [])
            updated++
            console.log(`[video/transcription-sync] Completed transcription for videoId=${video.id}`)
          } else if (result.status === 'error') {
            // Mark as failed
            await failTranscription(tenantId, video.id, result.error || 'Unknown transcription error')
            updated++
            console.log(`[video/transcription-sync] Failed transcription for videoId=${video.id}: ${result.error}`)
          }
          // If still processing, leave as-is
        } catch (pollError) {
          console.error(
            `[video/transcription-sync] Error polling job ${video.transcriptionJobId}:`,
            pollError instanceof Error ? pollError.message : 'Unknown error'
          )
        }
      }

      console.log(`[video/transcription-sync] tenantId=${tenantId} checked=${pendingVideos.length} updated=${updated}`)

      return {
        success: true,
        data: { checked: pendingVideos.length, updated },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[video/transcription-sync] Error for tenantId=${tenantId}:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 1 },
})

// Schedule definitions
export const TRANSCRIPTION_SCHEDULES = {
  sync: '*/2 * * * *', // Every 2 minutes
} as const
