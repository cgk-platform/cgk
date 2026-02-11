/**
 * GET /api/admin/creator-pipeline/stats
 * Get pipeline statistics with trends
 */

import { headers } from 'next/headers'

import { getPipelineStats } from '@/lib/pipeline/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const stats = await getPipelineStats(tenantSlug)
    return Response.json(stats)
  } catch (error) {
    console.error('Pipeline stats error:', error)
    return Response.json(
      { error: 'Failed to fetch pipeline stats' },
      { status: 500 }
    )
  }
}
