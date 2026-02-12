export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPerformanceLeaderboard } from '@/lib/creators/analytics'
import type { AnalyticsPeriod, LeaderboardMetric } from '@/lib/creators/analytics-types'

const VALID_PERIODS = ['7d', '30d', '90d', '12m', 'all'] as const
const VALID_METRICS = ['earnings', 'projects', 'response_time', 'delivery_speed', 'quality'] as const

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const periodParam = url.searchParams.get('period') || '30d'
  const metricParam = url.searchParams.get('metric') || 'earnings'
  const limitParam = url.searchParams.get('limit') || '10'

  const period: AnalyticsPeriod = VALID_PERIODS.includes(periodParam as AnalyticsPeriod)
    ? (periodParam as AnalyticsPeriod)
    : '30d'

  const metric: LeaderboardMetric = VALID_METRICS.includes(metricParam as LeaderboardMetric)
    ? (metricParam as LeaderboardMetric)
    : 'earnings'

  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100)

  try {
    const leaderboard = await getPerformanceLeaderboard(tenantSlug, metric, period, limit)
    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error fetching performance leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}
