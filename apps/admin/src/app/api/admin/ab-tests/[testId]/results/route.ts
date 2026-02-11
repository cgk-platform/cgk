export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTestResults, getTimeSeriesData, getFunnelData } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]/results
 * Get test results with optional time series and funnel data
 */
export async function GET(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params
  const url = new URL(request.url)

  const results = await getTestResults(tenantSlug, testId)
  if (!results) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  }

  // Include time series data if requested
  if (url.searchParams.get('timeSeries') === 'true') {
    const timeSeries = await getTimeSeriesData(tenantSlug, testId)
    return NextResponse.json({ ...results, timeSeries })
  }

  // Include funnel data if requested
  if (url.searchParams.get('funnel') === 'true') {
    const funnel = await getFunnelData(tenantSlug, testId)
    return NextResponse.json({ ...results, funnel })
  }

  return NextResponse.json(results)
}
