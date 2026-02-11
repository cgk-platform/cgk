export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getExpenseCategories,
  getCategoriesByType,
  createExpenseCategory,
  updateExpenseCategory,
  toggleCategoryActive,
  categoryIdExists,
} from '@/lib/expenses/db/categories'
import type { ExpenseCategoryType } from '@/lib/expenses/types'

const VALID_CATEGORY_TYPES = ['cogs', 'variable', 'marketing', 'operating', 'other']

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const groupByType = url.searchParams.get('groupByType') === 'true'
  const activeOnly = url.searchParams.get('activeOnly') !== 'false'
  const type = url.searchParams.get('type') as ExpenseCategoryType | null

  if (groupByType) {
    const categoriesByType = await getCategoriesByType(tenantSlug, activeOnly)
    return NextResponse.json({ categories: categoriesByType })
  }

  const categories = await getExpenseCategories(tenantSlug, {
    activeOnly,
    type: type && VALID_CATEGORY_TYPES.includes(type) ? type : undefined,
  })

  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    category_id?: string
    name?: string
    expense_type?: string
    display_order?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.category_id || typeof body.category_id !== 'string') {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  if (!body.expense_type || !VALID_CATEGORY_TYPES.includes(body.expense_type)) {
    return NextResponse.json(
      { error: `expense_type must be one of: ${VALID_CATEGORY_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate category_id format (alphanumeric with underscores)
  if (!/^[a-z0-9_]+$/.test(body.category_id)) {
    return NextResponse.json(
      { error: 'category_id must be lowercase alphanumeric with underscores only' },
      { status: 400 }
    )
  }

  // Check if category_id already exists
  const exists = await categoryIdExists(tenantSlug, body.category_id)
  if (exists) {
    return NextResponse.json({ error: 'category_id already exists' }, { status: 409 })
  }

  const category = await createExpenseCategory(tenantSlug, {
    category_id: body.category_id,
    name: body.name,
    expense_type: body.expense_type as ExpenseCategoryType,
    display_order: body.display_order,
  })

  return NextResponse.json({ success: true, category })
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const categoryId = url.searchParams.get('id')

  if (!categoryId) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
  }

  let body: {
    name?: string
    expense_type?: string
    is_active?: boolean
    display_order?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Handle simple toggle action
  if (body.is_active !== undefined && Object.keys(body).length === 1) {
    const success = await toggleCategoryActive(tenantSlug, categoryId, body.is_active)
    if (!success) {
      return NextResponse.json(
        { error: 'Cannot toggle system categories or category not found' },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  }

  // Validate expense_type if provided
  if (body.expense_type && !VALID_CATEGORY_TYPES.includes(body.expense_type)) {
    return NextResponse.json(
      { error: `expense_type must be one of: ${VALID_CATEGORY_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const category = await updateExpenseCategory(tenantSlug, categoryId, {
    name: body.name,
    expense_type: body.expense_type as ExpenseCategoryType | undefined,
    is_active: body.is_active,
    display_order: body.display_order,
  })

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, category })
}
