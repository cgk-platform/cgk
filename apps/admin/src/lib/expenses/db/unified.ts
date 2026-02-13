/**
 * Unified Expenses database operations
 * Aggregates all expense sources: ad spend, payouts, operating expenses
 * Phase 2H: Financial Expenses & P&L
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  UnifiedExpense,
  UnifiedExpenseSummary,
  UnifiedExpenseFilters,
  ExpenseSource,
  ExpenseCategoryType,
} from '../types'

/**
 * Get unified expenses from all sources
 */
export async function getUnifiedExpenses(
  tenantSlug: string,
  filters: UnifiedExpenseFilters
): Promise<{ rows: UnifiedExpense[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const values: unknown[] = []
    let paramIndex = 0

    // Date filters - always required
    paramIndex++
    const startDateParam = paramIndex
    values.push(filters.start_date)

    paramIndex++
    const endDateParam = paramIndex
    values.push(filters.end_date)

    // Source filter
    let sourceFilter = ''
    if (filters.source) {
      paramIndex++
      sourceFilter = `AND source = $${paramIndex}`
      values.push(filters.source)
    }

    // Search filter
    let searchFilter = ''
    if (filters.search) {
      paramIndex++
      searchFilter = `AND (description ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`
      values.push(`%${filters.search}%`)
    }

    // P&L filter
    let pnlFilter = ''
    if (filters.count_for_pnl !== undefined) {
      paramIndex++
      pnlFilter = `AND count_for_pnl = $${paramIndex}`
      values.push(filters.count_for_pnl)
    }

    // Category type filter
    let categoryTypeFilter = ''
    if (filters.category_type) {
      paramIndex++
      categoryTypeFilter = `AND category_type = $${paramIndex}`
      values.push(filters.category_type)
    }

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const query = `
      WITH unified AS (
        -- Ad Spend
        SELECT
          id,
          'ad_spend'::text as source,
          date::text as date,
          CONCAT(INITCAP(platform), ' Ads', CASE WHEN campaign_name IS NOT NULL THEN ' - ' || campaign_name ELSE '' END) as description,
          spend_cents as amount_cents,
          CASE platform
            WHEN 'meta' THEN 'mkt_meta'
            WHEN 'google' THEN 'mkt_google'
            WHEN 'tiktok' THEN 'mkt_tiktok'
            ELSE 'mkt_other'
          END as category_id,
          CASE platform
            WHEN 'meta' THEN 'Meta Ads'
            WHEN 'google' THEN 'Google Ads'
            WHEN 'tiktok' THEN 'TikTok Ads'
            ELSE 'Other Ads'
          END as category_name,
          'marketing'::text as category_type,
          account_name as vendor_name,
          count_for_pnl,
          NULL::text as pnl_exclusion_reason,
          jsonb_build_object(
            'platform', platform,
            'campaign_id', campaign_id,
            'impressions', impressions,
            'clicks', clicks
          ) as metadata
        FROM ad_spend
        WHERE date >= $${startDateParam}::date AND date <= $${endDateParam}::date

        UNION ALL

        -- Creator Payouts (cash only from balance_transactions)
        SELECT
          bt.id,
          'creator_payout'::text as source,
          bt.created_at::date::text as date,
          CONCAT('Creator Payout - ', c.display_name) as description,
          ABS(bt.amount_cents) as amount_cents,
          'mkt_creator' as category_id,
          'Creator Commissions' as category_name,
          'marketing'::text as category_type,
          c.display_name as vendor_name,
          true as count_for_pnl,
          NULL::text as pnl_exclusion_reason,
          jsonb_build_object(
            'creator_id', bt.creator_id,
            'payout_id', bt.payout_id,
            'type', bt.type
          ) as metadata
        FROM balance_transactions bt
        LEFT JOIN creators c ON c.id = bt.creator_id
        WHERE bt.type = 'payout'
          AND bt.amount_cents < 0
          AND bt.created_at >= $${startDateParam}::date
          AND bt.created_at < ($${endDateParam}::date + interval '1 day')

        UNION ALL

        -- Vendor Payouts
        SELECT
          id,
          'vendor_payout'::text as source,
          payment_date::text as date,
          COALESCE(description, CONCAT('Payment to ', vendor_name)) as description,
          amount_cents,
          COALESCE(category_id, 'op_vendors') as category_id,
          COALESCE(
            (SELECT name FROM expense_categories WHERE category_id = vendor_payouts.category_id LIMIT 1),
            'Vendor Payments'
          ) as category_name,
          'operating'::text as category_type,
          vendor_name,
          count_for_pnl,
          pnl_exclusion_reason,
          jsonb_build_object(
            'vendor_id', vendor_id,
            'payment_method', payment_method,
            'reference_number', reference_number
          ) as metadata
        FROM vendor_payouts
        WHERE payment_date >= $${startDateParam}::date AND payment_date <= $${endDateParam}::date

        UNION ALL

        -- Contractor Payouts
        SELECT
          id,
          'contractor_payout'::text as source,
          payment_date::text as date,
          COALESCE(description, CONCAT('Payment to ', contractor_name)) as description,
          amount_cents,
          COALESCE(category_id, 'op_contractors') as category_id,
          COALESCE(
            (SELECT name FROM expense_categories WHERE category_id = contractor_payouts.category_id LIMIT 1),
            'Contractor Payments'
          ) as category_name,
          'operating'::text as category_type,
          contractor_name as vendor_name,
          count_for_pnl,
          pnl_exclusion_reason,
          jsonb_build_object(
            'contractor_id', contractor_id,
            'payment_method', payment_method,
            'reference_number', reference_number
          ) as metadata
        FROM contractor_payouts
        WHERE payment_date >= $${startDateParam}::date AND payment_date <= $${endDateParam}::date

        UNION ALL

        -- Operating Expenses
        SELECT
          oe.id,
          'operating_expense'::text as source,
          oe.date::text as date,
          oe.description,
          oe.amount_cents,
          oe.category_id,
          COALESCE(ec.name, 'Uncategorized') as category_name,
          COALESCE(ec.expense_type::text, 'other') as category_type,
          oe.vendor_name,
          oe.count_for_pnl,
          oe.pnl_exclusion_reason,
          jsonb_build_object(
            'receipt_url', oe.receipt_url,
            'notes', oe.notes
          ) as metadata
        FROM operating_expenses oe
        LEFT JOIN expense_categories ec ON ec.category_id = oe.category_id
        WHERE oe.date >= $${startDateParam}::date AND oe.date <= $${endDateParam}::date
      )
      SELECT * FROM unified
      WHERE 1=1 ${sourceFilter} ${searchFilter} ${pnlFilter} ${categoryTypeFilter}
      ORDER BY date DESC, amount_cents DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    const dataResult = await sql.query(query, values)

    // Count query
    const countValues = values.slice(0, -2)
    const countQuery = `
      WITH unified AS (
        SELECT 'ad_spend'::text as source, date, 'Meta Ads' as description, 1 as amount_cents, 'mkt_meta' as category_id, 'marketing'::text as category_type, NULL as vendor_name, count_for_pnl, NULL as pnl_exclusion_reason
        FROM ad_spend
        WHERE date >= $${startDateParam}::date AND date <= $${endDateParam}::date

        UNION ALL

        SELECT 'creator_payout'::text, created_at::date, 'Creator Payout', 1, 'mkt_creator', 'marketing'::text, NULL, true, NULL
        FROM balance_transactions
        WHERE type = 'payout' AND amount_cents < 0
          AND created_at >= $${startDateParam}::date
          AND created_at < ($${endDateParam}::date + interval '1 day')

        UNION ALL

        SELECT 'vendor_payout'::text, payment_date, description, 1, category_id, 'operating'::text, vendor_name, count_for_pnl, pnl_exclusion_reason
        FROM vendor_payouts
        WHERE payment_date >= $${startDateParam}::date AND payment_date <= $${endDateParam}::date

        UNION ALL

        SELECT 'contractor_payout'::text, payment_date, description, 1, category_id, 'operating'::text, contractor_name, count_for_pnl, pnl_exclusion_reason
        FROM contractor_payouts
        WHERE payment_date >= $${startDateParam}::date AND payment_date <= $${endDateParam}::date

        UNION ALL

        SELECT 'operating_expense'::text, oe.date, oe.description, 1, oe.category_id, COALESCE(ec.expense_type::text, 'other'), oe.vendor_name, oe.count_for_pnl, oe.pnl_exclusion_reason
        FROM operating_expenses oe
        LEFT JOIN expense_categories ec ON ec.category_id = oe.category_id
        WHERE oe.date >= $${startDateParam}::date AND oe.date <= $${endDateParam}::date
      )
      SELECT COUNT(*) as count FROM unified
      WHERE 1=1 ${sourceFilter} ${searchFilter} ${pnlFilter} ${categoryTypeFilter}
    `

    const countResult = await sql.query(countQuery, countValues)

    return {
      rows: dataResult.rows as UnifiedExpense[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get unified expenses summary
 */
export async function getUnifiedExpensesSummary(
  tenantSlug: string,
  startDate: string,
  endDate: string
): Promise<UnifiedExpenseSummary> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      WITH unified AS (
        -- Ad Spend
        SELECT
          'ad_spend'::text as source,
          'marketing'::text as category_type,
          spend_cents as amount_cents,
          count_for_pnl
        FROM ad_spend
        WHERE date >= ${startDate}::date AND date <= ${endDate}::date

        UNION ALL

        -- Creator Payouts
        SELECT
          'creator_payout'::text as source,
          'marketing'::text as category_type,
          ABS(amount_cents) as amount_cents,
          true as count_for_pnl
        FROM balance_transactions
        WHERE type = 'payout' AND amount_cents < 0
          AND created_at >= ${startDate}::date
          AND created_at < (${endDate}::date + interval '1 day')

        UNION ALL

        -- Vendor Payouts
        SELECT
          'vendor_payout'::text as source,
          'operating'::text as category_type,
          amount_cents,
          count_for_pnl
        FROM vendor_payouts
        WHERE payment_date >= ${startDate}::date AND payment_date <= ${endDate}::date

        UNION ALL

        -- Contractor Payouts
        SELECT
          'contractor_payout'::text as source,
          'operating'::text as category_type,
          amount_cents,
          count_for_pnl
        FROM contractor_payouts
        WHERE payment_date >= ${startDate}::date AND payment_date <= ${endDate}::date

        UNION ALL

        -- Operating Expenses
        SELECT
          'operating_expense'::text as source,
          COALESCE(ec.expense_type::text, 'other') as category_type,
          oe.amount_cents,
          oe.count_for_pnl
        FROM operating_expenses oe
        LEFT JOIN expense_categories ec ON ec.category_id = oe.category_id
        WHERE oe.date >= ${startDate}::date AND oe.date <= ${endDate}::date
      ),
      totals AS (
        SELECT
          COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
          COALESCE(SUM(CASE WHEN count_for_pnl THEN amount_cents ELSE 0 END), 0)::bigint as total_included_cents,
          COALESCE(SUM(CASE WHEN NOT count_for_pnl THEN amount_cents ELSE 0 END), 0)::bigint as total_excluded_cents
        FROM unified
      ),
      by_source AS (
        SELECT
          source,
          COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
          COUNT(*)::int as count
        FROM unified
        GROUP BY source
      ),
      by_category_type AS (
        SELECT
          category_type,
          COALESCE(SUM(amount_cents), 0)::bigint as total_cents,
          COUNT(*)::int as count
        FROM unified
        GROUP BY category_type
      )
      SELECT
        (SELECT total_cents FROM totals) as total_cents,
        (SELECT total_included_cents FROM totals) as total_included_cents,
        (SELECT total_excluded_cents FROM totals) as total_excluded_cents,
        (SELECT json_agg(json_build_object('source', source, 'total_cents', total_cents, 'count', count)) FROM by_source) as by_source,
        (SELECT json_agg(json_build_object('category_type', category_type, 'total_cents', total_cents, 'count', count)) FROM by_category_type) as by_category_type
    `

    const row = result.rows[0]
    if (!row) {
      return {
        total_cents: 0,
        total_included_cents: 0,
        total_excluded_cents: 0,
        by_source: [] as UnifiedExpenseSummary['by_source'],
        by_category_type: [] as UnifiedExpenseSummary['by_category_type'],
      }
    }
    return {
      total_cents: Number(row.total_cents || 0),
      total_included_cents: Number(row.total_included_cents || 0),
      total_excluded_cents: Number(row.total_excluded_cents || 0),
      by_source: (row.by_source || []) as UnifiedExpenseSummary['by_source'],
      by_category_type: (row.by_category_type || []) as UnifiedExpenseSummary['by_category_type'],
    }
  })
}

