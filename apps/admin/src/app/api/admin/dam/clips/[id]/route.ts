export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: assetId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  return withTenant(tenantSlug, async () => {
    const assetResult = await sql`
      SELECT * FROM dam_assets
      WHERE id = ${assetId} AND tenant_id = ${tenantSlug}
    `

    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    const segmentsResult = await sql`
      SELECT
        id,
        start_time,
        end_time,
        description,
        subjects,
        camera,
        mood,
        motion,
        text_overlay,
        text_overlay_severity,
        quality_score,
        quality_notes
      FROM dam_clip_segments
      WHERE asset_id = ${assetId} AND tenant_id = ${tenantSlug}
      ORDER BY start_time ASC
    `

    const usageResult = await sql`
      SELECT
        p.id AS project_id,
        p.title AS project_title,
        s.scene_number,
        s.role
      FROM video_editor_scenes s
      JOIN video_editor_projects p ON p.id = s.project_id
      WHERE s.clip_asset_id = ${assetId} AND s.tenant_id = ${tenantSlug}
      ORDER BY p.created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      asset: assetResult.rows[0],
      segments: segmentsResult.rows,
      usedInProjects: usageResult.rows,
    })
  })
}
