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
    // Filter to valid updates (must have id)
    const validUpdates = updates.filter((u) => u.id)
    if (validUpdates.length === 0) {
      return NextResponse.json({ message: 'No valid updates', count: 0 })
    }

    // B7: Batch update using unnest() — single query instead of 2N individual queries
    const ids = `{${validUpdates.map((u) => u.id!).join(',')}}`
    const words = `{${validUpdates.map((u) => `"${(u.word ?? '').replace(/"/g, '\\"')}"`).join(',')}}`
    const startTimes = `{${validUpdates.map((u) => u.startTime ?? -1).join(',')}}`
    const endTimes = `{${validUpdates.map((u) => u.endTime ?? -1).join(',')}}`
    const hasWord = `{${validUpdates.map((u) => (u.word !== undefined ? 't' : 'f')).join(',')}}`
    const hasStart = `{${validUpdates.map((u) => (u.startTime !== undefined ? 't' : 'f')).join(',')}}`
    const hasEnd = `{${validUpdates.map((u) => (u.endTime !== undefined ? 't' : 'f')).join(',')}}`

    const updateResult = await sql`
      UPDATE video_editor_captions c SET
        word = CASE WHEN u.has_word THEN u.word ELSE c.word END,
        start_time = CASE WHEN u.has_start THEN u.start_time ELSE c.start_time END,
        end_time = CASE WHEN u.has_end THEN u.end_time ELSE c.end_time END,
        is_edited = TRUE
      FROM unnest(
        ${ids}::text[],
        ${words}::text[],
        ${startTimes}::numeric[],
        ${endTimes}::numeric[],
        ${hasWord}::boolean[],
        ${hasStart}::boolean[],
        ${hasEnd}::boolean[]
      ) AS u(id, word, start_time, end_time, has_word, has_start, has_end)
      WHERE c.id = u.id
        AND c.project_id = ${projectId}
        AND c.tenant_id = ${tenantSlug}
    `

    const updatedCount = updateResult.rowCount ?? validUpdates.length

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
