/**
 * Operating Expenses database operations
 * Phase 2H: Financial Expenses & P&L
 */

import { sql, withTenant } from '@cgk/db'

import type {
  OperatingExpense,
  CreateOperatingExpenseInput,
  UpdateOperatingExpenseInput,
} from '../types'

/**
 * Get operating expenses with filters
 */
export async function getOperatingExpenses(
  tenantSlug: string,
  filters: {
    page: number
    limit: number
    offset: number
    start_date?: string
    end_date?: string
    category_id?: string
    search?: string
    count_for_pnl?: boolean
  }
): Promise<{ rows: OperatingExpense[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.start_date) {
      paramIndex++
      conditions.push(`date >= $${paramIndex}::date`)
      values.push(filters.start_date)
    }

    if (filters.end_date) {
      paramIndex++
      conditions.push(`date <= $${paramIndex}::date`)
      values.push(filters.end_date)
    }

    if (filters.category_id) {
      paramIndex++
      conditions.push(`category_id = $${paramIndex}`)
      values.push(filters.category_id)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(description ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    if (filters.count_for_pnl !== undefined) {
      paramIndex++
      conditions.push(`count_for_pnl = $${paramIndex}`)
      values.push(filters.count_for_pnl)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        id, tenant_id, date, category_id, description, amount_cents,
        vendor_name, notes, receipt_url, count_for_pnl, pnl_exclusion_reason,
        created_by, created_at, updated_at
      FROM operating_expenses
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM operating_expenses ${whereClause}`,
      countValues
    )

    return {
      rows: dataResult.rows as OperatingExpense[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get a single operating expense by ID
 */
export async function getOperatingExpense(
  tenantSlug: string,
  expenseId: string
): Promise<OperatingExpense | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, tenant_id, date, category_id, description, amount_cents,
        vendor_name, notes, receipt_url, count_for_pnl, pnl_exclusion_reason,
        created_by, created_at, updated_at
      FROM operating_expenses
      WHERE id = ${expenseId}
      LIMIT 1
    `
    return (result.rows[0] as OperatingExpense) || null
  })
}

/**
 * Create a new operating expense
 */
export async function createOperatingExpense(
  tenantSlug: string,
  input: CreateOperatingExpenseInput,
  createdBy?: string
): Promise<OperatingExpense> {
  return withTenant(tenantSlug, async () => {
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

    const result = await sql`
      INSERT INTO operating_expenses (
        tenant_id, date, category_id, description, amount_cents,
        vendor_name, notes, receipt_url, count_for_pnl, created_by
      ) VALUES (
        ${tenantId},
        ${input.date}::date,
        ${input.category_id},
        ${input.description},
        ${input.amount_cents},
        ${input.vendor_name || null},
        ${input.notes || null},
        ${input.receipt_url || null},
        ${input.count_for_pnl ?? true},
        ${createdBy || null}
      )
      RETURNING
        id, tenant_id, date, category_id, description, amount_cents,
        vendor_name, notes, receipt_url, count_for_pnl, pnl_exclusion_reason,
        created_by, created_at, updated_at
    `
    return result.rows[0] as OperatingExpense
  })
}

/**
 * Update an operating expense
 */
export async function updateOperatingExpense(
  tenantSlug: string,
  expenseId: string,
  updates: UpdateOperatingExpenseInput
): Promise<OperatingExpense | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.date !== undefined) {
      paramIndex++
      setClauses.push(`date = $${paramIndex}::date`)
      values.push(updates.date)
    }

    if (updates.category_id !== undefined) {
      paramIndex++
      setClauses.push(`category_id = $${paramIndex}`)
      values.push(updates.category_id)
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

    if (updates.vendor_name !== undefined) {
      paramIndex++
      setClauses.push(`vendor_name = $${paramIndex}`)
      values.push(updates.vendor_name)
    }

    if (updates.notes !== undefined) {
      paramIndex++
      setClauses.push(`notes = $${paramIndex}`)
      values.push(updates.notes)
    }

    if (updates.receipt_url !== undefined) {
      paramIndex++
      setClauses.push(`receipt_url = $${paramIndex}`)
      values.push(updates.receipt_url)
    }

    if (updates.count_for_pnl !== undefined) {
      paramIndex++
      setClauses.push(`count_for_pnl = $${paramIndex}`)
      values.push(updates.count_for_pnl)
    }

    if (updates.pnl_exclusion_reason !== undefined) {
      paramIndex++
      setClauses.push(`pnl_exclusion_reason = $${paramIndex}`)
      values.push(updates.pnl_exclusion_reason)
    }

    paramIndex++
    values.push(expenseId)

    const result = await sql.query(
      `UPDATE operating_expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, tenant_id, date, category_id, description, amount_cents,
        vendor_name, notes, receipt_url, count_for_pnl, pnl_exclusion_reason,
        created_by, created_at, updated_at`,
      values
    )

    return (result.rows[0] as OperatingExpense) || null
  })
}

/**
 * Delete an operating expense
 */
export async function deleteOperatingExpense(
  tenantSlug: string,
  expenseId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM operating_expenses
      WHERE id = ${expenseId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Toggle P&L inclusion for an operating expense
 */
export async function toggleOperatingExpensePnl(
  tenantSlug: string,
  expenseId: string,
  countForPnl: boolean,
  exclusionReason?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE operating_expenses
      SET
        count_for_pnl = ${countForPnl},
        pnl_exclusion_reason = ${countForPnl ? null : (exclusionReason || null)},
        updated_at = NOW()
      WHERE id = ${expenseId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get operating expenses summary for a date range
 */
export async function getOperatingExpensesSummary(
  tenantSlug: string,
  startDate: string,
  endDate: string
): Promise<{
  total_cents: number
  total_included_cents: number
  by_category: Array<{
    category_id: string
    total_cents: number
    count: number
  }>
}> {
  return withTenant(tenantSlug, async () => {
    const totalResult = await sql`
      SELECT
        COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
        COALESCE(SUM(CASE WHEN count_for_pnl THEN amount_cents ELSE 0 END), 0)::bigint as total_included_cents
      FROM operating_expenses
      WHERE date >= ${startDate}::date AND date <= ${endDate}::date
    `

    const byCategoryResult = await sql`
      SELECT
        category_id,
        COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
        COUNT(*)::int as count
      FROM operating_expenses
      WHERE date >= ${startDate}::date
        AND date <= ${endDate}::date
        AND count_for_pnl = true
      GROUP BY category_id
      ORDER BY total_cents DESC
    `

    return {
      total_cents: Number(totalResult.rows[0]?.total_cents || 0),
      total_included_cents: Number(totalResult.rows[0]?.total_included_cents || 0),
      by_category: byCategoryResult.rows as Array<{
        category_id: string
        total_cents: number
        count: number
      }>,
    }
  })
}

/**
 * Batch toggle P&L for multiple expenses
 */
export async function batchTogglePnl(
  tenantSlug: string,
  expenseIds: string[],
  countForPnl: boolean,
  exclusionReason?: string
): Promise<number> {
  if (expenseIds.length === 0) return 0

  let count = 0
  for (const expenseId of expenseIds) {
    const success = await toggleOperatingExpensePnl(tenantSlug, expenseId, countForPnl, exclusionReason)
    if (success) count++
  }
  return count
}
