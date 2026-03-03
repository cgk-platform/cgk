export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET   /api/admin/video-editor/projects/[id]/captions
 * PATCH /api/admin/video-editor/projects/[id]/captions
 *
 * GET returns all caption words for a project ordered by sort_order.
 * PATCH accepts bulk word/timing edits from the Creative Studio caption editor.
 * If the project is linked to an openCLAW session, pushes edits back to the gateway.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { pushToGateway } from '@/lib/openclaw-gateway'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: projectId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, word, start_time, end_time, sort_order, is_edited
      FROM video_editor_captions
      WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
      ORDER BY sort_order ASC
    `
    return NextResponse.json({ captions: result.rows })
  })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: projectId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { updates } = body as {
    updates?: Array<{
      id?: string
      word?: string
      startTime?: number
      endTime?: number
    }>
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates array required' }, { status: 400 })
  }

  return withTenant(tenantSlug, async () => {
    let updatedCount = 0

    for (const update of updates) {
      if (!update.id) continue

      const current = await sql`
        SELECT word, start_time, end_time FROM video_editor_captions
        WHERE id = ${update.id}
          AND project_id = ${projectId}
          AND tenant_id = ${tenantSlug}
      `
      if (current.rows.length === 0) continue

      const row = current.rows[0] as Record<string, unknown>
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
          AND tenant_id = ${tenantSlug}
      `
      updatedCount++
    }

    const activityData = JSON.stringify({ count: updatedCount, userId })
    await sql`
      INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
      VALUES (
        ${tenantSlug},
        ${projectId},
        'user',
        'caption_edited',
        ${activityData}::jsonb
      )
    `

    // Push edit back to openCLAW if project is linked
    const projectResult = await sql<{
      openclaw_session_id: string | null
      openclaw_profile: string | null
    }>`
      SELECT openclaw_session_id, openclaw_profile
      FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `

    const project = projectResult.rows[0]
    if (project?.openclaw_session_id && project.openclaw_profile) {
      pushToGateway(
        project.openclaw_profile,
        'video-editor',
        `[STUDIO_EDIT] ${updatedCount} caption(s) edited for session ${project.openclaw_session_id}`
      )
    }

    return NextResponse.json({ message: 'Captions updated', count: updatedCount })
  })
}
