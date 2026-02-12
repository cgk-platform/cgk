export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getEarningsAnalytics } from '@/lib/creators/analytics'
import type { AnalyticsPeriod } from '@/lib/creators/analytics-types'

const VALID_PERIODS = ['7d', '30d', '90d', '12m', 'all'] as const

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const periodParam = url.searchParams.get('period') || '30d'
  const period: AnalyticsPeriod = VALID_PERIODS.includes(periodParam as AnalyticsPeriod)
    ? (periodParam as AnalyticsPeriod)
    : '30d'

  try {
    const earnings = await getEarningsAnalytics(tenantSlug, period)
    return NextResponse.json(earnings)
  } catch (error) {
    console.error('Error fetching earnings analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    )
  }
}
