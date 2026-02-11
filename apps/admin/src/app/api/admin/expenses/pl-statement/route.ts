export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  calculatePLStatement,
  calculatePLComparison,
  getPresetDateRanges,
} from '@/lib/expenses/pnl-calculator'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Check for presets request
  if (url.searchParams.get('presets') === 'true') {
    return NextResponse.json({ presets: getPresetDateRanges() })
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

  // Check if start is before end
  if (new Date(startDate) > new Date(endDate)) {
    return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
  }

  // Comparison mode
  const comparison = url.searchParams.get('comparison') as 'previous_period' | 'year_over_year' | null

  if (comparison) {
    if (!['previous_period', 'year_over_year'].includes(comparison)) {
      return NextResponse.json(
        { error: 'comparison must be "previous_period" or "year_over_year"' },
        { status: 400 }
      )
    }

    const result = await calculatePLComparison(tenantSlug, startDate, endDate, comparison)
    return NextResponse.json(result)
  }

  // Standard P&L statement
  const statement = await calculatePLStatement(tenantSlug, startDate, endDate)
  return NextResponse.json({ statement })
}
