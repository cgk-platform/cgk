export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPixelFailures, retryPixelEvent, type PixelPlatform } from '@/lib/attribution'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') as PixelPlatform | null
  const resolved = searchParams.get('resolved') === 'true'
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const failures = await withTenant(tenantSlug, () =>
    getPixelFailures(tenantId, {
      platform: platform ?? undefined,
      resolved,
      limit: Math.min(limit, 100),
    })
  )

  return NextResponse.json({ failures })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { failureId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.failureId) {
    return NextResponse.json({ error: 'Failure ID is required' }, { status: 400 })
  }

  const success = await withTenant(tenantSlug, () =>
    retryPixelEvent(tenantId, body.failureId)
  )

  return NextResponse.json({ success })
}
