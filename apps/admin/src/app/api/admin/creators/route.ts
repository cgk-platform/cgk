export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreators, getCreatorsByStage } from '@/lib/creators/db'
import { parseCreatorFilters } from '@/lib/search-params'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const view = url.searchParams.get('view')

  if (view === 'pipeline') {
    const stages = await getCreatorsByStage(tenantSlug)
    return NextResponse.json({ stages })
  }

  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const filters = parseCreatorFilters(params)
  const { rows, totalCount } = await getCreators(tenantSlug, filters)

  return NextResponse.json({
    creators: rows,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  })
}
