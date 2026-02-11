export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getDataQualityOverview } from '@/lib/ab-tests/db'

/**
 * GET /api/admin/ab-tests/data-quality
 * Get data quality overview for all tests
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const overview = await getDataQualityOverview(tenantSlug)

  return NextResponse.json(overview)
}
