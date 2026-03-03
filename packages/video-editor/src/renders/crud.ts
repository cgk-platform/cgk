/**
 * @cgk-platform/video-editor - Render history CRUD
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { QCResult, VideoEditorRender } from '../types.js'

// ============================================================================
// Row mapper
// ============================================================================

function mapRenderRow(row: Record<string, unknown>): VideoEditorRender {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    projectId: row['project_id'] as string,
    variantSuffix: row['variant_suffix'] as string | null,
    renderUrl: row['render_url'] as string,
    thumbnailUrl: row['thumbnail_url'] as string | null,
    durationSeconds: row['duration_seconds'] != null ? Number(row['duration_seconds']) : null,
    fileSizeBytes: row['file_size_bytes'] != null ? Number(row['file_size_bytes']) : null,
    captionStyle: row['caption_style'] as string | null,
    voiceName: row['voice_name'] as string | null,
    qcResults: row['qc_results'] as QCResult[] | null,
    renderedAt: new Date(row['rendered_at'] as string),
  }
}

// ============================================================================
// Render input type (internal — not in types.ts per spec)
// ============================================================================

interface CreateRenderInput {
  renderUrl: string
  variantSuffix?: string
  thumbnailUrl?: string
  durationSeconds?: number
  fileSizeBytes?: number
  captionStyle?: string
  voiceName?: string
  qcResults?: QCResult[]
}

// ============================================================================
// Operations
// ============================================================================

export async function createRender(
  tenantId: string,
  projectId: string,
  input: CreateRenderInput
): Promise<VideoEditorRender> {
  return withTenant(tenantId, async () => {
    const qcResults = input.qcResults != null ? JSON.stringify(input.qcResults) : null

    const result = await sql`
      INSERT INTO video_editor_renders (
        tenant_id,
        project_id,
        variant_suffix,
        render_url,
        thumbnail_url,
        duration_seconds,
        file_size_bytes,
        caption_style,
        voice_name,
        qc_results
      ) VALUES (
        ${tenantId},
        ${projectId},
        ${input.variantSuffix ?? null},
        ${input.renderUrl},
        ${input.thumbnailUrl ?? null},
        ${input.durationSeconds ?? null},
        ${input.fileSizeBytes ?? null},
        ${input.captionStyle ?? null},
        ${input.voiceName ?? null},
        ${qcResults}::jsonb
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create render record')
    }
    return mapRenderRow(row as Record<string, unknown>)
  })
}

export async function getRenders(
  tenantId: string,
  projectId: string
): Promise<VideoEditorRender[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM video_editor_renders
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY rendered_at DESC
    `
    return result.rows.map((r) => mapRenderRow(r as Record<string, unknown>))
  })
}

export async function getLatestRender(
  tenantId: string,
  projectId: string
): Promise<VideoEditorRender | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM video_editor_renders
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantId}
      ORDER BY rendered_at DESC
      LIMIT 1
    `
    const row = result.rows[0]
    if (!row) return null
    return mapRenderRow(row as Record<string, unknown>)
  })
}
