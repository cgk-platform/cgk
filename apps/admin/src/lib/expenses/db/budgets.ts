/**
 * Expense Budgets database operations
 * Phase 2H: Financial Expenses & P&L
 */

import { sql, withTenant } from '@cgk/db'

import type {
  ExpenseBudget,
  BudgetComparison,
  SetBudgetInput,
} from '../types'

/**
 * Get all budgets for a specific month
 */
export async function getBudgetsForMonth(
  tenantSlug: string,
  year: number,
  month: number
): Promise<ExpenseBudget[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, tenant_id, category_id, year, month,
        budgeted_cents, created_at, updated_at
      FROM expense_budgets
      WHERE year = ${year} AND month = ${month}
      ORDER BY category_id
    `
    return result.rows as ExpenseBudget[]
  })
}

/**
 * Get a specific budget entry
 */
export async function getBudget(
  tenantSlug: string,
  categoryId: string,
  year: number,
  month: number
): Promise<ExpenseBudget | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, tenant_id, category_id, year, month,
        budgeted_cents, created_at, updated_at
      FROM expense_budgets
      WHERE category_id = ${categoryId}
        AND year = ${year}
        AND month = ${month}
      LIMIT 1
    `
    return (result.rows[0] as ExpenseBudget) || null
  })
}

/**
 * Set or update a budget for a category/month
 */
export async function setBudget(
  tenantSlug: string,
  input: SetBudgetInput
): Promise<ExpenseBudget> {
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
      INSERT INTO expense_budgets (
        tenant_id, category_id, year, month, budgeted_cents
      ) VALUES (
        ${tenantId},
        ${input.category_id},
        ${input.year},
        ${input.month},
        ${input.budgeted_cents}
      )
      ON CONFLICT (tenant_id, category_id, year, month)
      DO UPDATE SET
        budgeted_cents = EXCLUDED.budgeted_cents,
        updated_at = NOW()
      RETURNING
        id, tenant_id, category_id, year, month,
        budgeted_cents, created_at, updated_at
    `
    return result.rows[0] as ExpenseBudget
  })
}

/**
 * Set multiple budgets at once (batch operation)
 */
export async function setBudgetsBatch(
  tenantSlug: string,
  budgets: SetBudgetInput[]
): Promise<ExpenseBudget[]> {
  const results: ExpenseBudget[] = []
  for (const budget of budgets) {
    const result = await setBudget(tenantSlug, budget)
    results.push(result)
  }
  return results
}

/**
 * Delete a budget entry
 */
export async function deleteBudget(
  tenantSlug: string,
  categoryId: string,
  year: number,
  month: number
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM expense_budgets
      WHERE category_id = ${categoryId}
        AND year = ${year}
        AND month = ${month}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get budget vs actual comparison for a month
 */
export async function getBudgetComparison(
  tenantSlug: string,
  year: number,
  month: number
): Promise<BudgetComparison[]> {
  return withTenant(tenantSlug, async () => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const result = await sql`
      WITH category_actuals AS (
        -- Operating expenses
        SELECT
          category_id,
          COALESCE(SUM(amount_cents), 0)::bigint as actual_cents
        FROM operating_expenses
        WHERE date >= ${startDate}::date
          AND date <= ${endDate}::date
          AND count_for_pnl = true
        GROUP BY category_id

        UNION ALL

        -- Vendor payouts
        SELECT
          COALESCE(category_id, 'op_vendors') as category_id,
          COALESCE(SUM(amount_cents), 0)::bigint as actual_cents
        FROM vendor_payouts
        WHERE payment_date >= ${startDate}::date
          AND payment_date <= ${endDate}::date
          AND count_for_pnl = true
        GROUP BY COALESCE(category_id, 'op_vendors')

        UNION ALL

        -- Contractor payouts
        SELECT
          COALESCE(category_id, 'op_contractors') as category_id,
          COALESCE(SUM(amount_cents), 0)::bigint as actual_cents
        FROM contractor_payouts
        WHERE payment_date >= ${startDate}::date
          AND payment_date <= ${endDate}::date
          AND count_for_pnl = true
        GROUP BY COALESCE(category_id, 'op_contractors')

        UNION ALL

        -- Ad spend by platform
        SELECT
          CASE platform
            WHEN 'meta' THEN 'mkt_meta'
            WHEN 'google' THEN 'mkt_google'
            WHEN 'tiktok' THEN 'mkt_tiktok'
            ELSE 'mkt_other'
          END as category_id,
          COALESCE(SUM(spend_cents), 0)::bigint as actual_cents
        FROM ad_spend
        WHERE date >= ${startDate}::date
          AND date <= ${endDate}::date
        GROUP BY platform
      ),
      aggregated_actuals AS (
        SELECT
          category_id,
          SUM(actual_cents)::bigint as actual_cents
        FROM category_actuals
        GROUP BY category_id
      )
      SELECT
        ec.category_id,
        ec.name as category_name,
        ec.expense_type,
        COALESCE(eb.budgeted_cents, 0)::bigint as budgeted_cents,
        COALESCE(aa.actual_cents, 0)::bigint as actual_cents,
        (COALESCE(aa.actual_cents, 0) - COALESCE(eb.budgeted_cents, 0))::bigint as variance_cents,
        CASE
          WHEN COALESCE(eb.budgeted_cents, 0) = 0 THEN 0
          ELSE ROUND(
            ((COALESCE(aa.actual_cents, 0) - eb.budgeted_cents)::decimal / eb.budgeted_cents) * 100,
            2
          )
        END as variance_percent,
        COALESCE(aa.actual_cents, 0) > COALESCE(eb.budgeted_cents, 0) as is_over_budget
      FROM expense_categories ec
      LEFT JOIN expense_budgets eb ON eb.category_id = ec.category_id
        AND eb.year = ${year}
        AND eb.month = ${month}
      LEFT JOIN aggregated_actuals aa ON aa.category_id = ec.category_id
      WHERE ec.is_active = true
      ORDER BY ec.expense_type, ec.display_order, ec.name
    `

    return result.rows as BudgetComparison[]
  })
}

/**
 * Get budget totals summary for a month
 */
export async function getBudgetSummary(
  tenantSlug: string,
  year: number,
  month: number
): Promise<{
  total_budgeted_cents: number
  total_actual_cents: number
  total_variance_cents: number
  categories_over_budget: number
  categories_under_budget: number
}> {
  const comparisons = await getBudgetComparison(tenantSlug, year, month)

  let totalBudgeted = 0
  let totalActual = 0
  let overBudget = 0
  let underBudget = 0

  for (const comp of comparisons) {
    totalBudgeted += Number(comp.budgeted_cents)
    totalActual += Number(comp.actual_cents)
    if (comp.is_over_budget) {
      overBudget++
    } else if (Number(comp.actual_cents) < Number(comp.budgeted_cents)) {
      underBudget++
    }
  }

  return {
    total_budgeted_cents: totalBudgeted,
    total_actual_cents: totalActual,
    total_variance_cents: totalActual - totalBudgeted,
    categories_over_budget: overBudget,
    categories_under_budget: underBudget,
  }
}

/**
 * Copy budgets from one month to another
 */
export async function copyBudgets(
  tenantSlug: string,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO expense_budgets (tenant_id, category_id, year, month, budgeted_cents)
      SELECT tenant_id, category_id, ${toYear}, ${toMonth}, budgeted_cents
      FROM expense_budgets
      WHERE year = ${fromYear} AND month = ${fromMonth}
      ON CONFLICT (tenant_id, category_id, year, month)
      DO UPDATE SET
        budgeted_cents = EXCLUDED.budgeted_cents,
        updated_at = NOW()
    `
    return result.rowCount ?? 0
  })
}

