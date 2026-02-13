export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createTenantCache, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCohortData } from '@/lib/attribution'
import type { CohortGrouping } from '@/lib/attribution'

const CACHE_KEY_PREFIX = 'attribution-cohorts'
const CACHE_TTL = 600

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const grouping = (searchParams.get('grouping') || 'monthly') as CohortGrouping
  const startDate = searchParams.get('startDate') || getDefaultStartDate()
  const endDate = searchParams.get('endDate') || getDefaultEndDate()
  const channel = searchParams.get('channel') || undefined

  const cacheKey = `${CACHE_KEY_PREFIX}:${grouping}:${startDate}:${endDate}:${channel || 'all'}`
  const cache = createTenantCache(tenantSlug)

  const cached = await cache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const cohorts = await withTenant(tenantSlug, () =>
    getCohortData(tenantId, grouping, startDate, endDate, channel)
  )

  const response = { cohorts, grouping }
  await cache.set(cacheKey, response, { ttl: CACHE_TTL })

  return NextResponse.json(response)
}

function getDefaultStartDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 6)
  const parts = date.toISOString().split('T')
  return parts[0] ?? ''
}

function getDefaultEndDate(): string {
  const parts = new Date().toISOString().split('T')
  return parts[0] ?? ''
}
