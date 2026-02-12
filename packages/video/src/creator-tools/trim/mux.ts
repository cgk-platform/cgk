/**
 * @cgk/video - Mux Clip Creation
 *
 * Creates video clips using Mux's input clipping feature.
 */

import { sql, withTenant } from '@cgk/db'

import type { TrimRequest, TrimResult } from './types.js'

/**
 * Mux client type (injected to avoid direct dependency)
 * Uses 'unknown' return type to be compatible with actual Mux SDK
 */
export interface MuxClient {
  video: {
    assets: {
      create: (params: {
        input: Array<{
          url: string
          start_time?: number
          end_time?: number
        }>
        playback_policy?: string[]
        mp4_support?: string
      }) => Promise<unknown>
    }
  }
}

/**
 * Shape of Mux asset response that we need
 */
interface MuxAssetResponse {
  id: string
  playback_ids?: Array<{ id: string; policy: string }>
  duration?: number
  status: string
}

/**
 * Create a trimmed clip from an existing Mux asset
 *
 * @ai-pattern Uses Mux's input specification for clipping
 * @ai-gotcha Always creates a new asset, original is preserved
 */
export async function createClip(
  muxClient: MuxClient,
  tenantId: string,
  userId: string,
  sourceVideoId: string,
  request: TrimRequest
): Promise<TrimResult> {
  return withTenant(tenantId, async () => {
    // Get source video details
    const sourceResult = await sql`
      SELECT id, title, mux_asset_id, duration_seconds, folder_id
      FROM videos
      WHERE id = ${sourceVideoId}
        AND tenant_id = ${tenantId}
        AND status = 'ready'
    `

    if (sourceResult.rows.length === 0) {
      return {
        success: false,
        newVideoId: '',
        newMuxAssetId: '',
        duration: 0,
        playbackId: '',
        error: 'Source video not found or not ready',
      }
    }

    const source = sourceResult.rows[0]
    if (!source) {
      return {
        success: false,
        newVideoId: '',
        newMuxAssetId: '',
        duration: 0,
        playbackId: '',
        error: 'Source video not found',
      }
    }
    const sourceMuxAssetId = source.mux_asset_id as string
    const sourceTitle = source.title as string
    const folderId = source.folder_id as string | null

    // Generate clip title
    const clipTitle = request.newTitle || `${sourceTitle} (Clip)`
    const clipDuration = request.endTime - request.startTime

    try {
      // Create new Mux asset from source with clip specification
      const response = await muxClient.video.assets.create({
        input: [
          {
            url: `mux://assets/${sourceMuxAssetId}`,
            start_time: request.startTime,
            end_time: request.endTime,
          },
        ],
        playback_policy: ['public'],
        mp4_support: 'capped-1080p',
      })
      const newAsset = response as MuxAssetResponse

      const newMuxAssetId = newAsset.id
      const playbackId = newAsset.playback_ids?.[0]?.id || ''

      // Create new video record for the clip
      const insertResult = await sql`
        INSERT INTO videos (
          tenant_id,
          user_id,
          folder_id,
          title,
          duration_seconds,
          recording_type,
          mux_asset_id,
          mux_playback_id,
          status,
          thumbnail_url
        )
        VALUES (
          ${tenantId},
          ${userId},
          ${folderId},
          ${clipTitle},
          ${clipDuration},
          'upload',
          ${newMuxAssetId},
          ${playbackId},
          'processing',
          ${playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null}
        )
        RETURNING id
      `

      const insertedRow = insertResult.rows[0]
      if (!insertedRow) {
        throw new Error('Failed to create video record')
      }
      const newVideoId = insertedRow.id as string

      // Log the trim operation
      await sql`
        INSERT INTO video_trim_jobs (
          tenant_id,
          user_id,
          source_video_id,
          new_video_id,
          start_time,
          end_time,
          status
        )
        VALUES (
          ${tenantId},
          ${userId},
          ${sourceVideoId},
          ${newVideoId},
          ${request.startTime},
          ${request.endTime},
          'processing'
        )
      `

      return {
        success: true,
        newVideoId,
        newMuxAssetId,
        duration: clipDuration,
        playbackId,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating clip'

      return {
        success: false,
        newVideoId: '',
        newMuxAssetId: '',
        duration: 0,
        playbackId: '',
        error: message,
      }
    }
  })
}

/**
 * SQL to create the video_trim_jobs table
 */
export const VIDEO_TRIM_JOBS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS video_trim_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source_video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  new_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_trim_jobs_tenant ON video_trim_jobs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_trim_jobs_source ON video_trim_jobs(source_video_id);
`

/**
 * Get trim jobs for a video
 */
export async function getTrimJobs(
  tenantId: string,
  videoId: string
): Promise<
  Array<{
    id: string
    newVideoId: string | null
    startTime: number
    endTime: number
    status: string
    createdAt: Date
  }>
> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT id, new_video_id, start_time, end_time, status, created_at
      FROM video_trim_jobs
      WHERE source_video_id = ${videoId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      newVideoId: row.new_video_id as string | null,
      startTime: parseFloat(row.start_time as string),
      endTime: parseFloat(row.end_time as string),
      status: row.status as string,
      createdAt: new Date(row.created_at as string),
    }))
  })
}

/**
 * Update trim job status (called by Mux webhook handler)
 */
export async function updateTrimJobStatus(
  tenantId: string,
  newMuxAssetId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    // Find the video by Mux asset ID
    const videoResult = await sql`
      SELECT id FROM videos WHERE mux_asset_id = ${newMuxAssetId} AND tenant_id = ${tenantId}
    `

    const videoRow = videoResult.rows[0]
    if (!videoRow) {
      return
    }

    const videoId = videoRow.id as string

    // Update the trim job
    await sql`
      UPDATE video_trim_jobs
      SET status = ${status},
          error_message = ${errorMessage || null},
          completed_at = now()
      WHERE new_video_id = ${videoId} AND tenant_id = ${tenantId}
    `

    // Update the video status
    await sql`
      UPDATE videos
      SET status = ${status === 'completed' ? 'ready' : 'error'},
          error_message = ${errorMessage || null}
      WHERE id = ${videoId} AND tenant_id = ${tenantId}
    `
  })
}
