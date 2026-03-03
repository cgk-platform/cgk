export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const minQuality = parseInt(url.searchParams.get('minQuality') || '3', 10)

  return withTenant(tenantSlug, async () => {
    const countResult = await sql`
      SELECT COUNT(DISTINCT a.id) AS count
      FROM dam_assets a
      WHERE a.tenant_id = ${tenantSlug}
        AND a.asset_type = 'video'
        AND (a.has_burned_captions = FALSE OR a.has_burned_captions IS NULL)
        AND a.is_active = TRUE
    `

    const result = await sql`
      SELECT
        a.*,
        COUNT(s.id) AS segment_count,
        AVG(s.quality_score) AS avg_quality
      FROM dam_assets a
      LEFT JOIN dam_clip_segments s ON s.asset_id = a.id AND s.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantSlug}
        AND a.asset_type = 'video'
        AND (a.has_burned_captions = FALSE OR a.has_burned_captions IS NULL)
        AND a.is_active = TRUE
      GROUP BY a.id
      HAVING AVG(s.quality_score) >= ${minQuality} OR COUNT(s.id) = 0
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return NextResponse.json({
      clips: result.rows,
      totalCount: Number(countResult.rows[0]?.count || 0),
      filters: { excludeBurnedCaptions: true, minQuality },
    })
  })
}
