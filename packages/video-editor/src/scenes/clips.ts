/**
 * @cgk-platform/video-editor - Clip resolution for scenes
 *
 * Queries dam_assets and dam_clip_segments to resolve clip info
 * for a given asset (and optionally a specific segment).
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { ResolvedClip } from '../types.js'

export async function resolveClipForScene(
  tenantId: string,
  assetId: string,
  segmentId?: string
): Promise<ResolvedClip | null> {
  return withTenant(tenantId, async () => {
    if (segmentId) {
      const result = await sql`
        SELECT
          a.id AS asset_id,
          a.file_url,
          a.thumbnail_url,
          a.duration_seconds,
          a.mux_playback_id,
          s.id AS segment_id,
          s.start_time AS segment_start,
          s.end_time AS segment_end,
          s.description AS segment_description
        FROM dam_assets a
        JOIN dam_clip_segments s
          ON s.asset_id = a.id
          AND s.tenant_id = ${tenantId}
        WHERE a.id = ${assetId}
          AND a.tenant_id = ${tenantId}
          AND a.deleted_at IS NULL
          AND s.id = ${segmentId}
      `
      const row = result.rows[0]
      if (!row) return null
      const r = row as Record<string, unknown>
      return {
        assetId: r['asset_id'] as string,
        fileUrl: r['file_url'] as string,
        thumbnailUrl: r['thumbnail_url'] as string | null,
        durationSeconds: r['duration_seconds'] != null ? Number(r['duration_seconds']) : null,
        muxPlaybackId: r['mux_playback_id'] as string | null,
        segmentId: r['segment_id'] as string,
        segmentStart: r['segment_start'] != null ? Number(r['segment_start']) : null,
        segmentEnd: r['segment_end'] != null ? Number(r['segment_end']) : null,
        segmentDescription: r['segment_description'] as string | null,
      }
    } else {
      const result = await sql`
        SELECT
          a.id AS asset_id,
          a.file_url,
          a.thumbnail_url,
          a.duration_seconds,
          a.mux_playback_id
        FROM dam_assets a
        WHERE a.id = ${assetId}
          AND a.tenant_id = ${tenantId}
          AND a.deleted_at IS NULL
      `
      const row = result.rows[0]
      if (!row) return null
      const r = row as Record<string, unknown>
      return {
        assetId: r['asset_id'] as string,
        fileUrl: r['file_url'] as string,
        thumbnailUrl: r['thumbnail_url'] as string | null,
        durationSeconds: r['duration_seconds'] != null ? Number(r['duration_seconds']) : null,
        muxPlaybackId: r['mux_playback_id'] as string | null,
        segmentId: null,
        segmentStart: null,
        segmentEnd: null,
        segmentDescription: null,
      }
    }
  })
}
