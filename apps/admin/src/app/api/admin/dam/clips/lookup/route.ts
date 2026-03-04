export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/dam/clips/lookup?catalogId=product-pour.mp4
 *
 * Resolves an openCLAW catalog filename to a DAM asset with its
 * Blob URL and segments. Used by the video editor's clip resolution
 * to find remote copies of locally-cataloged clips.
 *
 * Auth: tenant API key.
 */

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { logger } from '@cgk-platform/logging'

export async function GET(request: Request) {
  const auth = await validateTenantApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const url = new URL(request.url)
  const catalogId = url.searchParams.get('catalogId')

  if (!catalogId) {
    return NextResponse.json({ error: 'catalogId query parameter is required' }, { status: 400 })
  }

  const { tenantSlug } = auth

  try {
    const result = await withTenant(tenantSlug, async () => {
      // Look up the asset by openclaw_catalog_id
      const assetResult = await sql`
        SELECT
          id AS asset_id,
          file_url,
          title,
          duration_seconds,
          width,
          height,
          clip_source_type,
          has_burned_captions,
          file_hash,
          file_size_bytes
        FROM dam_assets
        WHERE openclaw_catalog_id = ${catalogId}
          AND tenant_id = ${tenantSlug}
          AND deleted_at IS NULL
        LIMIT 1
      `

      if (assetResult.rows.length === 0) {
        return null
      }

      const asset = assetResult.rows[0]

      // Fetch segments for this asset
      const segmentResult = await sql`
        SELECT
          id,
          start_time,
          end_time,
          description,
          subjects,
          camera,
          mood,
          motion,
          text_overlay,
          text_overlay_severity,
          quality_score,
          quality_notes
        FROM dam_clip_segments
        WHERE asset_id = ${asset.asset_id}
          AND tenant_id = ${tenantSlug}
        ORDER BY start_time ASC
      `

      return {
        asset_id: asset.asset_id,
        file_url: asset.file_url,
        title: asset.title,
        duration_seconds: asset.duration_seconds,
        width: asset.width,
        height: asset.height,
        clip_source_type: asset.clip_source_type,
        has_burned_captions: asset.has_burned_captions,
        file_hash: asset.file_hash,
        file_size_bytes: asset.file_size_bytes,
        segments: segmentResult.rows.map((s) => ({
          id: s.id,
          startTime: parseFloat(s.start_time),
          endTime: parseFloat(s.end_time),
          description: s.description,
          subjects: s.subjects,
          camera: s.camera,
          mood: s.mood,
          motion: s.motion,
          textOverlay: s.text_overlay,
          textOverlaySeverity: s.text_overlay_severity,
          qualityScore: s.quality_score,
          qualityNotes: s.quality_notes,
        })),
      }
    })

    if (!result) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error(
      'DAM clip lookup error:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lookup failed' },
      { status: 500 }
    )
  }
}
