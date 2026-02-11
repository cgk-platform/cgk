export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSurveyStats, getAttributionBreakdown, getNpsOverTime } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id: surveyId } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const groupBy = url.searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day'

  const options = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  }

  const [stats, attribution, npsTrend] = await Promise.all([
    getSurveyStats(tenantSlug, surveyId, options),
    getAttributionBreakdown(tenantSlug, options),
    getNpsOverTime(tenantSlug, { surveyId, ...options, groupBy }),
  ])

  return NextResponse.json({
    stats,
    attribution,
    npsTrend,
  })
}
