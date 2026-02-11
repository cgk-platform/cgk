/**
 * GET /api/admin/creator-pipeline/analytics
 * Get pipeline analytics data
 */

import { headers } from 'next/headers'

import { getPipelineAnalytics } from '@/lib/pipeline/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d'

    const analytics = await getPipelineAnalytics(tenantSlug, period)
    return Response.json(analytics)
  } catch (error) {
    console.error('Pipeline analytics error:', error)
    return Response.json(
      { error: 'Failed to fetch pipeline analytics' },
      { status: 500 }
    )
  }
}
