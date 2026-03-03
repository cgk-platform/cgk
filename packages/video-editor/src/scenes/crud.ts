/**
 * @cgk-platform/video-editor - Scene CRUD operations
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { CreateSceneInput, TextOverlay, UpdateSceneInput, VideoEditorScene } from '../types.js'

// ============================================================================
// Row mapper
// ============================================================================

function mapSceneRow(row: Record<string, unknown>): VideoEditorScene {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    projectId: row['project_id'] as string,
    sceneNumber: Number(row['scene_number']),
    role: row['role'] as string | null,
    duration: row['duration'] != null ? Number(row['duration']) : null,
    clipAssetId: row['clip_asset_id'] as string | null,
    clipSegmentId: row['clip_segment_id'] as string | null,
    clipStart: row['clip_start'] != null ? Number(row['clip_start']) : null,
    clipEnd: row['clip_end'] != null ? Number(row['clip_end']) : null,
    transition: (row['transition'] as string) || 'crossfade',
    textOverlays: (row['text_overlays'] as TextOverlay[]) ?? [],
    footageHint: row['footage_hint'] as string | null,
    sourceType: row['source_type'] as string | null,
    sourceReference: row['source_reference'] as string | null,
    sortOrder: Number(row['sort_order']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

export async function createScene(
  tenantId: string,
  projectId: string,
  input: CreateSceneInput
): Promise<VideoEditorScene> {
  return withTenant(tenantId, async () => {
    const textOverlays = input.textOverlays != null ? JSON.stringify(input.textOverlays) : '[]'

    const result = await sql`
      INSERT INTO video_editor_scenes (
        tenant_id,
        project_id,
        scene_number,
        role,
        duration,
        clip_asset_id,
        clip_segment_id,
        clip_start,
        clip_end,
        transition,
        text_overlays,
        footage_hint,
        source_type,
        source_reference,
        sort_order
      ) VALUES (
        ${tenantId},
        ${projectId},
        ${input.sceneNumber},
        ${input.role ?? null},
        ${input.duration ?? null},
        ${input.clipAssetId ?? null},
        ${input.clipSegmentId ?? null},
        ${input.clipStart ?? null},
        ${input.clipEnd ?? null},
        ${input.transition ?? 'crossfade'},
        ${textOverlays}::jsonb,
        ${input.footageHint ?? null},
        ${input.sourceType ?? null},
        ${input.sourceReference ?? null},
        ${input.sceneNumber - 1}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create video editor scene')
    }
    return mapSceneRow(row as Record<string, unknown>)
  })
}

export async function getScenes(tenantId: string, projectId: string): Promise<VideoEditorScene[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM video_editor_scenes
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY sort_order ASC
    `
    return result.rows.map((r) => mapSceneRow(r as Record<string, unknown>))
  })
}

export async function updateScene(
  tenantId: string,
  sceneId: string,
  input: UpdateSceneInput
): Promise<VideoEditorScene | null> {
  return withTenant(tenantId, async () => {
    const existing = await sql`
      SELECT * FROM video_editor_scenes
      WHERE id = ${sceneId} AND tenant_id = ${tenantId}
    `
    if (existing.rows.length === 0) return null
    const row = existing.rows[0] as Record<string, unknown>

    const role = input.role !== undefined ? input.role : (row['role'] as string | null)
    const duration =
      input.duration !== undefined
        ? input.duration
        : row['duration'] != null
          ? Number(row['duration'])
          : null
    const clipAssetId =
      input.clipAssetId !== undefined ? input.clipAssetId : (row['clip_asset_id'] as string | null)
    const clipSegmentId =
      input.clipSegmentId !== undefined
        ? input.clipSegmentId
        : (row['clip_segment_id'] as string | null)
    const clipStart =
      input.clipStart !== undefined
        ? input.clipStart
        : row['clip_start'] != null
          ? Number(row['clip_start'])
          : null
    const clipEnd =
      input.clipEnd !== undefined
        ? input.clipEnd
        : row['clip_end'] != null
          ? Number(row['clip_end'])
          : null
    const transition =
      input.transition !== undefined
        ? input.transition
        : (row['transition'] as string) || 'crossfade'
    const textOverlays =
      input.textOverlays !== undefined
        ? JSON.stringify(input.textOverlays)
        : JSON.stringify(row['text_overlays'] ?? [])
    const footageHint =
      input.footageHint !== undefined ? input.footageHint : (row['footage_hint'] as string | null)
    const sourceType =
      input.sourceType !== undefined ? input.sourceType : (row['source_type'] as string | null)
    const sourceReference =
      input.sourceReference !== undefined
        ? input.sourceReference
        : (row['source_reference'] as string | null)

    const updated = await sql`
      UPDATE video_editor_scenes SET
        role = ${role},
        duration = ${duration},
        clip_asset_id = ${clipAssetId},
        clip_segment_id = ${clipSegmentId},
        clip_start = ${clipStart},
        clip_end = ${clipEnd},
        transition = ${transition},
        text_overlays = ${textOverlays}::jsonb,
        footage_hint = ${footageHint},
        source_type = ${sourceType},
        source_reference = ${sourceReference}
      WHERE id = ${sceneId} AND tenant_id = ${tenantId}
      RETURNING *
    `
    const updatedRow = updated.rows[0]
    if (!updatedRow) return null
    return mapSceneRow(updatedRow as Record<string, unknown>)
  })
}

export async function deleteScene(tenantId: string, sceneId: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_editor_scenes
      WHERE id = ${sceneId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function reorderScenes(
  tenantId: string,
  projectId: string,
  sceneIds: string[]
): Promise<void> {
  return withTenant(tenantId, async () => {
    for (let i = 0; i < sceneIds.length; i++) {
      const sceneId = sceneIds[i]
      if (!sceneId) continue
      await sql`
        UPDATE video_editor_scenes
        SET sort_order = ${i}
        WHERE id = ${sceneId}
          AND project_id = ${projectId}
          AND tenant_id = ${tenantId}
      `
    }
  })
}
