export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getExpenseCategories,
  createExpenseCategory,
  seedDefaultExpenseCategories,
  logPLConfigChange,
  type ExpenseCategoryCreate,
  type ExpenseType,
} from '@/lib/finance'

const VALID_EXPENSE_TYPES: ExpenseType[] = ['cogs', 'variable', 'marketing', 'operating', 'other']

/**
 * GET /api/admin/finance/expense-categories
 * List expense categories for the tenant
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const expenseType = url.searchParams.get('type') as ExpenseType | null
  const activeOnly = url.searchParams.get('activeOnly') === 'true'

  // Check if categories exist
  let categories = await getExpenseCategories(tenantSlug, tenantId, {
    expenseType: expenseType ?? undefined,
    activeOnly,
  })

  // If no categories exist, seed the defaults
  if (categories.length === 0 && !expenseType && !activeOnly) {
    await seedDefaultExpenseCategories(tenantSlug, tenantId)
    categories = await getExpenseCategories(tenantSlug, tenantId)
  }

  return NextResponse.json({ categories })
}

/**
 * POST /api/admin/finance/expense-categories
 * Create a new expense category
 */
export async function POST(request: Request) {
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

  let body: ExpenseCategoryCreate

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validation
  if (!body.categoryId || typeof body.categoryId !== 'string') {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
  }

  // Validate category ID format (alphanumeric with underscores)
  if (!/^[a-z0-9_]+$/.test(body.categoryId)) {
    return NextResponse.json(
      { error: 'Category ID must be lowercase alphanumeric with underscores only' },
      { status: 400 },
    )
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  if (!body.expenseType || !VALID_EXPENSE_TYPES.includes(body.expenseType)) {
    return NextResponse.json(
      { error: `Expense type must be one of: ${VALID_EXPENSE_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const category = await createExpenseCategory(tenantSlug, tenantId, body)

    // Log the change
    await logPLConfigChange(tenantSlug, tenantId, 'categories', 'create', userId, {
      newValue: category,
      ipAddress: headerList.get('x-forwarded-for') ?? undefined,
      userAgent: headerList.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A category with this ID already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}
