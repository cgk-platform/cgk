export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPathAnalysis } from '@/lib/attribution'
import type { AttributionWindow } from '@/lib/attribution'

const CACHE_KEY_PREFIX = 'attribution-paths'
const CACHE_TTL = 300 // 5 minutes

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const window = (searchParams.get('window') ?? '7d') as AttributionWindow

  const cacheKey = `${CACHE_KEY_PREFIX}:${window}`
  const cache = createTenantCache(tenantSlug)

  const cached = await cache.get(cacheKey)
  if (cached) {
    return NextResponse.json({ pathAnalysis: cached })
  }

  const pathAnalysis = await withTenant(tenantSlug, () => getPathAnalysis(tenantId, window))

  await cache.set(cacheKey, pathAnalysis, { ttl: CACHE_TTL })

  return NextResponse.json({ pathAnalysis })
}
