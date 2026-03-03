/**
 * @cgk-platform/video-editor - Activity logging
 *
 * @ai-pattern tenant-isolation
 * @ai-required All queries MUST use withTenant() wrapper
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { LogActivityInput, VideoEditorActivity } from '../types.js'

// ============================================================================
// Row mapper
// ============================================================================

function mapActivityRow(row: Record<string, unknown>): VideoEditorActivity {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    projectId: row['project_id'] as string,
    source: row['source'] as VideoEditorActivity['source'],
    action: row['action'] as string,
    data: row['data'] as Record<string, unknown> | null,
    createdAt: new Date(row['created_at'] as string),
  }
}

// ============================================================================
// Operations
// ============================================================================

export async function logActivity(
  tenantId: string,
  projectId: string,
  input: LogActivityInput
): Promise<VideoEditorActivity> {
  return withTenant(tenantId, async () => {
    const data = input.data != null ? JSON.stringify(input.data) : null

    const result = await sql`
      INSERT INTO video_editor_activity (
        tenant_id,
        project_id,
        source,
        action,
        data
      ) VALUES (
        ${tenantId},
        ${projectId},
        ${input.source},
        ${input.action},
        ${data}::jsonb
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to log activity')
    }
    return mapActivityRow(row as Record<string, unknown>)
  })
}

export async function getActivityLog(
  tenantId: string,
  projectId: string,
  limit = 50,
  after?: string
): Promise<VideoEditorActivity[]> {
  return withTenant(tenantId, async () => {
    if (after) {
      const result = await sql`
        SELECT *
        FROM video_editor_activity
        WHERE project_id = ${projectId}
          AND tenant_id = ${tenantId}
          AND created_at > (
            SELECT created_at FROM video_editor_activity WHERE id = ${after}
          )
        ORDER BY created_at ASC
        LIMIT ${limit}
      `
      return result.rows.map((r) => mapActivityRow(r as Record<string, unknown>))
    } else {
      const result = await sql`
        SELECT *
        FROM video_editor_activity
        WHERE project_id = ${projectId}
          AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return result.rows.map((r) => mapActivityRow(r as Record<string, unknown>))
    }
  })
}
