export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/video-editor/projects/[id]/scenes/reorder
 *
 * Updates sort_order and scene_number for each scene in the supplied order.
 * Called by the Creative Studio drag-and-drop UI when the user reorders scenes.
 * If the project is linked to an openCLAW session, pushes the edit back to the gateway.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { pushToGateway } from '@/lib/openclaw-gateway'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
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

  const { sceneIds } = body as { sceneIds?: unknown }

  if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
    return NextResponse.json({ error: 'sceneIds array required' }, { status: 400 })
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!sceneIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    return NextResponse.json({ error: 'sceneIds must be valid UUIDs' }, { status: 400 })
  }

  return withTenant(tenantSlug, async () => {
    const projectCheck = await sql<{
      id: string
      openclaw_session_id: string | null
      openclaw_profile: string | null
    }>`
      SELECT id, openclaw_session_id, openclaw_profile
      FROM video_editor_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantSlug}
    `
    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const idArray = `{${(sceneIds as string[]).join(',')}}`
    const orderArray = `{${(sceneIds as string[]).map((_, i) => i).join(',')}}`
    const numberArray = `{${(sceneIds as string[]).map((_, i) => i + 1).join(',')}}`
    await sql`
      UPDATE video_editor_scenes AS s SET
        sort_order = d.new_order,
        scene_number = d.new_number
      FROM unnest(${idArray}::uuid[], ${orderArray}::int[], ${numberArray}::int[])
        AS d(scene_id, new_order, new_number)
      WHERE s.id = d.scene_id
        AND s.project_id = ${projectId}
        AND s.tenant_id = ${tenantSlug}
    `

    const activityData = JSON.stringify({ sceneIds, userId })
    await sql`
      INSERT INTO video_editor_activity (tenant_id, project_id, source, action, data)
      VALUES (
        ${tenantSlug},
        ${projectId},
        'user',
        'scene_reordered',
        ${activityData}::jsonb
      )
    `

    // Push edit back to openCLAW if project is linked
    const project = projectCheck.rows[0]
    if (project.openclaw_session_id && project.openclaw_profile) {
      pushToGateway(
        project.openclaw_profile,
        'video-editor',
        `[STUDIO_EDIT] scenes reordered for session ${project.openclaw_session_id}: ${sceneIds.join(',')}`
      )
    }

    return NextResponse.json({ message: 'Scenes reordered', sceneCount: sceneIds.length })
  })
}
