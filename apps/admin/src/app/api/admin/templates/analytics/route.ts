export const dynamic = 'force-dynamic'

import { getTemplateAnalytics } from '@cgk-platform/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/templates/analytics
 *
 * Get template performance analytics.
 * Returns send counts, open rates, click rates per template.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') as '7d' | '30d' | '90d' | null

  try {
    const analytics = await getTemplateAnalytics(
      tenantSlug,
      period || '30d'
    )

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching template analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template analytics' },
      { status: 500 }
    )
  }
}
