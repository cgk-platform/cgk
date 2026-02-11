export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  logPLConfigChange,
  type ExpenseCategoryUpdate,
  type ExpenseType,
} from '@/lib/finance'

const VALID_EXPENSE_TYPES: ExpenseType[] = ['cogs', 'variable', 'marketing', 'operating', 'other']

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/finance/expense-categories/[id]
 * Update an expense category
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id: categoryId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ExpenseCategoryUpdate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate expense type if provided
  if (body.expenseType && !VALID_EXPENSE_TYPES.includes(body.expenseType)) {
    return NextResponse.json(
      { error: `Expense type must be one of: ${VALID_EXPENSE_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  // Get existing category for audit
  const existing = await getExpenseCategories(tenantSlug, tenantId)
  const category = existing.find((c) => c.categoryId === categoryId)

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const success = await updateExpenseCategory(tenantSlug, tenantId, categoryId, body)

  if (!success) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'categories', 'update', userId, {
    fieldChanged: categoryId,
    oldValue: category,
    newValue: body,
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/admin/finance/expense-categories/[id]
 * Delete an expense category (non-system only)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id: categoryId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get existing category for audit and validation
  const existing = await getExpenseCategories(tenantSlug, tenantId)
  const category = existing.find((c) => c.categoryId === categoryId)

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  if (category.isSystem) {
    return NextResponse.json(
      { error: 'System categories cannot be deleted. You can only hide them.' },
      { status: 400 },
    )
  }

  const success = await deleteExpenseCategory(tenantSlug, tenantId, categoryId)

  if (!success) {
    return NextResponse.json({ error: 'Category not found or is a system category' }, { status: 404 })
  }

  // Log the change
  await logPLConfigChange(tenantSlug, tenantId, 'categories', 'delete', userId, {
    fieldChanged: categoryId,
    oldValue: category,
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true })
}
