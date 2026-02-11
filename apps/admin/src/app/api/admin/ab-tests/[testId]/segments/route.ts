export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSegmentData } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]/segments
 * Get segment breakdown for a test
 */
export async function GET(request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params
  const url = new URL(request.url)
  const segmentType = url.searchParams.get('type') as 'device' | 'country' | 'source'

  if (!segmentType || !['device', 'country', 'source'].includes(segmentType)) {
    return NextResponse.json(
      { error: 'Invalid segment type. Must be device, country, or source' },
      { status: 400 }
    )
  }

  const segments = await getSegmentData(tenantSlug, testId, segmentType)

  return NextResponse.json({ segments })
}
