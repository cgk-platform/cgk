export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getStuckCreators } from '@/lib/creators-admin-ops'
import { logger } from '@cgk-platform/logging'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const minDays = Number(url.searchParams.get('minDays')) || 14

  try {
    const creators = await getStuckCreators(tenantSlug, minDays)

    return NextResponse.json({ creators, minDays })
  } catch (error) {
    logger.error('Error fetching stuck creators:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch stuck creators' },
      { status: 500 }
    )
  }
}
