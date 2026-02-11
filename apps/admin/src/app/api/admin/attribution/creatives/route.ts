export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreativePerformance } from '@/lib/attribution'
import type { AttributionModel, AttributionWindow, CreativeFilters, CreativePlatform } from '@/lib/attribution'

const CACHE_KEY_PREFIX = 'attribution-creatives'
const CACHE_TTL = 300

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const model = (searchParams.get('model') || 'time_decay') as AttributionModel
  const window = (searchParams.get('window') || '7d') as AttributionWindow
  const startDate = searchParams.get('startDate') || getDefaultStartDate()
  const endDate = searchParams.get('endDate') || getDefaultEndDate()

  const filters: CreativeFilters = {
    search: searchParams.get('search') || undefined,
    sortBy: (searchParams.get('sortBy') as CreativeFilters['sortBy']) || 'revenue',
    sortOrder: (searchParams.get('sortOrder') as CreativeFilters['sortOrder']) || 'desc',
    hideInactive: searchParams.get('hideInactive') === 'true',
    platforms: searchParams.get('platforms')?.split(',').filter(Boolean) as CreativePlatform[] | undefined,
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${model}:${window}:${startDate}:${endDate}:${JSON.stringify(filters)}`
  const cache = createTenantCache(tenantSlug)

  const cached = await cache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const creatives = await withTenant(tenantSlug, () =>
    getCreativePerformance(tenantId, model, window, startDate, endDate, filters)
  )

  const response = { creatives }
  await cache.set(cacheKey, response, { ttl: CACHE_TTL })

  return NextResponse.json(response)
}

function getDefaultStartDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  const parts = date.toISOString().split('T')
  return parts[0] ?? ''
}

function getDefaultEndDate(): string {
  const parts = new Date().toISOString().split('T')
  return parts[0] ?? ''
}
