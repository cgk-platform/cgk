export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getBudgetsForMonth,
  getBudget,
  setBudget,
  setBudgetsBatch,
  deleteBudget,
  getBudgetComparison,
  getBudgetSummary,
  copyBudgets,
} from '@/lib/expenses/db/budgets'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10)
  const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1), 10)
  const categoryId = url.searchParams.get('category_id')
  const includeComparison = url.searchParams.get('comparison') === 'true'
  const includeSummary = url.searchParams.get('summary') === 'true'

  // Validate year and month
  if (isNaN(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }
  if (isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  // Get single budget by category
  if (categoryId) {
    const budget = await getBudget(tenantSlug, categoryId, year, month)
    return NextResponse.json({ budget })
  }

  // Get comparison view (budget vs actual)
  if (includeComparison) {
    const comparison = await getBudgetComparison(tenantSlug, year, month)

    if (includeSummary) {
      const summary = await getBudgetSummary(tenantSlug, year, month)
      return NextResponse.json({ comparison, summary, year, month })
    }

    return NextResponse.json({ comparison, year, month })
  }

  // Get all budgets for month
  const budgets = await getBudgetsForMonth(tenantSlug, year, month)

  if (includeSummary) {
    const summary = await getBudgetSummary(tenantSlug, year, month)
    return NextResponse.json({ budgets, summary, year, month })
  }

  return NextResponse.json({ budgets, year, month })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    category_id?: string
    year?: number
    month?: number
    budgeted_cents?: number
    budgets?: Array<{
      category_id: string
      year: number
      month: number
      budgeted_cents: number
    }>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Batch set budgets
  if (body.budgets && Array.isArray(body.budgets)) {
    // Validate each budget
    for (const b of body.budgets) {
      if (!b.category_id || typeof b.category_id !== 'string') {
        return NextResponse.json({ error: 'Each budget must have a category_id' }, { status: 400 })
      }
      if (typeof b.year !== 'number' || b.year < 2020 || b.year > 2100) {
        return NextResponse.json({ error: 'Each budget must have a valid year' }, { status: 400 })
      }
      if (typeof b.month !== 'number' || b.month < 1 || b.month > 12) {
        return NextResponse.json({ error: 'Each budget must have a valid month' }, { status: 400 })
      }
      if (typeof b.budgeted_cents !== 'number' || b.budgeted_cents < 0) {
        return NextResponse.json(
          { error: 'Each budget must have a valid budgeted_cents' },
          { status: 400 }
        )
      }
    }

    const results = await setBudgetsBatch(tenantSlug, body.budgets)
    return NextResponse.json({ success: true, budgets: results })
  }

  // Single budget set
  if (!body.category_id || typeof body.category_id !== 'string') {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  if (typeof body.year !== 'number' || body.year < 2020 || body.year > 2100) {
    return NextResponse.json({ error: 'Valid year is required (2020-2100)' }, { status: 400 })
  }

  if (typeof body.month !== 'number' || body.month < 1 || body.month > 12) {
    return NextResponse.json({ error: 'Valid month is required (1-12)' }, { status: 400 })
  }

  if (typeof body.budgeted_cents !== 'number' || body.budgeted_cents < 0) {
    return NextResponse.json({ error: 'Valid budgeted_cents is required' }, { status: 400 })
  }

  const budget = await setBudget(tenantSlug, {
    category_id: body.category_id,
    year: body.year,
    month: body.month,
    budgeted_cents: body.budgeted_cents,
  })

  return NextResponse.json({ success: true, budget })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    action?: string
    from_year?: number
    from_month?: number
    to_year?: number
    to_month?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Copy budgets from one month to another
  if (body.action === 'copy') {
    if (
      typeof body.from_year !== 'number' ||
      typeof body.from_month !== 'number' ||
      typeof body.to_year !== 'number' ||
      typeof body.to_month !== 'number'
    ) {
      return NextResponse.json(
        { error: 'from_year, from_month, to_year, and to_month are required' },
        { status: 400 }
      )
    }

    const count = await copyBudgets(
      tenantSlug,
      body.from_year,
      body.from_month,
      body.to_year,
      body.to_month
    )

    return NextResponse.json({ success: true, copied_count: count })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const categoryId = url.searchParams.get('category_id')
  const year = parseInt(url.searchParams.get('year') || '', 10)
  const month = parseInt(url.searchParams.get('month') || '', 10)

  if (!categoryId) {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: 'year and month are required' }, { status: 400 })
  }

  const success = await deleteBudget(tenantSlug, categoryId, year, month)

  if (!success) {
    return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
