/**
 * @cgk-platform/video-editor - Render upload pipeline
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { QCResult } from '../types.js'

// ============================================================================
// Types
// ============================================================================

export interface UploadRenderInput {
  projectId: string
  renderUrl: string
  thumbnailUrl?: string
  durationSeconds?: number
  fileSizeBytes?: number
  captionStyle?: string
  voiceName?: string
  variantSuffix?: string
  qcResults?: Array<{ name: string; status: string; message: string }>
}

export interface UploadRenderResult {
  renderId: string
  blobUrl: string
  muxPlaybackId?: string
}

// ============================================================================
// Upload operation
// ============================================================================

export async function createRenderRecord(
  tenantId: string,
  input: UploadRenderInput
): Promise<UploadRenderResult> {
  return withTenant(tenantId, async () => {
    const qcResults = input.qcResults != null ? JSON.stringify(input.qcResults as QCResult[]) : null

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
        ${input.projectId},
        ${input.variantSuffix ?? null},
        ${input.renderUrl},
        ${input.thumbnailUrl ?? null},
        ${input.durationSeconds ?? null},
        ${input.fileSizeBytes ?? null},
        ${input.captionStyle ?? null},
        ${input.voiceName ?? null},
        ${qcResults}::jsonb
      )
      RETURNING id
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create render record')
    }
    const renderId = row['id'] as string

    await sql`
      UPDATE video_editor_projects SET
        render_url = ${input.renderUrl},
        status = 'rendered'
      WHERE id = ${input.projectId} AND tenant_id = ${tenantId}
    `

    const activityData = JSON.stringify({
      renderId,
      variantSuffix: input.variantSuffix ?? null,
      durationSeconds: input.durationSeconds ?? null,
    })

    await sql`
      INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
      VALUES (
        ${tenantId},
        ${input.projectId},
        'agent',
        'render_completed',
        ${activityData}::jsonb
      )
    `

    return {
      renderId,
      blobUrl: input.renderUrl,
    }
  })
}