/**
 * Get expenses by category for a date range
 */
export async function getExpensesByCategory(
  tenantSlug: string,
  startDate: string,
  endDate: string,
  categoryType?: ExpenseCategoryType
): Promise<Array<{
  category_id: string
  category_name: string
  expense_type: ExpenseCategoryType
  total_cents: number
  items_count: number
}>> {
  return withTenant(tenantSlug, async () => {
    const typeFilter = categoryType ? `AND ec.expense_type = '${categoryType}'::expense_type` : ''

    const result = await sql.query(`
      WITH category_expenses AS (
        -- Operating expenses
        SELECT
          oe.category_id,
          oe.amount_cents
        FROM operating_expenses oe
        WHERE oe.date >= $1::date AND oe.date <= $2::date
          AND oe.count_for_pnl = true

        UNION ALL

        -- Vendor payouts
        SELECT
          COALESCE(category_id, 'op_vendors') as category_id,
          amount_cents
        FROM vendor_payouts
        WHERE payment_date >= $1::date AND payment_date <= $2::date
          AND count_for_pnl = true

        UNION ALL

        -- Contractor payouts
        SELECT
          COALESCE(category_id, 'op_contractors') as category_id,
          amount_cents
        FROM contractor_payouts
        WHERE payment_date >= $1::date AND payment_date <= $2::date
          AND count_for_pnl = true

        UNION ALL

        -- Ad spend
        SELECT
          CASE platform
            WHEN 'meta' THEN 'mkt_meta'
            WHEN 'google' THEN 'mkt_google'
            WHEN 'tiktok' THEN 'mkt_tiktok'
            ELSE 'mkt_other'
          END as category_id,
          spend_cents as amount_cents
        FROM ad_spend
        WHERE date >= $1::date AND date <= $2::date
          AND count_for_pnl = true
      )
      SELECT
        ec.category_id,
        ec.name as category_name,
        ec.expense_type,
        COALESCE(SUM(ce.amount_cents), 0)::bigint as total_cents,
        COUNT(ce.amount_cents)::int as items_count
      FROM expense_categories ec
      LEFT JOIN category_expenses ce ON ce.category_id = ec.category_id
      WHERE ec.is_active = true ${typeFilter}
      GROUP BY ec.category_id, ec.name, ec.expense_type, ec.display_order
      HAVING COALESCE(SUM(ce.amount_cents), 0) > 0
      ORDER BY ec.expense_type, ec.display_order, total_cents DESC
    `, [startDate, endDate])

    return result.rows as Array<{
      category_id: string
      category_name: string
      expense_type: ExpenseCategoryType
      total_cents: number
      items_count: number
    }>
  })
}

