/**
 * Transcription Database Functions
 *
 * CRUD operations for transcription data with tenant isolation
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for queries
 */

import { sql, withTenant } from '@cgk/db'
import type {
  TranscriptionStatus,
  TranscriptionWord,
  TranscriptionChapter,
  AITask,
  VideoWithTranscription,
} from './types'

/**
 * Get video with transcription data
 */
export async function getVideoTranscription(
  tenantId: string,
  videoId: string
): Promise<VideoWithTranscription | null> {
  return withTenant(tenantId, async () => {
    const result = await sql<{
      id: string
      tenant_id: string
      title: string
      transcription_status: TranscriptionStatus
      transcription_job_id: string | null
      transcription_text: string | null
      transcription_words: TranscriptionWord[] | null
      ai_title: string | null
      ai_summary: string | null
      ai_chapters: TranscriptionChapter[] | null
      ai_tasks: AITask[] | null
    }>`
      SELECT
        id,
        tenant_id,
        title,
        COALESCE(transcription_status, 'pending') as transcription_status,
        transcription_job_id,
        transcription_text,
        transcription_words,
        ai_title,
        ai_summary,
        ai_chapters,
        ai_tasks
      FROM videos
      WHERE id = ${videoId}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      transcriptionStatus: row.transcription_status,
      transcriptionJobId: row.transcription_job_id,
      transcriptionText: row.transcription_text,
      transcriptionWords: row.transcription_words,
      aiTitle: row.ai_title,
      aiSummary: row.ai_summary,
      aiChapters: row.ai_chapters,
      aiTasks: row.ai_tasks,
    }
  })
}

/**
 * Start transcription job - update status to processing
 */
export async function startTranscription(
  tenantId: string,
  videoId: string,
  jobId: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        transcription_status = 'processing',
        transcription_job_id = ${jobId},
        updated_at = NOW()
      WHERE id = ${videoId}
    `
  })
}

/**
 * Save completed transcription result
 */
export async function saveTranscriptionResult(
  tenantId: string,
  videoId: string,
  text: string,
  words: TranscriptionWord[],
  chapters?: TranscriptionChapter[]
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        transcription_status = 'completed',
        transcription_text = ${text},
        transcription_words = ${JSON.stringify(words)}::jsonb,
        ai_chapters = ${chapters ? JSON.stringify(chapters) : null}::jsonb,
        updated_at = NOW()
      WHERE id = ${videoId}
    `
  })
}

/**
 * Mark transcription as failed
 */
export async function failTranscription(
  tenantId: string,
  videoId: string,
  errorMessage?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        transcription_status = 'failed',
        error_message = COALESCE(${errorMessage}, error_message),
        updated_at = NOW()
      WHERE id = ${videoId}
    `
  })
}

/**
 * Reset transcription to pending for retry
 */
export async function resetTranscription(tenantId: string, videoId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        transcription_status = 'pending',
        transcription_job_id = NULL,
        transcription_text = NULL,
        transcription_words = NULL,
        ai_title = NULL,
        ai_summary = NULL,
        ai_chapters = NULL,
        ai_tasks = NULL,
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${videoId}
    `
  })
}

/**
 * Save AI-generated content
 */
export async function saveAIContent(
  tenantId: string,
  videoId: string,
  content: {
    title?: string
    summary?: string
    tasks?: AITask[]
  }
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE videos
      SET
        ai_title = COALESCE(${content.title}, ai_title),
        ai_summary = COALESCE(${content.summary}, ai_summary),
        ai_tasks = COALESCE(${content.tasks ? JSON.stringify(content.tasks) : null}::jsonb, ai_tasks),
        updated_at = NOW()
      WHERE id = ${videoId}
    `
  })
}

/**
 * Update AI task completion status
 */
export async function updateTaskCompletion(
  tenantId: string,
  videoId: string,
  taskIndex: number,
  completed: boolean
): Promise<void> {
  await withTenant(tenantId, async () => {
    // Use PostgreSQL jsonb_set to update the specific task
    await sql`
      UPDATE videos
      SET
        ai_tasks = jsonb_set(
          ai_tasks,
          ${`{${taskIndex},completed}`},
          ${completed ? 'true' : 'false'}::jsonb
        ),
        updated_at = NOW()
      WHERE id = ${videoId}
        AND ai_tasks IS NOT NULL
        AND jsonb_array_length(ai_tasks) > ${taskIndex}
    `
  })
}

/**
 * Get videos with pending transcription
 * Used by sync schedule to find stuck jobs
 */
export async function getVideosPendingTranscription(
  tenantId: string,
  limit = 10
): Promise<Array<{ id: string; transcriptionJobId: string | null; status: string }>> {
  return withTenant(tenantId, async () => {
    const result = await sql<{
      id: string
      transcription_job_id: string | null
      status: string
    }>`
      SELECT
        id,
        transcription_job_id,
        status
      FROM videos
      WHERE transcription_status = 'processing'
        AND status = 'ready'
        AND updated_at < NOW() - INTERVAL '5 minutes'
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id,
      transcriptionJobId: row.transcription_job_id,
      status: row.status,
    }))
  })
}

/**
 * Get videos ready for transcription (MP4 available, not yet transcribed)
 */
export async function getVideosReadyForTranscription(
  tenantId: string,
  limit = 10
): Promise<Array<{ id: string; muxPlaybackId: string; title: string }>> {
  return withTenant(tenantId, async () => {
    const result = await sql<{
      id: string
      mux_playback_id: string
      title: string
    }>`
      SELECT id, mux_playback_id, title
      FROM videos
      WHERE status = 'ready'
        AND mux_playback_id IS NOT NULL
        AND (transcription_status = 'pending' OR transcription_status IS NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id,
      muxPlaybackId: row.mux_playback_id,
      title: row.title,
    }))
  })
}

/**
 * Search videos by transcript text
 */
export async function searchVideosByTranscript(
  tenantId: string,
  query: string,
  limit = 20,
  offset = 0
): Promise<Array<{ id: string; title: string; snippets: string[] }>> {
  return withTenant(tenantId, async () => {
    const result = await sql<{
      id: string
      title: string
      snippets: string[]
    }>`
      SELECT
        id,
        title,
        ts_headline(
          'english',
          COALESCE(transcription_text, ''),
          plainto_tsquery('english', ${query}),
          'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>'
        ) as snippet
      FROM videos
      WHERE status = 'ready'
        AND transcription_status = 'completed'
        AND search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      snippets: row.snippets ? [row.snippets.toString()] : [],
    }))
  })
}

/**
 * Get video by transcription job ID (for webhook handling)
 */
export async function getVideoByTranscriptionJobId(
  tenantId: string,
  jobId: string
): Promise<{ id: string; title: string } | null> {
  return withTenant(tenantId, async () => {
    const result = await sql<{
      id: string
      title: string
    }>`
      SELECT id, title
      FROM videos
      WHERE transcription_job_id = ${jobId}
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return { id: row.id, title: row.title }
  })
}
