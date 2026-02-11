export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getPnlLineDetails } from '@/lib/expenses/db/unified'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  const categoryId = url.searchParams.get('categoryId')
  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
  }

  // Date range (default to current month)
  const now = new Date()
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] as string
  const defaultEndDate = now.toISOString().split('T')[0] as string

  const startDate: string = url.searchParams.get('startDate') || defaultStartDate
  const endDate: string = url.searchParams.get('endDate') || defaultEndDate

  // Validate dates
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const items = await getPnlLineDetails(tenantSlug, categoryId, startDate, endDate)

  // Calculate total
  const total = items.reduce((sum, i) => sum + i.amount_cents, 0)

  return NextResponse.json({
    items,
    total_cents: total,
    count: items.length,
    categoryId,
    period: { startDate, endDate },
  })
}