/**
 * Get budget history for a category
 */
export async function getCategoryBudgetHistory(
  tenantSlug: string,
  categoryId: string,
  months = 12
): Promise<Array<{
  year: number
  month: number
  budgeted_cents: number
  actual_cents: number
}>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      WITH periods AS (
        SELECT
          EXTRACT(YEAR FROM d)::integer as year,
          EXTRACT(MONTH FROM d)::integer as month
        FROM generate_series(
          date_trunc('month', NOW() - interval '${months - 1} months'),
          date_trunc('month', NOW()),
          interval '1 month'
        ) d
      ),
      actuals AS (
        SELECT
          EXTRACT(YEAR FROM date)::integer as year,
          EXTRACT(MONTH FROM date)::integer as month,
          COALESCE(SUM(amount_cents), 0)::bigint as actual_cents
        FROM operating_expenses
        WHERE category_id = ${categoryId}
          AND count_for_pnl = true
        GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      )
      SELECT
        p.year,
        p.month,
        COALESCE(eb.budgeted_cents, 0)::bigint as budgeted_cents,
        COALESCE(a.actual_cents, 0)::bigint as actual_cents
      FROM periods p
      LEFT JOIN expense_budgets eb ON eb.category_id = ${categoryId}
        AND eb.year = p.year
        AND eb.month = p.month
      LEFT JOIN actuals a ON a.year = p.year AND a.month = p.month
      ORDER BY p.year, p.month
    `

    return result.rows as Array<{
      year: number
      month: number
      budgeted_cents: number
      actual_cents: number
    }>
  })
}
