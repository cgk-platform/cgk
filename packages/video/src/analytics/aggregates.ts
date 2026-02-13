/**
 * @cgk-platform/video - View aggregates
 *
 * Aggregate analytics for video views and watch time.
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { VideoAnalytics } from '../types.js'

/**
 * Get aggregate analytics for a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @returns Video analytics
 */
export async function getVideoAnalytics(
  tenantId: string,
  videoId: string,
): Promise<VideoAnalytics> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as "totalViews",
        COUNT(DISTINCT COALESCE(user_id, ip_hash)) as "uniqueViewers",
        COALESCE(SUM(watch_duration_seconds), 0) as "totalWatchTime",
        COALESCE(AVG(watch_duration_seconds), 0) as "avgWatchTime",
        COALESCE(
          (COUNT(*) FILTER (WHERE completed = true)::float / NULLIF(COUNT(*), 0)),
          0
        ) as "completionRate"
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
    `

    const row = result.rows[0] as {
      totalViews: string
      uniqueViewers: string
      totalWatchTime: string
      avgWatchTime: string
      completionRate: string
    }

    return {
      totalViews: parseInt(row.totalViews, 10),
      uniqueViewers: parseInt(row.uniqueViewers, 10),
      totalWatchTimeSeconds: parseInt(row.totalWatchTime, 10),
      averageWatchTimeSeconds: Math.round(parseFloat(row.avgWatchTime)),
      completionRate: parseFloat(row.completionRate),
    }
  })
}

/**
 * Get view count for a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @returns View count
 */
export async function getViewCount(
  tenantId: string,
  videoId: string,
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
    `
    return parseInt(String(result.rows[0]?.count ?? '0'), 10)
  })
}

/**
 * Get unique viewer count for a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @returns Unique viewer count
 */
export async function getUniqueViewerCount(
  tenantId: string,
  videoId: string,
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(DISTINCT COALESCE(user_id, ip_hash)) as count
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
    `
    return parseInt(String(result.rows[0]?.count ?? '0'), 10)
  })
}

/**
 * Get views over time for a video
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @param options - Time range options
 * @returns Daily view counts
 */
export async function getViewsOverTime(
  tenantId: string,
  videoId: string,
  options: {
    startDate?: Date
    endDate?: Date
    groupBy?: 'hour' | 'day' | 'week' | 'month'
  } = {},
): Promise<Array<{ date: string; views: number; uniqueViewers: number }>> {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
    groupBy = 'day',
  } = options

  return withTenant(tenantId, async () => {
    const truncFormat =
      groupBy === 'hour'
        ? 'hour'
        : groupBy === 'week'
          ? 'week'
          : groupBy === 'month'
            ? 'month'
            : 'day'

    const result = await sql`
      SELECT
        DATE_TRUNC(${truncFormat}, created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT COALESCE(user_id, ip_hash)) as "uniqueViewers"
      FROM video_views
      WHERE video_id = ${videoId}
        AND tenant_id = ${tenantId}
        AND created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY DATE_TRUNC(${truncFormat}, created_at)
      ORDER BY date ASC
    `

    return result.rows.map((row) => ({
      date: (row as { date: Date }).date.toISOString(),
      views: parseInt(String((row as { views: string }).views), 10),
      uniqueViewers: parseInt(
        String((row as { uniqueViewers: string }).uniqueViewers),
        10,
      ),
    }))
  })
}

/**
 * Get top videos by view count for a user
 *
 * @param tenantId - Tenant ID
 * @param userId - User ID (video owner)
 * @param options - Options
 * @returns Top videos with view counts
 */
export async function getTopVideos(
  tenantId: string,
  userId: string,
  options: { limit?: number; days?: number } = {},
): Promise<
  Array<{
    videoId: string
    title: string
    views: number
    uniqueViewers: number
    totalWatchTime: number
  }>
> {
  const { limit = 10, days = 30 } = options
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        v.id as "videoId",
        v.title,
        COUNT(vv.id) as views,
        COUNT(DISTINCT COALESCE(vv.user_id, vv.ip_hash)) as "uniqueViewers",
        COALESCE(SUM(vv.watch_duration_seconds), 0) as "totalWatchTime"
      FROM videos v
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.created_at >= ${startDate.toISOString()}
      WHERE v.tenant_id = ${tenantId}
        AND v.user_id = ${userId}
        AND v.deleted_at IS NULL
      GROUP BY v.id, v.title
      ORDER BY views DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      videoId: String((row as { videoId: string }).videoId),
      title: String((row as { title: string }).title),
      views: parseInt(String((row as { views: string }).views), 10),
      uniqueViewers: parseInt(
        String((row as { uniqueViewers: string }).uniqueViewers),
        10,
      ),
      totalWatchTime: parseInt(
        String((row as { totalWatchTime: string }).totalWatchTime),
        10,
      ),
    }))
  })
}

/**
 * Get watch time distribution (engagement)
 *
 * @param tenantId - Tenant ID
 * @param videoId - Video ID
 * @returns Watch time distribution buckets
 */
export async function getWatchTimeDistribution(
  tenantId: string,
  videoId: string,
): Promise<
  Array<{
    bucket: string
    count: number
    percentage: number
  }>
> {
  return withTenant(tenantId, async () => {
    // Get video duration first
    const videoResult = await sql`
      SELECT duration_seconds as duration
      FROM videos
      WHERE id = ${videoId}
        AND tenant_id = ${tenantId}
    `

    const duration = (videoResult.rows[0] as { duration: number | null })
      ?.duration

    if (!duration || duration === 0) {
      return []
    }

    // Define buckets based on percentage of video watched
    const result = await sql`
      WITH buckets AS (
        SELECT
          CASE
            WHEN watch_duration_seconds::float / ${duration} < 0.25 THEN '0-25%'
            WHEN watch_duration_seconds::float / ${duration} < 0.50 THEN '25-50%'
            WHEN watch_duration_seconds::float / ${duration} < 0.75 THEN '50-75%'
            WHEN watch_duration_seconds::float / ${duration} < 1.00 THEN '75-99%'
            ELSE '100%'
          END as bucket,
          1 as count
        FROM video_views
        WHERE video_id = ${videoId}
          AND tenant_id = ${tenantId}
      )
      SELECT
        bucket,
        COUNT(*) as count
      FROM buckets
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN '0-25%' THEN 1
          WHEN '25-50%' THEN 2
          WHEN '50-75%' THEN 3
          WHEN '75-99%' THEN 4
          WHEN '100%' THEN 5
        END
    `

    const total = result.rows.reduce(
      (sum, row) => sum + parseInt(String((row as { count: string }).count), 10),
      0,
    )

    return result.rows.map((row) => {
      const count = parseInt(String((row as { count: string }).count), 10)
      return {
        bucket: String((row as { bucket: string }).bucket),
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }
    })
  })
}
