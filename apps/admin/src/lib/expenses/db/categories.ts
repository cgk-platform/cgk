/**
 * Expense Categories database operations
 * Phase 2H: Financial Expenses & P&L
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  ExpenseCategory,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseCategoryType,
} from '../types'

/**
 * Get all expense categories for a tenant
 */
export async function getExpenseCategories(
  tenantSlug: string,
  options?: { activeOnly?: boolean; type?: ExpenseCategoryType }
): Promise<ExpenseCategory[]> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.activeOnly) {
      conditions.push('is_active = true')
    }

    if (options?.type) {
      paramIndex++
      conditions.push(`expense_type = $${paramIndex}::expense_type`)
      values.push(options.type)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await sql.query(
      `SELECT
        id, tenant_id, category_id, name, expense_type,
        is_system, is_active, display_order, created_at, updated_at
      FROM expense_categories
      ${whereClause}
      ORDER BY expense_type, display_order, name`,
      values
    )

    return result.rows as ExpenseCategory[]
  })
}

/**
 * Get a single expense category by ID
 */
export async function getExpenseCategory(
  tenantSlug: string,
  categoryId: string
): Promise<ExpenseCategory | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, tenant_id, category_id, name, expense_type,
        is_system, is_active, display_order, created_at, updated_at
      FROM expense_categories
      WHERE category_id = ${categoryId}
      LIMIT 1
    `
    return (result.rows[0] as ExpenseCategory) || null
  })
}

/**
 * Get categories grouped by type
 */
export async function getCategoriesByType(
  tenantSlug: string,
  activeOnly = true
): Promise<Record<ExpenseCategoryType, ExpenseCategory[]>> {
  const categories = await getExpenseCategories(tenantSlug, { activeOnly })

  const grouped: Record<ExpenseCategoryType, ExpenseCategory[]> = {
    cogs: [],
    variable: [],
    marketing: [],
    operating: [],
    other: [],
  }

  for (const cat of categories) {
    grouped[cat.expense_type].push(cat)
  }

  return grouped
}

/**
 * Create a new expense category
 */
export async function createExpenseCategory(
  tenantSlug: string,
  input: CreateExpenseCategoryInput
): Promise<ExpenseCategory> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO expense_categories (
        tenant_id, category_id, name, expense_type, display_order
      ) VALUES (
        (SELECT id FROM public.organizations WHERE slug = ${tenantSlug}),
        ${input.category_id},
        ${input.name},
        ${input.expense_type}::expense_type,
        ${input.display_order ?? 0}
      )
      RETURNING
        id, tenant_id, category_id, name, expense_type,
        is_system, is_active, display_order, created_at, updated_at
    `
    return result.rows[0] as ExpenseCategory
  })
}

/**
 * Update an expense category
 */
export async function updateExpenseCategory(
  tenantSlug: string,
  categoryId: string,
  updates: UpdateExpenseCategoryInput
): Promise<ExpenseCategory | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.name !== undefined) {
      paramIndex++
      setClauses.push(`name = $${paramIndex}`)
      values.push(updates.name)
    }

    if (updates.expense_type !== undefined) {
      paramIndex++
      setClauses.push(`expense_type = $${paramIndex}::expense_type`)
      values.push(updates.expense_type)
    }

    if (updates.is_active !== undefined) {
      paramIndex++
      setClauses.push(`is_active = $${paramIndex}`)
      values.push(updates.is_active)
    }

    if (updates.display_order !== undefined) {
      paramIndex++
      setClauses.push(`display_order = $${paramIndex}`)
      values.push(updates.display_order)
    }

    paramIndex++
    values.push(categoryId)

    const result = await sql.query(
      `UPDATE expense_categories
      SET ${setClauses.join(', ')}
      WHERE category_id = $${paramIndex}
      RETURNING
        id, tenant_id, category_id, name, expense_type,
        is_system, is_active, display_order, created_at, updated_at`,
      values
    )

    return (result.rows[0] as ExpenseCategory) || null
  })
}

/**
 * Toggle category active status
 */
export async function toggleCategoryActive(
  tenantSlug: string,
  categoryId: string,
  isActive: boolean
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE expense_categories
      SET is_active = ${isActive}, updated_at = NOW()
      WHERE category_id = ${categoryId} AND is_system = false
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Seed default expense categories for a new tenant
 */
export async function seedDefaultCategories(tenantSlug: string): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const tenantIdResult = await sql`
      SELECT id FROM public.organizations WHERE slug = ${tenantSlug}
    `
    if (tenantIdResult.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantSlug}`)
    }
    const row = tenantIdResult.rows[0]
    if (!row) {
      throw new Error(`Tenant not found: ${tenantSlug}`)
    }
    const tenantId = row.id as string

    await sql`SELECT seed_default_expense_categories(${tenantId})`
  })
}

/**
 * Check if a category ID is already in use
 */
export async function categoryIdExists(
  tenantSlug: string,
  categoryId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT 1 FROM expense_categories
      WHERE category_id = ${categoryId}
      LIMIT 1
    `
    return result.rows.length > 0
  })
}
