/**
 * P&L Statement Calculator
 * Calculates full Profit & Loss statements from all data sources
 * Phase 2H: Financial Expenses & P&L
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { PLStatement, PLComparisonData, AdPlatform } from './types'

/**
 * Calculate P&L statement for a date range
 */
export async function calculatePLStatement(
  tenantSlug: string,
  startDate: string,
  endDate: string
): Promise<PLStatement> {
  return withTenant(tenantSlug, async () => {
    // Get revenue data from orders
    const revenueResult = await sql`
      SELECT
        COALESCE(SUM(subtotal_cents), 0)::bigint as gross_sales_cents,
        COALESCE(SUM(discount_cents), 0)::bigint as discounts_cents,
        COALESCE(SUM(CASE WHEN financial_status = 'refunded' THEN subtotal_cents ELSE 0 END), 0)::bigint as returns_cents,
        COALESCE(SUM(shipping_cents), 0)::bigint as shipping_revenue_cents
      FROM orders
      WHERE order_placed_at >= ${startDate}::timestamp
        AND order_placed_at < (${endDate}::date + interval '1 day')
        AND financial_status NOT IN ('cancelled', 'voided')
    `

    const revenue = revenueResult.rows[0] ?? {}
    const grossSalesCents = Number(revenue.gross_sales_cents || 0)
    const discountsCents = Number(revenue.discounts_cents || 0)
    const returnsCents = Number(revenue.returns_cents || 0)
    const shippingRevenueCents = Number(revenue.shipping_revenue_cents || 0)
    const netRevenueCents = grossSalesCents - discountsCents - returnsCents + shippingRevenueCents

    // Get COGS from product costs (linked orders)
    const cogsResult = await sql`
      SELECT
        COALESCE(SUM(oi.quantity * COALESCE(pc.cogs_cents, 0)), 0)::bigint as product_cost_cents
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN product_cogs pc ON pc.product_id = oi.product_id
        AND (pc.variant_id = oi.variant_id OR pc.variant_id IS NULL)
      WHERE o.order_placed_at >= ${startDate}::timestamp
        AND o.order_placed_at < (${endDate}::date + interval '1 day')
        AND o.financial_status NOT IN ('cancelled', 'voided', 'refunded')
    `

    const productCostCents = Number(cogsResult.rows[0]?.product_cost_cents || 0)
    const grossProfitCents = netRevenueCents - productCostCents
    const grossMarginPercent = netRevenueCents > 0 ? (grossProfitCents / netRevenueCents) * 100 : 0

    // Get variable costs config
    const variableConfigResult = await sql`
      SELECT
        payment_percentage_rate,
        payment_fixed_fee_cents,
        pick_pack_fee_cents,
        packaging_cost_cents
      FROM variable_cost_config
      LIMIT 1
    `

    const variableConfig = variableConfigResult.rows[0] || {
      payment_percentage_rate: 0.029,
      payment_fixed_fee_cents: 30,
      pick_pack_fee_cents: 200,
      packaging_cost_cents: 75,
    }

    // Calculate payment processing fees
    const orderCountResult = await sql`
      SELECT COUNT(*)::int as order_count
      FROM orders
      WHERE order_placed_at >= ${startDate}::timestamp
        AND order_placed_at < (${endDate}::date + interval '1 day')
        AND financial_status NOT IN ('cancelled', 'voided')
    `
    const orderCount = Number(orderCountResult.rows[0]?.order_count || 0)

    const paymentProcessingCents = Math.round(
      (grossSalesCents * Number(variableConfig.payment_percentage_rate || 0.029)) +
      (orderCount * Number(variableConfig.payment_fixed_fee_cents || 30))
    )

    // Get actual shipping costs from expenses (if tracked)
    const shippingCostsResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as shipping_costs_cents
      FROM operating_expenses
      WHERE category_id IN ('var_shipping')
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
        AND count_for_pnl = true
    `
    const shippingCostsCents = Number(shippingCostsResult.rows[0]?.shipping_costs_cents || 0)

    // Calculate fulfillment costs
    const fulfillmentCents =
      orderCount * (Number(variableConfig.pick_pack_fee_cents || 0) + Number(variableConfig.packaging_cost_cents || 0))

    // Get other variable costs
    const otherVariableResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as other_cents
      FROM operating_expenses oe
      JOIN expense_categories ec ON ec.category_id = oe.category_id
      WHERE ec.expense_type = 'variable'
        AND oe.category_id NOT IN ('var_shipping', 'var_fulfillment', 'var_payment')
        AND oe.date >= ${startDate}::date
        AND oe.date <= ${endDate}::date
        AND oe.count_for_pnl = true
    `
    const otherVariableCents = Number(otherVariableResult.rows[0]?.other_cents || 0)

    const totalVariableCents = paymentProcessingCents + shippingCostsCents + fulfillmentCents + otherVariableCents
    const contributionMarginCents = grossProfitCents - totalVariableCents
    const contributionMarginPercent = netRevenueCents > 0 ? (contributionMarginCents / netRevenueCents) * 100 : 0

    // Get ad spend by platform
    const adSpendResult = await sql`
      SELECT
        platform,
        COALESCE(SUM(spend_cents), 0)::bigint as spend_cents
      FROM ad_spend
      WHERE date >= ${startDate}::date
        AND date <= ${endDate}::date
        AND count_for_pnl = true
      GROUP BY platform
      ORDER BY spend_cents DESC
    `

    const adSpendByPlatform = adSpendResult.rows.map((row) => ({
      platform: row.platform as AdPlatform,
      spend_cents: Number(row.spend_cents),
    }))
    const totalAdSpendCents = adSpendByPlatform.reduce((sum, p) => sum + p.spend_cents, 0)

    // Get creator payouts
    const creatorPayoutsResult = await sql`
      SELECT COALESCE(SUM(ABS(amount_cents)), 0)::bigint as creator_payouts_cents
      FROM balance_transactions
      WHERE type = 'payout'
        AND amount_cents < 0
        AND created_at >= ${startDate}::timestamp
        AND created_at < (${endDate}::date + interval '1 day')
    `
    const creatorPayoutsCents = Number(creatorPayoutsResult.rows[0]?.creator_payouts_cents || 0)

    const totalMarketingCents = totalAdSpendCents + creatorPayoutsCents
    const contributionProfitCents = contributionMarginCents - totalMarketingCents

    // Get operating expenses by category
    const operatingByCategoryResult = await sql`
      SELECT
        ec.category_id,
        ec.name as category_name,
        COALESCE(SUM(oe.amount_cents), 0)::bigint as total_cents,
        COUNT(*)::int as items_count
      FROM expense_categories ec
      LEFT JOIN operating_expenses oe ON oe.category_id = ec.category_id
        AND oe.date >= ${startDate}::date
        AND oe.date <= ${endDate}::date
        AND oe.count_for_pnl = true
      WHERE ec.expense_type = 'operating'
        AND ec.is_active = true
      GROUP BY ec.category_id, ec.name, ec.display_order
      HAVING COALESCE(SUM(oe.amount_cents), 0) > 0
      ORDER BY ec.display_order, total_cents DESC
    `

    const operatingByCategory = operatingByCategoryResult.rows.map((row) => ({
      category_id: row.category_id as string,
      category_name: row.category_name as string,
      total_cents: Number(row.total_cents),
      items_count: Number(row.items_count),
    }))

    // Get vendor payouts
    const vendorPayoutsResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as vendor_payouts_cents
      FROM vendor_payouts
      WHERE payment_date >= ${startDate}::date
        AND payment_date <= ${endDate}::date
        AND count_for_pnl = true
    `
    const vendorPayoutsCents = Number(vendorPayoutsResult.rows[0]?.vendor_payouts_cents || 0)

    // Get contractor payouts
    const contractorPayoutsResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as contractor_payouts_cents
      FROM contractor_payouts
      WHERE payment_date >= ${startDate}::date
        AND payment_date <= ${endDate}::date
        AND count_for_pnl = true
    `
    const contractorPayoutsCents = Number(contractorPayoutsResult.rows[0]?.contractor_payouts_cents || 0)

    const totalOperatingExpensesCents =
      operatingByCategory.reduce((sum, c) => sum + c.total_cents, 0) +
      vendorPayoutsCents +
      contractorPayoutsCents

    const operatingIncomeCents = contributionProfitCents - totalOperatingExpensesCents
    const netProfitCents = operatingIncomeCents
    const netMarginPercent = netRevenueCents > 0 ? (netProfitCents / netRevenueCents) * 100 : 0

    // Generate period label
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const periodLabel = `${startDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${endDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
        label: periodLabel,
      },
      revenue: {
        gross_sales_cents: grossSalesCents,
        discounts_cents: discountsCents,
        returns_cents: returnsCents,
        shipping_revenue_cents: shippingRevenueCents,
        net_revenue_cents: netRevenueCents,
      },
      cogs: {
        product_cost_cents: productCostCents,
        gross_profit_cents: grossProfitCents,
        gross_margin_percent: Math.round(grossMarginPercent * 100) / 100,
      },
      variable_costs: {
        payment_processing_cents: paymentProcessingCents,
        shipping_costs_cents: shippingCostsCents,
        fulfillment_cents: fulfillmentCents,
        other_cents: otherVariableCents,
        total_cents: totalVariableCents,
        contribution_margin_cents: contributionMarginCents,
        contribution_margin_percent: Math.round(contributionMarginPercent * 100) / 100,
      },
      marketing: {
        ad_spend_by_platform: adSpendByPlatform,
        total_ad_spend_cents: totalAdSpendCents,
        creator_payouts_cents: creatorPayoutsCents,
        total_cents: totalMarketingCents,
        contribution_profit_cents: contributionProfitCents,
      },
      operating: {
        by_category: operatingByCategory,
        vendor_payouts_cents: vendorPayoutsCents,
        contractor_payouts_cents: contractorPayoutsCents,
        total_cents: totalOperatingExpensesCents,
        operating_income_cents: operatingIncomeCents,
      },
      net_profit_cents: netProfitCents,
      net_margin_percent: Math.round(netMarginPercent * 100) / 100,
    }
  })
}

/**
 * Calculate P&L with comparison period
 */
export async function calculatePLComparison(
  tenantSlug: string,
  startDate: string,
  endDate: string,
  comparisonType: 'previous_period' | 'year_over_year'
): Promise<PLComparisonData> {
  const current = await calculatePLStatement(tenantSlug, startDate, endDate)

  // Calculate comparison period dates
  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))

  let compStartDate: string
  let compEndDate: string

  if (comparisonType === 'year_over_year') {
    const compStart = new Date(startDateObj)
    compStart.setFullYear(compStart.getFullYear() - 1)
    const compEnd = new Date(endDateObj)
    compEnd.setFullYear(compEnd.getFullYear() - 1)
    compStartDate = compStart.toISOString().split('T')[0] ?? ''
    compEndDate = compEnd.toISOString().split('T')[0] ?? ''
  } else {
    const compEnd = new Date(startDateObj)
    compEnd.setDate(compEnd.getDate() - 1)
    const compStart = new Date(compEnd)
    compStart.setDate(compStart.getDate() - periodDays + 1)
    compStartDate = compStart.toISOString().split('T')[0] ?? ''
    compEndDate = compEnd.toISOString().split('T')[0] ?? ''
  }

  const comparison = await calculatePLStatement(tenantSlug, compStartDate, compEndDate)

  // Calculate changes
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100
  }

  return {
    current: {
      ...current,
      revenue: {
        ...current.revenue,
        net_revenue_change_percent: calcChange(
          current.revenue.net_revenue_cents,
          comparison.revenue.net_revenue_cents
        ),
      },
      cogs: {
        ...current.cogs,
        gross_profit_change_percent: calcChange(
          current.cogs.gross_profit_cents,
          comparison.cogs.gross_profit_cents
        ),
      },
      net_profit_change_percent: calcChange(current.net_profit_cents, comparison.net_profit_cents),
      comparison: {
        start_date: compStartDate,
        end_date: compEndDate,
        label: comparisonType === 'year_over_year' ? 'Year over Year' : 'Previous Period',
      },
    },
    comparison,
    changes: {
      net_revenue_change_cents: current.revenue.net_revenue_cents - comparison.revenue.net_revenue_cents,
      net_revenue_change_percent: calcChange(
        current.revenue.net_revenue_cents,
        comparison.revenue.net_revenue_cents
      ),
      gross_profit_change_cents: current.cogs.gross_profit_cents - comparison.cogs.gross_profit_cents,
      gross_profit_change_percent: calcChange(
        current.cogs.gross_profit_cents,
        comparison.cogs.gross_profit_cents
      ),
      net_profit_change_cents: current.net_profit_cents - comparison.net_profit_cents,
      net_profit_change_percent: calcChange(current.net_profit_cents, comparison.net_profit_cents),
    },
  }
}

/**
 * Get quick P&L presets
 */
export function getPresetDateRanges(): Array<{
  id: string
  label: string
  start_date: string
  end_date: string
}> {
  const now = new Date()
  const today = now.toISOString().split('T')[0] ?? ''

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0] ?? ''

  // Last month
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0] ?? ''
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0] ?? ''

  // This quarter
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const thisQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
  const thisQuarterStartStr = thisQuarterStart.toISOString().split('T')[0] ?? ''

  // YTD
  const ytdStart = new Date(now.getFullYear(), 0, 1)
  const ytdStartStr = ytdStart.toISOString().split('T')[0] ?? ''

  // Last year
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
  const lastYearStartStr = lastYearStart.toISOString().split('T')[0] ?? ''
  const lastYearEndStr = lastYearEnd.toISOString().split('T')[0] ?? ''

  return [
    { id: 'this_month', label: 'This Month', start_date: thisMonthStartStr, end_date: today },
    { id: 'last_month', label: 'Last Month', start_date: lastMonthStartStr, end_date: lastMonthEndStr },
    { id: 'this_quarter', label: 'This Quarter', start_date: thisQuarterStartStr, end_date: today },
    { id: 'ytd', label: 'Year to Date', start_date: ytdStartStr, end_date: today },
    { id: 'last_year', label: 'Last Year', start_date: lastYearStartStr, end_date: lastYearEndStr },
  ]
}
