export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getExpensesByCategory } from '@/lib/expenses/db/unified'
import type { ExpenseCategoryType } from '@/lib/expenses/types'

const VALID_CATEGORY_TYPES = ['cogs', 'variable', 'marketing', 'operating', 'other']

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

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

  // Optional category type filter
  const categoryType = url.searchParams.get('type') as ExpenseCategoryType | null

  if (categoryType && !VALID_CATEGORY_TYPES.includes(categoryType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_CATEGORY_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const expenses = await getExpensesByCategory(
    tenantSlug,
    startDate,
    endDate,
    categoryType || undefined
  )

  // Calculate totals
  const total = expenses.reduce((sum, e) => sum + Number(e.total_cents), 0)

  return NextResponse.json({
    expenses,
    total_cents: total,
    period: { startDate, endDate },
  })
}
