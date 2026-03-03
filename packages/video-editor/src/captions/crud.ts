/**
 * @cgk-platform/video-editor - Caption CRUD operations
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { UpdateCaptionInput, VideoEditorCaption } from '../types.js'

// ============================================================================
// Row mapper
// ============================================================================

function mapCaptionRow(row: Record<string, unknown>): VideoEditorCaption {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    projectId: row['project_id'] as string,
    word: row['word'] as string,
    startTime: Number(row['start_time']),
    endTime: Number(row['end_time']),
    sortOrder: Number(row['sort_order']),
    isEdited: Boolean(row['is_edited']),
    createdAt: new Date(row['created_at'] as string),
  }
}

// ============================================================================
// Operations
// ============================================================================

export async function getCaptions(
  tenantId: string,
  projectId: string
): Promise<VideoEditorCaption[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM video_editor_captions
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY sort_order ASC
    `
    return result.rows.map((r) => mapCaptionRow(r as Record<string, unknown>))
  })
}

export async function bulkUpdateCaptions(
  tenantId: string,
  projectId: string,
  updates: UpdateCaptionInput[]
): Promise<VideoEditorCaption[]> {
  return withTenant(tenantId, async () => {
    for (const update of updates) {
      const existing = await sql`
        SELECT * FROM video_editor_captions
        WHERE id = ${update.id}
          AND project_id = ${projectId}
          AND tenant_id = ${tenantId}
      `
      if (existing.rows.length === 0) continue
      const row = existing.rows[0] as Record<string, unknown>

      const word = update.word !== undefined ? update.word : (row['word'] as string)
      const startTime =
        update.startTime !== undefined ? update.startTime : Number(row['start_time'])
      const endTime = update.endTime !== undefined ? update.endTime : Number(row['end_time'])

      await sql`
        UPDATE video_editor_captions SET
          word = ${word},
          start_time = ${startTime},
          end_time = ${endTime},
          is_edited = TRUE
        WHERE id = ${update.id}
          AND project_id = ${projectId}
          AND tenant_id = ${tenantId}
      `
    }

    const result = await sql`
      SELECT *
      FROM video_editor_captions
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY sort_order ASC
    `
    return result.rows.map((r) => mapCaptionRow(r as Record<string, unknown>))
  })
}

export async function deleteCaptions(tenantId: string, projectId: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM video_editor_captions
      WHERE project_id = ${projectId} AND tenant_id = ${tenantId}
    `
    return (result.rowCount ?? 0) > 0
  })
}
