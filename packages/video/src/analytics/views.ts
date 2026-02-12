/**
 * @cgk/video - View tracking
 *
 * Track video views and watch time for analytics.
 */

import { sql, withTenant } from '@cgk/db'

import type { TrackViewInput, VideoView } from '../types.js'

/**
 * Track a video view
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @param userId - Optional user ID
 * @param input - View tracking data
 * @returns Created view record
 */
export async function trackView(
  tenantId: string,
  videoId: string,
  userId: string | null,
  input: TrackViewInput,
): Promise<VideoView> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO video_views (
        tenant_id,
        video_id,
        user_id,
        watch_duration_seconds,
        completed,
        ip_hash,
        user_agent
      ) VALUES (
        ${tenantId},
        ${videoId},
        ${userId},
        ${input.watchDurationSeconds},
        ${input.completed ?? false},
        ${input.ipHash ?? null},
        ${input.userAgent ?? null}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        user_id as "userId",
        watch_duration_seconds as "watchDurationSeconds",
        completed,
        ip_hash as "ipHash",
        user_agent as "userAgent",
        created_at as "createdAt"
    `
    return result.rows[0] as VideoView
  })
}

/**
 * Update an existing view record (for progress tracking)
 *
 * @param tenantId - Tenant ID
 * @param viewId - View ID
 * @param input - Updated view data
 * @returns Updated view record
 */
export async function updateView(
  tenantId: string,
  viewId: string,
  input: Partial<TrackViewInput>,
): Promise<VideoView | null> {
  return withTenant(tenantId, async () => {
    const updates: string[] = []

    if (input.watchDurationSeconds !== undefined) {
      updates.push(`watch_duration_seconds = ${input.watchDurationSeconds}`)
    }
    if (input.completed !== undefined) {
      updates.push(`completed = ${input.completed}`)
    }

    // Get current values
    const currentResult = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        user_id as "userId",
        watch_duration_seconds as "watchDurationSeconds",
        completed,
        ip_hash as "ipHash",
        user_agent as "userAgent",
        created_at as "createdAt"
      FROM video_views
      WHERE id = ${viewId}
        AND tenant_id = ${tenantId}
    `
    const current = currentResult.rows[0] as VideoView | undefined
    if (!current) return null

    if (updates.length === 0) {
      return current
    }

    // Apply updates
    const watchDuration =
      input.watchDurationSeconds !== undefined
        ? input.watchDurationSeconds
        : current.watchDurationSeconds
    const completed =
      input.completed !== undefined ? input.completed : current.completed

    const result = await sql`
      UPDATE video_views
      SET
        watch_duration_seconds = ${watchDuration},
        completed = ${completed}
      WHERE id = ${viewId}
        AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        user_id as "userId",
        watch_duration_seconds as "watchDurationSeconds",
        completed,
        ip_hash as "ipHash",
        user_agent as "userAgent",
        created_at as "createdAt"
    `
    return (result.rows[0] as VideoView | undefined) ?? null
  })
}

/**
 * Get views for a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @param options - Pagination options
 * @returns List of views
 */
export async function getVideoViews(
  tenantId: string,
  videoId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<VideoView[]> {
  const { limit = 50, offset = 0 } = options

  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        user_id as "userId",
        watch_duration_seconds as "watchDurationSeconds",
        completed,
        ip_hash as "ipHash",
        user_agent as "userAgent",
        created_at as "createdAt"
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return result.rows as VideoView[]
  })
}

/**
 * Get the most recent view for a user on a video
 * (useful for resuming playback)
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @param userId - User ID
 * @returns Most recent view or null
 */
export async function getLastView(
  tenantId: string,
  videoId: string,
  userId: string,
): Promise<VideoView | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        video_id as "videoId",
        user_id as "userId",
        watch_duration_seconds as "watchDurationSeconds",
        completed,
        ip_hash as "ipHash",
        user_agent as "userAgent",
        created_at as "createdAt"
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    return (result.rows[0] as VideoView | undefined) ?? null
  })
}
