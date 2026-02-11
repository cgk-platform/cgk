export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAllNotificationRoutingStatus,
  listNotificationRouting,
} from '@cgk/communications'

/**
 * GET /api/admin/settings/email/routing
 * Get all notification routing rules
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check for view mode
  const url = new URL(request.url)
  const view = url.searchParams.get('view')

  if (view === 'status') {
    // Return simplified status view
    const routing = await withTenant(tenantSlug, () =>
      getAllNotificationRoutingStatus()
    )

    // Group by category
    const grouped: Record<string, typeof routing> = {}
    for (const item of routing) {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category]!.push(item)
    }

    return NextResponse.json({ routing: grouped })
  }

  // Return full routing data
  const routing = await withTenant(tenantSlug, () => listNotificationRouting())

  return NextResponse.json({ routing })
}
