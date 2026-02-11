export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getApplications,
  getApplicationStatusCounts,
  parseApplicationFilters,
} from '@/lib/creators-admin-ops'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const includeCounts = url.searchParams.get('counts') === 'true'
  const filters = parseApplicationFilters(params)

  try {
    const { rows, totalCount } = await getApplications(tenantSlug, filters)

    const response: {
      applications: typeof rows
      totalCount: number
      page: number
      limit: number
      totalPages: number
      statusCounts?: Record<string, number>
    } = {
      applications: rows,
      totalCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalCount / filters.limit),
    }

    if (includeCounts) {
      response.statusCounts = await getApplicationStatusCounts(tenantSlug)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
