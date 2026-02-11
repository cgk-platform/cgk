export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCustomerJourneys } from '@/lib/attribution'
import type { AttributionWindow, JourneysListParams } from '@/lib/attribution'

const CACHE_KEY_PREFIX = 'attribution-journeys'
const CACHE_TTL = 180 // 3 minutes

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? undefined
  const customerType = (searchParams.get('customerType') ?? 'all') as JourneysListParams['customerType']
  const window = (searchParams.get('window') ?? '7d') as AttributionWindow
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const params: JourneysListParams = {
    search,
    customerType,
    window,
    limit: Math.min(limit, 100),
    offset,
  }

  const cacheKey = `${CACHE_KEY_PREFIX}:${JSON.stringify(params)}`
  const cache = createTenantCache(tenantSlug)

  const cached = await cache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const result = await withTenant(tenantSlug, () => getCustomerJourneys(tenantId, params))

  await cache.set(cacheKey, result, { ttl: CACHE_TTL })

  return NextResponse.json(result)
}
