export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPixelEvents, type PixelPlatform } from '@/lib/attribution'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') as PixelPlatform | null
  const eventType = searchParams.get('eventType')
  const matchStatus = searchParams.get('matchStatus')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const result = await withTenant(tenantSlug, () =>
    getPixelEvents(tenantId, {
      platform: platform ?? undefined,
      eventType: eventType ?? undefined,
      matchStatus: matchStatus ?? undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      search: search ?? undefined,
      limit: Math.min(limit, 1000), // Max 1000 events per request
      offset,
    })
  )

  return NextResponse.json(result)
}
