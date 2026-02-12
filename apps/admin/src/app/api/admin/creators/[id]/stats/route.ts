export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getIndividualCreatorStats } from '@/lib/creators/analytics'
import { getCreatorStats } from '@/lib/creators/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const periodParam = url.searchParams.get('period') || '30d'
  const detailed = url.searchParams.get('detailed') === 'true'
  const validPeriods = ['7d', '30d', '90d', 'all']
  const period = validPeriods.includes(periodParam)
    ? (periodParam as '7d' | '30d' | '90d' | 'all')
    : '30d'

  // Return detailed analytics if requested
  if (detailed) {
    const detailedStats = await getIndividualCreatorStats(tenantSlug, id)
    if (!detailedStats) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }
    return NextResponse.json({ stats: detailedStats, detailed: true })
  }

  // Return basic stats
  const stats = await getCreatorStats(tenantSlug, id, period)

  return NextResponse.json({ stats, period })
}
