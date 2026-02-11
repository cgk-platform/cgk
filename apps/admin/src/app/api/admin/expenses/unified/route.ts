export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getUnifiedExpenses,
  getUnifiedExpensesSummary,
} from '@/lib/expenses/db/unified'
import type { ExpenseSource, ExpenseCategoryType } from '@/lib/expenses/types'

const VALID_SOURCES = ['ad_spend', 'creator_payout', 'vendor_payout', 'contractor_payout', 'operating_expense']
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

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  // Filters
  const source = url.searchParams.get('source') as ExpenseSource | null
  const categoryType = url.searchParams.get('categoryType') as ExpenseCategoryType | null
  const search = url.searchParams.get('search') || undefined
  const countForPnl = url.searchParams.get('countForPnl')

  // Include summary
  const includeSummary = url.searchParams.get('summary') === 'true'

  // Validate source
  if (source && !VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate category type
  if (categoryType && !VALID_CATEGORY_TYPES.includes(categoryType)) {
    return NextResponse.json(
      { error: `Invalid categoryType. Must be one of: ${VALID_CATEGORY_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const { rows, totalCount } = await getUnifiedExpenses(tenantSlug, {
    page,
    limit,
    offset,
    start_date: startDate,
    end_date: endDate,
    source: source || undefined,
    category_type: categoryType || undefined,
    search,
    count_for_pnl: countForPnl === 'true' ? true : countForPnl === 'false' ? false : undefined,
  })

  const response: {
    expenses: typeof rows
    totalCount: number
    page: number
    limit: number
    totalPages: number
    filters: {
      startDate: string
      endDate: string
      source: string | null
      categoryType: string | null
      search: string | null
    }
    summary?: Awaited<ReturnType<typeof getUnifiedExpensesSummary>>
  } = {
    expenses: rows,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    filters: {
      startDate,
      endDate,
      source,
      categoryType,
      search: search || null,
    },
  }

  if (includeSummary) {
    response.summary = await getUnifiedExpensesSummary(tenantSlug, startDate, endDate)
  }

  return NextResponse.json(response)
}
