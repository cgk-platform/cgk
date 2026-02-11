export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSecondaryPlatformConnection,
  updateSecondaryPlatformConnection,
  type SecondaryPlatform,
  type SecondaryPlatformConnectionUpdate,
} from '@/lib/attribution'

const VALID_PLATFORMS: SecondaryPlatform[] = [
  'snapchat',
  'pinterest',
  'linkedin',
  'mntn',
  'affiliate',
]

interface RouteParams {
  params: Promise<{ platform: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { platform } = await params

  if (!VALID_PLATFORMS.includes(platform as SecondaryPlatform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const connection = await withTenant(tenantSlug, () =>
    getSecondaryPlatformConnection(tenantId, platform as SecondaryPlatform)
  )

  return NextResponse.json({ connection })
}

export async function PUT(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { platform } = await params

  if (!VALID_PLATFORMS.includes(platform as SecondaryPlatform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  let body: SecondaryPlatformConnectionUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const connection = await withTenant(tenantSlug, () =>
    updateSecondaryPlatformConnection(tenantId, platform as SecondaryPlatform, body)
  )

  if (!connection) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 })
  }

  return NextResponse.json({ connection })
}
