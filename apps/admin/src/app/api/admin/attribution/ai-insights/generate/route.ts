export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { generateAIInsights, saveAIInsightsCache } from '@/lib/attribution'

interface GenerateRequest {
  startDate: string
  endDate: string
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = (await request.json()) as GenerateRequest

  const endDate = body.endDate ?? new Date().toISOString().split('T')[0]
  const startDate =
    body.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Force regenerate insights
  const insights = await withTenant(tenantSlug, () =>
    generateAIInsights(tenantId, startDate!, endDate!)
  )

  // Save to cache (will overwrite existing)
  await withTenant(tenantSlug, () =>
    saveAIInsightsCache(tenantId, startDate!, endDate!, insights)
  )

  return NextResponse.json({ insights, regenerated: true })
}
