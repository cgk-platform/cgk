export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getDataQualityMetrics } from '@/lib/attribution'

const CACHE_KEY = 'attribution-data-quality'
const CACHE_TTL = 60 // 1 minute (more frequent updates for real-time health)

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ metrics: cached })
  }

  const metrics = await withTenant(tenantSlug, () => getDataQualityMetrics(tenantId))

  await cache.set(CACHE_KEY, metrics, { ttl: CACHE_TTL })

  return NextResponse.json({ metrics })
}
