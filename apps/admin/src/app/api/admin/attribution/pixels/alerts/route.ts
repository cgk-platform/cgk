export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getPixelAlertConfigs,
  updatePixelAlertConfig,
  type PixelAlertConfigUpdate,
  type PixelPlatform,
} from '@/lib/attribution'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const alerts = await withTenant(tenantSlug, () => getPixelAlertConfigs(tenantId))

  return NextResponse.json({ alerts })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { platform: PixelPlatform } & PixelAlertConfigUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.platform) {
    return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
  }

  const { platform, ...update } = body

  const alert = await withTenant(tenantSlug, () =>
    updatePixelAlertConfig(tenantId, platform, update)
  )

  return NextResponse.json({ alert })
}
