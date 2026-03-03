export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * PUT /api/admin/video-editor/projects/[id]/scenes/[sceneId]/clip
 *
 * Swaps the clip on a scene. Called when a user selects a different asset
 * from the DAM in the Creative Studio timeline.
 * If the project is linked to an openCLAW session, pushes the edit back to the gateway.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { pushToGateway } from '@/lib/openclaw-gateway'

interface RouteParams {
  params: Promise<{ id: string; sceneId: string }>
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id: projectId, sceneId } = await params
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

  const { clipAssetId, clipSegmentId, clipStart, clipEnd } = body as {
    clipAssetId?: string
    clipSegmentId?: string
    clipStart?: number
    clipEnd?: number
  }

  if (!clipAssetId) {
    return NextResponse.json({ error: 'clipAssetId required' }, { status: 400 })
  }

  return withTenant(tenantSlug, async () => {
    const sceneCheck = await sql`
      SELECT id FROM video_editor_scenes
      WHERE id = ${sceneId}
        AND project_id = ${projectId}
        AND tenant_id = ${tenantSlug}
    `
    if (sceneCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    await sql`
      UPDATE video_editor_scenes SET
        clip_asset_id = ${clipAssetId},
        clip_segment_id = ${clipSegmentId ?? null},
        clip_start = ${clipStart ?? null},
        clip_end = ${clipEnd ?? null}
      WHERE id = ${sceneId} AND tenant_id = ${tenantSlug}
    `

    const activityData = JSON.stringify({ sceneId, clipAssetId, userId })
    await sql`
      INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
      VALUES (
        ${tenantSlug},
        ${projectId},
        'user',
        'scene_clip_changed',
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
        `[STUDIO_EDIT] clip changed on scene ${sceneId} for session ${project.openclaw_session_id}: asset=${clipAssetId}`
      )
    }

    return NextResponse.json({ message: 'Clip updated' })
  })
}
