export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getCommissions,
  getCommissionSummary,
  parseCommissionFilters,
} from '@/lib/creators-admin-ops'

export async function GET(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can view commissions
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const includeSummary = url.searchParams.get('summary') === 'true'
  const filters = parseCommissionFilters(params)

  try {
    const { rows, totalCount } = await getCommissions(tenantSlug, filters)

    const response: {
      commissions: typeof rows
      totalCount: number
      page: number
      limit: number
      totalPages: number
      summary?: Awaited<ReturnType<typeof getCommissionSummary>>
    } = {
      commissions: rows,
      totalCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalCount / filters.limit),
    }

    if (includeSummary) {
      response.summary = await getCommissionSummary(tenantSlug)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching commissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commissions' },
      { status: 500 }
    )
  }
}
