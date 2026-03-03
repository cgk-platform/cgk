/**
 * Clip Ingest Logic
 * Core operations for ingesting video clips from openCLAW into the DAM.
 * All operations must be called within withTenant() context.
 */
import { sql } from '@cgk-platform/db'

export interface ClipSegmentInput {
  startTime: number
  endTime: number
  description?: string
  subjects?: string[]
  camera?: string
  mood?: string
  motion?: string
  textOverlay?: string
  textOverlaySeverity?: 'none' | 'light' | 'heavy'
  qualityScore?: number
  qualityNotes?: string
}

export interface ClipIngestInput {
  title: string
  fileUrl: string
  mimeType: string
  description?: string
  fileSizeBytes?: number
  width?: number
  height?: number
  durationSeconds?: number
  thumbnailUrl?: string
  fileHash?: string
  clipSourceType?: string
  clipSourceUrl?: string
  hasBurnedCaptions?: boolean
  openclawCatalogId?: string
  tags?: string[]
  segments?: ClipSegmentInput[]
}

export interface IngestResult {
  assetId: string
  duplicate: boolean
  segmentCount: number
}

/**
 * Check for an existing asset by file hash. Returns asset ID or null.
 * Must be called within withTenant() context.
 */
export async function findDuplicateClip(
  tenantId: string,
  fileHash: string
): Promise<string | null> {
  const result = await sql<{ id: string }>`
    SELECT id FROM dam_assets
    WHERE tenant_id = ${tenantId}
      AND file_hash = ${fileHash}
      AND deleted_at IS NULL
    LIMIT 1
  `
  return result.rows[0]?.id ?? null
}

/**
 * Ingest a single video clip into the DAM.
 * Creates a dam_assets record plus dam_clip_segments for each segment.
 * Must be called within withTenant() context.
 */
export async function ingestClip(
  tenantId: string,
  userId: string,
  input: ClipIngestInput
): Promise<IngestResult> {
  const {
    title,
    fileUrl,
    mimeType,
    description,
    fileSizeBytes,
    width,
    height,
    durationSeconds,
    thumbnailUrl,
    fileHash,
    clipSourceType,
    clipSourceUrl,
    hasBurnedCaptions = false,
    openclawCatalogId,
    tags = [],
    segments = [],
  } = input

  const manualTags = JSON.stringify(tags)

  const assetResult = await sql<{ id: string }>`
    INSERT INTO dam_assets (
      tenant_id, user_id, title, description, asset_type, mime_type,
      file_url, thumbnail_url, file_size_bytes, width, height, duration_seconds,
      file_hash, clip_source_type, clip_source_url, has_burned_captions,
      openclaw_catalog_id, manual_tags, source_type
    ) VALUES (
      ${tenantId}, ${userId}, ${title}, ${description ?? null}, 'video', ${mimeType},
      ${fileUrl}, ${thumbnailUrl ?? null}, ${fileSizeBytes ?? null},
      ${width ?? null}, ${height ?? null}, ${durationSeconds ?? null},
      ${fileHash ?? null}, ${clipSourceType ?? null}, ${clipSourceUrl ?? null},
      ${hasBurnedCaptions}, ${openclawCatalogId ?? null},
      ${manualTags}::text[], 'api'
    )
    RETURNING id
  `

  const assetId = assetResult.rows[0]!.id

  for (const seg of segments) {
    const subjects = JSON.stringify(seg.subjects ?? [])
    await sql`
      INSERT INTO dam_clip_segments (
        tenant_id, asset_id, start_time, end_time, description,
        subjects, camera, mood, motion, text_overlay,
        text_overlay_severity, quality_score, quality_notes
      ) VALUES (
        ${tenantId}, ${assetId}::uuid, ${seg.startTime}, ${seg.endTime},
        ${seg.description ?? null}, ${subjects}::text[],
        ${seg.camera ?? null}, ${seg.mood ?? null}, ${seg.motion ?? null},
        ${seg.textOverlay ?? null}, ${seg.textOverlaySeverity ?? 'none'},
        ${seg.qualityScore ?? null}, ${seg.qualityNotes ?? null}
      )
    `
  }

  return {
    assetId,
    duplicate: false,
    segmentCount: segments.length,
  }
}
