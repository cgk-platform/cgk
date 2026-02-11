export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getResponses, getResponse } from '@/lib/surveys'
import type { ResponseFilters } from '@/lib/surveys'

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

  // Check if requesting a specific response
  const responseId = url.searchParams.get('responseId')
  if (responseId) {
    const response = await getResponse(tenantSlug, responseId)
    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }
    return NextResponse.json({ response })
  }

  const filters: ResponseFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))),
    offset: 0,
    surveyId,
    isComplete: url.searchParams.get('isComplete') === 'true'
      ? true
      : url.searchParams.get('isComplete') === 'false'
        ? false
        : undefined,
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    attributionSource: url.searchParams.get('attributionSource') || undefined,
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await getResponses(tenantSlug, filters)

  return NextResponse.json({
    responses: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}
