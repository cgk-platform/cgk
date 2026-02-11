export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getKBAnalytics } from '@/lib/knowledge-base/db'

/**
 * GET /api/admin/support/kb/analytics - Get KB analytics data
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const analytics = await withTenant(tenantSlug, () => getKBAnalytics())

  return NextResponse.json({ analytics })
}
