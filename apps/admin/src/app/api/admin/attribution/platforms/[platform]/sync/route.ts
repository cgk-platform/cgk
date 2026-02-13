export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSecondaryPlatformConnection,
  recordPlatformSync,
  type SecondaryPlatform,
  type SecondaryPlatformConnection,
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

export async function POST(_request: Request, { params }: RouteParams) {
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

  // Check if platform is connected
  const connection = await withTenant(tenantSlug, () =>
    getSecondaryPlatformConnection(tenantId, platform as SecondaryPlatform)
  ) as SecondaryPlatformConnection | null

  if (!connection || connection.status !== 'connected') {
    return NextResponse.json(
      { error: 'Platform not connected' },
      { status: 400 }
    )
  }

  // In a real implementation, this would:
  // 1. Queue a background job to sync data from the platform
  // 2. Return immediately with a job ID for tracking
  // For now, simulate a sync

  try {
    // Simulate sync - in production, this would trigger a background job
    await withTenant(tenantSlug, () =>
      recordPlatformSync(tenantId, platform as SecondaryPlatform, 'success', 0)
    )

    return NextResponse.json({
      success: true,
      message: 'Sync initiated',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'

    await withTenant(tenantSlug, () =>
      recordPlatformSync(
        tenantId,
        platform as SecondaryPlatform,
        'failed',
        0,
        message
      )
    )

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
