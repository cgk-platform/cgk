export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET  /api/admin/video-editor/projects/[id]
 * PATCH /api/admin/video-editor/projects/[id]
 *
 * Fetch a single video editor project with scenes, renders, and activity.
 * PATCH updates mutable project fields (title, voice, caption style, etc.).
 */

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const projectResult = await sql`
      SELECT * FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const scenesResult = await sql`
      SELECT
        s.*,
        a.title AS clip_title,
        a.thumbnail_url AS clip_thumbnail,
        a.mux_playback_id AS clip_mux_playback_id
      FROM video_editor_scenes s
      LEFT JOIN dam_assets a ON a.id = s.clip_asset_id
      WHERE s.project_id = ${projectId} AND s.tenant_id = ${tenantSlug}
      ORDER BY s.sort_order ASC
    `

    const captionCountResult = await sql`
      SELECT COUNT(*) AS count FROM video_editor_captions
      WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
    `

    const rendersResult = await sql`
      SELECT * FROM video_editor_renders
      WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
      ORDER BY rendered_at DESC
      LIMIT 10
    `

    const activityResult = await sql`
      SELECT * FROM video_editor_activity
      WHERE project_id = ${projectId} AND tenant_id = ${tenantSlug}
      ORDER BY created_at DESC
      LIMIT 30
    `

    return NextResponse.json({
      project: projectResult.rows[0],
      scenes: scenesResult.rows,
      captionCount: Number(captionCountResult.rows[0]?.['count'] ?? 0),
      renders: rendersResult.rows,
      activity: activityResult.rows,
    })
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

  const { title, captionStyle, voiceId, voiceName, musicVolume, status } = body as {
    title?: string
    captionStyle?: string
    voiceId?: string
    voiceName?: string
    musicVolume?: number
    status?: string
  }

  return withTenant(tenantSlug, async () => {
    const current = await sql`
      SELECT * FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const row = current.rows[0] as Record<string, unknown>

    const newTitle = title ?? (row['title'] as string)
    const newCaptionStyle =
      captionStyle !== undefined ? captionStyle : (row['caption_style'] as string | null)
    const newVoiceId = voiceId !== undefined ? voiceId : (row['voice_id'] as string | null)
    const newVoiceName = voiceName !== undefined ? voiceName : (row['voice_name'] as string | null)
    const newMusicVolume = musicVolume ?? Number(row['music_volume'] ?? 0.15)
    const newStatus = status ?? (row['status'] as string)

    await sql`
      UPDATE video_editor_projects SET
        title = ${newTitle},
        caption_style = ${newCaptionStyle},
        voice_id = ${newVoiceId},
        voice_name = ${newVoiceName},
        music_volume = ${newMusicVolume},
        status = ${newStatus}
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `

    const changes: string[] = []
    if (title !== undefined && title !== row['title']) changes.push('title')
    if (captionStyle !== undefined && captionStyle !== row['caption_style'])
      changes.push('caption_style')
    if (voiceName !== undefined && voiceName !== row['voice_name']) changes.push('voice')
    if (musicVolume !== undefined && musicVolume !== Number(row['music_volume']))
      changes.push('music_volume')
    if (status !== undefined && status !== row['status']) changes.push('status')

    if (changes.length > 0) {
      const action = changes.includes('voice')
        ? 'voice_changed'
        : changes.includes('caption_style')
          ? 'caption_style_changed'
          : 'project_updated'

      const activityData = JSON.stringify({ changes, userId })
      await sql`
        INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
        VALUES (
          ${tenantSlug},
          ${projectId},
          'user',
          ${action},
          ${activityData}::jsonb
        )
      `
    }

    return NextResponse.json({ message: 'Project updated', changes })
  })
}
