export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/video-editor/projects/pull-edits?sessionId=xxx
 *
 * Agent-facing endpoint: returns user-edited captions and scene reorder state
 * for a given openCLAW session. The agent calls this before rendering to ensure
 * it uses the latest user edits from the Creative Studio.
 *
 * Auth: tenant API key (x-api-key header).
 */

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

import { validateTenantApiKey } from '@/lib/api-key-auth'

export async function GET(request: Request) {
  const auth = await validateTenantApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId query param required' }, { status: 400 })
  }

  const { tenantSlug } = auth

  return withTenant(tenantSlug, async () => {
    // Find the project by session ID
    const projectResult = await sql`
      SELECT id FROM video_editor_projects
      WHERE openclaw_session_id = ${sessionId}
        AND tenant_id = ${tenantSlug}
    `

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found for session' }, { status: 404 })
    }

    const projectId = (projectResult.rows[0] as Record<string, unknown>)['id'] as string

    // Fetch edited captions
    const captionsResult = await sql`
      SELECT word, start_time, end_time, sort_order
      FROM video_editor_captions
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantSlug}
        AND is_edited = TRUE
      ORDER BY sort_order ASC
    `

    // Fetch current scene order
    const scenesResult = await sql`
      SELECT scene_number, sort_order
      FROM video_editor_scenes
      WHERE project_id = ${projectId}
        AND tenant_id = ${tenantSlug}
      ORDER BY sort_order ASC
    `

    const editedCaptions = captionsResult.rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        word: row['word'] as string,
        startTime: Number(row['start_time']),
        endTime: Number(row['end_time']),
        sortOrder: Number(row['sort_order']),
      }
    })

    const sceneOrder = scenesResult.rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        sceneNumber: Number(row['scene_number']),
        sortOrder: Number(row['sort_order']),
      }
    })

    return NextResponse.json({
      sessionId,
      projectId,
      editedCaptions,
      sceneOrder,
      hasEdits: editedCaptions.length > 0,
    })
  })
}
