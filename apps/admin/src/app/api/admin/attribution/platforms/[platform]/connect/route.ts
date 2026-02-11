export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createSecondaryPlatformConnection,
  disconnectPlatform,
  type SecondaryPlatform,
  type SecondaryPlatformConnectionCreate,
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

export async function POST(request: Request, { params }: RouteParams) {
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

  let body: Partial<SecondaryPlatformConnectionCreate>
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  // In a real implementation, this would:
  // 1. Initiate OAuth flow for platforms that support it
  // 2. Store encrypted credentials
  // 3. Return an OAuth redirect URL or success status

  const connection = await withTenant(tenantSlug, () =>
    createSecondaryPlatformConnection(tenantId, {
      platform: platform as SecondaryPlatform,
      displayName: body.displayName,
      accountId: body.accountId,
      accountName: body.accountName,
      syncFrequency: body.syncFrequency,
    })
  )

  return NextResponse.json({ connection })
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

  await withTenant(tenantSlug, () =>
    disconnectPlatform(tenantId, platform as SecondaryPlatform)
  )

  return NextResponse.json({ success: true })
}
