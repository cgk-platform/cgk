/**
 * Sample Orders Stats API
 * GET: Get statistics for sample orders
 */
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSamplesStats } from '@/lib/samples/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const stats = await withTenant(tenantSlug, async () => {
      return getSamplesStats()
    })

    return NextResponse.json({
      total: stats.total,
      byType: {
        ugc: stats.ugc,
        tiktok: stats.tiktok,
        unknown: stats.unknown,
      },
      byFulfillment: {
        unfulfilled: stats.unfulfilled,
        partial: stats.partial,
        fulfilled: stats.fulfilled,
      },
    })
  } catch (error) {
    console.error('Failed to fetch sample stats:', error)
    return NextResponse.json({ error: 'Failed to fetch sample stats' }, { status: 500 })
  }
}
