export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getWithdrawals, getPayoutSummary } from '@/lib/payouts/db'
import { parseWithdrawalFilters } from '@/lib/search-params'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeSummary = url.searchParams.get('summary') === 'true'

  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const filters = parseWithdrawalFilters(params)
  const { rows, totalCount } = await getWithdrawals(tenantSlug, filters)

  const response: {
    withdrawals: typeof rows
    totalCount: number
    page: number
    limit: number
    totalPages: number
    summary?: Awaited<ReturnType<typeof getPayoutSummary>>
  } = {
    withdrawals: rows,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  }

  if (includeSummary) {
    response.summary = await getPayoutSummary(tenantSlug)
  }

  return NextResponse.json(response)
}
