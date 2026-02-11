export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  generateAIInsights,
  getAIInsightsCache,
  saveAIInsightsCache,
} from '@/lib/attribution'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)

  const endDate = searchParams.get('endDate') ?? new Date().toISOString().split('T')[0]
  const startDate =
    searchParams.get('startDate') ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Check cache first
  const cached = await withTenant(tenantSlug, () =>
    getAIInsightsCache(tenantId, startDate!, endDate!)
  )

  if (cached) {
    return NextResponse.json({ insights: cached.insights, cached: true })
  }

  // Generate fresh insights
  const insights = await withTenant(tenantSlug, () =>
    generateAIInsights(tenantId, startDate!, endDate!)
  )

  // Save to cache
  await withTenant(tenantSlug, () =>
    saveAIInsightsCache(tenantId, startDate!, endDate!, insights)
  )

  return NextResponse.json({ insights, cached: false })
}
