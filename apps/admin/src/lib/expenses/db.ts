/**
 * Expense database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type { Expense, ExpenseFilters, ExpenseSummary, ExpenseCategory } from './types'

export async function getExpenses(
  tenantSlug: string,
  filters: ExpenseFilters,
): Promise<{ rows: Expense[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.category) {
      paramIndex++
      conditions.push(`category = $${paramIndex}::expense_category`)
      values.push(filters.category)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(vendor ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`expense_date >= $${paramIndex}::date`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`expense_date <= $${paramIndex}::date`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        id, category, vendor, description, amount_cents, currency,
        receipt_url, expense_date, is_recurring, recurrence_interval,
        notes, created_by, created_at, updated_at
      FROM expenses
      ${whereClause}
      ORDER BY expense_date DESC, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM expenses ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as Expense[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getExpense(
  tenantSlug: string,
  expenseId: string,
): Promise<Expense | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, category, vendor, description, amount_cents, currency,
        receipt_url, expense_date, is_recurring, recurrence_interval,
        notes, created_by, created_at, updated_at
      FROM expenses
      WHERE id = ${expenseId}
      LIMIT 1
    `
    return (result.rows[0] as Expense) || null
  })
}

export async function getExpenseSummary(tenantSlug: string): Promise<ExpenseSummary> {
  return withTenant(tenantSlug, async () => {
    const monthResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as total
      FROM expenses
      WHERE expense_date >= date_trunc('month', NOW())
    `

    const yearResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as total
      FROM expenses
      WHERE expense_date >= date_trunc('year', NOW())
    `

    const categoryResult = await sql`
      SELECT
        category,
        COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
        COUNT(*)::int as count
      FROM expenses
      WHERE expense_date >= date_trunc('year', NOW())
      GROUP BY category
      ORDER BY total_cents DESC
    `

    return {
      total_this_month_cents: Number(monthResult.rows[0]?.total || 0),
      total_this_year_cents: Number(yearResult.rows[0]?.total || 0),
      by_category: categoryResult.rows as ExpenseSummary['by_category'],
    }
  })
}

export async function createExpense(
  tenantSlug: string,
  expense: {
    category: ExpenseCategory
    vendor: string
    description: string
    amount_cents: number
    currency: string
    expense_date: string
    receipt_url?: string
    is_recurring?: boolean
    recurrence_interval?: string
    notes?: string
    created_by: string
  },
): Promise<Expense> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO expenses (
        category, vendor, description, amount_cents, currency, expense_date,
        receipt_url, is_recurring, recurrence_interval, notes, created_by
      ) VALUES (
        ${expense.category}::expense_category,
        ${expense.vendor},
        ${expense.description},
        ${expense.amount_cents},
        ${expense.currency},
        ${expense.expense_date}::date,
        ${expense.receipt_url || null},
        ${expense.is_recurring || false},
        ${expense.recurrence_interval || null},
        ${expense.notes || null},
        ${expense.created_by}
      )
      RETURNING *
    `
    return result.rows[0] as Expense
  })
}

export async function updateExpense(
  tenantSlug: string,
  expenseId: string,
  updates: Partial<Pick<Expense, 'category' | 'vendor' | 'description' | 'amount_cents' | 'expense_date' | 'receipt_url' | 'notes'>>,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.category !== undefined) {
      paramIndex++
      setClauses.push(`category = $${paramIndex}::expense_category`)
      values.push(updates.category)
    }
    if (updates.vendor !== undefined) {
      paramIndex++
      setClauses.push(`vendor = $${paramIndex}`)
      values.push(updates.vendor)
    }
    if (updates.description !== undefined) {
      paramIndex++
      setClauses.push(`description = $${paramIndex}`)
      values.push(updates.description)
    }
    if (updates.amount_cents !== undefined) {
      paramIndex++
      setClauses.push(`amount_cents = $${paramIndex}`)
      values.push(updates.amount_cents)
    }
    if (updates.expense_date !== undefined) {
      paramIndex++
      setClauses.push(`expense_date = $${paramIndex}::date`)
      values.push(updates.expense_date)
    }
    if (updates.receipt_url !== undefined) {
      paramIndex++
      setClauses.push(`receipt_url = $${paramIndex}`)
      values.push(updates.receipt_url)
    }
    if (updates.notes !== undefined) {
      paramIndex++
      setClauses.push(`notes = $${paramIndex}`)
      values.push(updates.notes)
    }

    paramIndex++
    values.push(expenseId)

    const result = await sql.query(
      `UPDATE expenses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values,
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function deleteExpense(
  tenantSlug: string,
  expenseId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM expenses WHERE id = ${expenseId} RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}