/**
 * Get line item details for a P&L category (for expansion)
 */
export async function getPnlLineDetails(
  tenantSlug: string,
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  id: string
  date: string
  description: string
  amount_cents: number
  source: ExpenseSource
}>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        date::text as date,
        description,
        amount_cents,
        'operating_expense'::text as source
      FROM operating_expenses
      WHERE category_id = ${categoryId}
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
        AND count_for_pnl = true

      UNION ALL

      SELECT
        id,
        payment_date::text as date,
        COALESCE(description, CONCAT('Payment to ', vendor_name)) as description,
        amount_cents,
        'vendor_payout'::text as source
      FROM vendor_payouts
      WHERE (category_id = ${categoryId} OR (category_id IS NULL AND ${categoryId} = 'op_vendors'))
        AND payment_date >= ${startDate}::date
        AND payment_date <= ${endDate}::date
        AND count_for_pnl = true

      UNION ALL

      SELECT
        id,
        payment_date::text as date,
        COALESCE(description, CONCAT('Payment to ', contractor_name)) as description,
        amount_cents,
        'contractor_payout'::text as source
      FROM contractor_payouts
      WHERE (category_id = ${categoryId} OR (category_id IS NULL AND ${categoryId} = 'op_contractors'))
        AND payment_date >= ${startDate}::date
        AND payment_date <= ${endDate}::date
        AND count_for_pnl = true

      ORDER BY date DESC, amount_cents DESC
    `

    return result.rows as Array<{
      id: string
      date: string
      description: string
      amount_cents: number
      source: ExpenseSource
    }>
  })
}
