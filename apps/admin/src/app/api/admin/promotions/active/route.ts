export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getActivePromotion } from '@/lib/promotions/db'

/**
 * GET /api/admin/promotions/active
 * Get the currently active promotion (if any)
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const promotion = await getActivePromotion(tenantSlug)

    return NextResponse.json({
      promotion,
      isActive: !!promotion,
    })
  } catch (error) {
    console.error('Error fetching active promotion:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active promotion' },
      { status: 500 },
    )
  }
}
