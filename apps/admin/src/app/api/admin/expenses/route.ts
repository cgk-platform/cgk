export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getExpenses, getExpenseSummary, createExpense, getExpense, updateExpense, deleteExpense } from '@/lib/expenses/db'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/expenses/types'
import { parseExpenseFilters } from '@/lib/search-params'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeSummary = url.searchParams.get('summary') === 'true'
  const expenseId = url.searchParams.get('id')

  if (expenseId) {
    const expense = await getExpense(tenantSlug, expenseId)
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    return NextResponse.json({ expense })
  }

  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const filters = parseExpenseFilters(params)
  const { rows, totalCount } = await getExpenses(tenantSlug, filters)

  const response: {
    expenses: typeof rows
    totalCount: number
    page: number
    limit: number
    totalPages: number
    summary?: Awaited<ReturnType<typeof getExpenseSummary>>
  } = {
    expenses: rows,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  }

  if (includeSummary) {
    response.summary = await getExpenseSummary(tenantSlug)
  }

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    category?: string
    vendor?: string
    description?: string
    amount_cents?: number
    currency?: string
    expense_date?: string
    receipt_url?: string
    is_recurring?: boolean
    recurrence_interval?: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.category || !EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` },
      { status: 400 },
    )
  }

  if (!body.vendor || typeof body.vendor !== 'string') {
    return NextResponse.json({ error: 'Vendor is required' }, { status: 400 })
  }

  if (!body.description || typeof body.description !== 'string') {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  if (!body.amount_cents || typeof body.amount_cents !== 'number' || body.amount_cents <= 0) {
    return NextResponse.json({ error: 'Valid amount_cents is required' }, { status: 400 })
  }

  if (!body.expense_date || typeof body.expense_date !== 'string') {
    return NextResponse.json({ error: 'Expense date is required' }, { status: 400 })
  }

  const expense = await createExpense(tenantSlug, {
    category: body.category as ExpenseCategory,
    vendor: body.vendor,
    description: body.description,
    amount_cents: body.amount_cents,
    currency: body.currency || 'USD',
    expense_date: body.expense_date,
    receipt_url: body.receipt_url,
    is_recurring: body.is_recurring,
    recurrence_interval: body.recurrence_interval,
    notes: body.notes,
    created_by: userId,
  })

  return NextResponse.json({ success: true, expense })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const expenseId = url.searchParams.get('id')

  if (!expenseId) {
    return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
  }

  let body: {
    category?: string
    vendor?: string
    description?: string
    amount_cents?: number
    expense_date?: string
    receipt_url?: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Parameters<typeof updateExpense>[2] = {}

  if (body.category !== undefined) {
    if (!EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }
    updates.category = body.category as ExpenseCategory
  }

  if (body.vendor !== undefined) updates.vendor = body.vendor
  if (body.description !== undefined) updates.description = body.description
  if (body.amount_cents !== undefined) updates.amount_cents = body.amount_cents
  if (body.expense_date !== undefined) updates.expense_date = body.expense_date
  if (body.receipt_url !== undefined) updates.receipt_url = body.receipt_url
  if (body.notes !== undefined) updates.notes = body.notes

  const success = await updateExpense(tenantSlug, expenseId, updates)

  if (!success) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const expenseId = url.searchParams.get('id')

  if (!expenseId) {
    return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
  }

  const success = await deleteExpense(tenantSlug, expenseId)

  if (!success) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
