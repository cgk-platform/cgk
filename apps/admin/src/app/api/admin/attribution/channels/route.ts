export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getChannelHierarchy, getChannelTrends } from '@/lib/attribution'
import type { AttributionModel, AttributionWindow, CustomerType, QuickFilter } from '@/lib/attribution'

const CACHE_KEY_PREFIX = 'attribution-channels'
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
  const customerType = (searchParams.get('customerType') || 'all') as CustomerType
  const quickFilter = (searchParams.get('quickFilter') || 'all') as QuickFilter
  const parentId = searchParams.get('parentId') || null
  const trendChannels = searchParams.get('trendChannels')?.split(',').filter(Boolean) || []

  const cacheKey = `${CACHE_KEY_PREFIX}:${model}:${window}:${startDate}:${endDate}:${customerType}:${quickFilter}:${parentId || 'root'}`
  const cache = createTenantCache(tenantSlug)

  const cached = await cache.get(cacheKey)
  if (cached && trendChannels.length === 0) {
    return NextResponse.json(cached)
  }

  const channels = await withTenant(tenantSlug, () =>
    getChannelHierarchy({
      tenantId,
      model,
      window,
      startDate,
      endDate,
      customerType,
      quickFilter,
      parentId,
    })
  )

  let trends: Record<string, unknown> = {}
  if (trendChannels.length > 0) {
    trends = await withTenant(tenantSlug, () =>
      getChannelTrends(tenantId, model, window, startDate, endDate, trendChannels)
    )
  }

  const response = { channels, trends }
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
