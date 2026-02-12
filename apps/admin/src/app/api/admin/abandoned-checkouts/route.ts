/**
 * Abandoned Checkouts API Route
 * GET: List abandoned checkouts with filtering and pagination
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  listAbandonedCheckouts,
  getRecoveryStats,
} from '@/lib/abandoned-checkouts/db'
import type { AbandonedCheckoutFilters } from '@/lib/abandoned-checkouts/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)

  const filters: AbandonedCheckoutFilters = {
    status: (searchParams.get('status') as AbandonedCheckoutFilters['status']) || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    minValue: searchParams.get('minValue') ? Number(searchParams.get('minValue')) : undefined,
    maxValue: searchParams.get('maxValue') ? Number(searchParams.get('maxValue')) : undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    sort: searchParams.get('sort') || 'abandoned_at',
    dir: (searchParams.get('dir') as 'asc' | 'desc') || 'desc',
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      const [checkoutsResult, stats] = await Promise.all([
        listAbandonedCheckouts(filters),
        getRecoveryStats(),
      ])

      return {
        checkouts: checkoutsResult.checkouts,
        total: checkoutsResult.total,
        stats,
      }
    })

    const limit = filters.limit || 20
    const page = filters.page || 1

    return NextResponse.json({
      checkouts: result.checkouts,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
      stats: result.stats,
    })
  } catch (error) {
    console.error('Failed to fetch abandoned checkouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch abandoned checkouts' },
      { status: 500 },
    )
  }
}
