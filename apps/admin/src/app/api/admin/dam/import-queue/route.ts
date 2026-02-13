export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getQueueItems, getQueueStats, type ImportQueueFilters } from '@cgk-platform/dam'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Check if stats are requested
  if (url.searchParams.get('stats') === 'true') {
    const stats = await withTenant(tenantSlug, () => getQueueStats(tenantSlug))
    return NextResponse.json({ stats })
  }

  const filters: ImportQueueFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10)),
    offset: 0,
    status: url.searchParams.get('status') as ImportQueueFilters['status'] || undefined,
    source_type: url.searchParams.get('source') as ImportQueueFilters['source_type'] || undefined,
    assigned_to: url.searchParams.get('assigned') || undefined,
    sort: url.searchParams.get('sort') || 'created_at',
    dir: (url.searchParams.get('dir') || 'desc') as 'asc' | 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await withTenant(tenantSlug, () => getQueueItems(tenantSlug, filters)) as { items: unknown[]; totalCount: number }

  return NextResponse.json({
    items: result.items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}
