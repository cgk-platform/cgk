/**
 * Subscription Analytics Service
 *
 * Provides analytics and reporting for subscription data.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk/db'

import type {
  SubscriptionAnalytics,
  SubscriptionOverviewMetrics,
  CohortData,
  ChurnAnalysis,
  GrowthMetrics,
  ProductSubscriptionData,
  Subscription,
} from './types'
import { getMRR } from './service'

/**
 * Get overview metrics for subscriptions
 */
export async function getOverviewMetrics(
  tenantSlug: string
): Promise<SubscriptionOverviewMetrics> {
  return withTenant(tenantSlug, async () => {
    // Get counts by status
    const countsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status IN ('active', 'paused')) as total_active
      FROM subscriptions
    `

    const counts = countsResult.rows[0] || {}
    const activeCount = Number(counts.active_count || 0)
    const pausedCount = Number(counts.paused_count || 0)
    const cancelledCount = Number(counts.cancelled_count || 0)
    const totalActive = Number(counts.total_active || 0)

    // Calculate MRR
    const mrr = await getMRR(tenantSlug)
    const arr = mrr * 12

    // Calculate ARPU (Average Revenue Per User)
    const arpu = totalActive > 0 ? mrr / totalActive : 0

    // Calculate churn rate (cancelled in last 30 days / active at start of period)
    const churnResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE cancelled_at >= NOW() - INTERVAL '30 days') as churned,
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days' AND (cancelled_at IS NULL OR cancelled_at >= NOW() - INTERVAL '30 days')) as active_at_start
      FROM subscriptions
    `
    const churnData = churnResult.rows[0] || {}
    const churned = Number(churnData.churned || 0)
    const activeAtStart = Number(churnData.active_at_start || 0)
    const churnRate = activeAtStart > 0 ? (churned / activeAtStart) * 100 : 0

    // Calculate net MRR change (expansion - contraction - churn)
    const mrrChangeResult = await sql`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN cancelled_at >= NOW() - INTERVAL '30 days'
            THEN -(price_cents - discount_cents) * quantity
            ELSE 0
          END
        ), 0) as churned_mrr,
        COALESCE(SUM(
          CASE
            WHEN started_at >= NOW() - INTERVAL '30 days' AND status = 'active'
            THEN (price_cents - discount_cents) * quantity
            ELSE 0
          END
        ), 0) as new_mrr
      FROM subscriptions
    `
    const mrrChange = mrrChangeResult.rows[0] || {}
    const newMrr = Number(mrrChange.new_mrr || 0)
    const churnedMrr = Number(mrrChange.churned_mrr || 0)
    const netMrrChange = newMrr + churnedMrr // churnedMrr is negative

    return {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      netMrrChange: Math.round(netMrrChange),
      activeCount,
      pausedCount,
      cancelledCount,
      arpu: Math.round(arpu),
      churnRate: Math.round(churnRate * 100) / 100,
    }
  })
}

/**
 * Get cohort analysis data
 */
export async function getCohortAnalysis(
  tenantSlug: string,
  months: number = 12
): Promise<CohortData[]> {
  return withTenant(tenantSlug, async () => {
    // Use parameterized query to handle the months interval
    const result = await sql.query(
      `WITH cohorts AS (
        SELECT
          DATE_TRUNC('month', started_at) as cohort_month,
          id,
          started_at,
          cancelled_at,
          (price_cents - discount_cents) * quantity as monthly_value
        FROM subscriptions
        WHERE started_at >= NOW() - ($1 || ' months')::interval
      ),
      cohort_sizes AS (
        SELECT
          cohort_month,
          COUNT(*) as subscribers,
          SUM(monthly_value) as initial_mrr
        FROM cohorts
        GROUP BY cohort_month
      ),
      retention AS (
        SELECT
          c.cohort_month,
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.cohort_month))::int as months_since,
          COUNT(*) FILTER (WHERE c.cancelled_at IS NULL OR c.cancelled_at > (c.cohort_month + (EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.cohort_month))::int || ' months')::interval)) as retained
        FROM cohorts c
        GROUP BY c.cohort_month, months_since
      )
      SELECT
        cs.cohort_month,
        cs.subscribers,
        cs.initial_mrr,
        r.months_since,
        r.retained,
        ROUND(r.retained::numeric / NULLIF(cs.subscribers, 0) * 100, 1) as retention_rate
      FROM cohort_sizes cs
      LEFT JOIN retention r ON cs.cohort_month = r.cohort_month
      ORDER BY cs.cohort_month DESC, r.months_since ASC`,
      [String(months)]
    )

    // Group results by cohort month
    const cohortMap = new Map<string, CohortData>()

    for (const row of result.rows) {
      const month = (row.cohort_month as Date).toISOString().slice(0, 7)

      if (!cohortMap.has(month)) {
        cohortMap.set(month, {
          month,
          subscribers: Number(row.subscribers || 0),
          retentionByMonth: [],
          ltv: 0,
          churnRate: 0,
        })
      }

      const cohort = cohortMap.get(month)!
      if (row.retention_rate !== null) {
        cohort.retentionByMonth.push(Number(row.retention_rate))
      }
    }

    // Calculate LTV and churn rate for each cohort
    for (const cohort of cohortMap.values()) {
      if (cohort.retentionByMonth.length > 0) {
        const avgRetention = cohort.retentionByMonth.reduce((a, b) => a + b, 0) / cohort.retentionByMonth.length
        cohort.churnRate = 100 - avgRetention
        // Simple LTV calculation: initial value * average lifetime
        const avgLifetimeMonths = 100 / Math.max(cohort.churnRate, 1)
        cohort.ltv = Math.round(avgLifetimeMonths * 100) // Placeholder value calculation
      }
    }

    return Array.from(cohortMap.values())
  })
}

/**
 * Get churn analysis data
 */
export async function getChurnAnalysis(
  tenantSlug: string,
  days: number = 90
): Promise<ChurnAnalysis> {
  return withTenant(tenantSlug, async () => {
    // Churn trend over time - using parameterized query
    const trendResult = await sql.query(
      `SELECT
        DATE_TRUNC('day', cancelled_at) as date,
        COUNT(*) as churned,
        (
          SELECT COUNT(*)
          FROM subscriptions s2
          WHERE s2.status = 'active'
            AND s2.created_at <= DATE_TRUNC('day', s.cancelled_at)
        ) as active_at_time
      FROM subscriptions s
      WHERE cancelled_at >= NOW() - ($1 || ' days')::interval
        AND cancelled_at IS NOT NULL
      GROUP BY DATE_TRUNC('day', cancelled_at)
      ORDER BY date ASC`,
      [String(days)]
    )

    const trend = trendResult.rows.map((row) => ({
      date: (row.date as Date).toISOString().slice(0, 10),
      rate: Number(row.active_at_time) > 0
        ? (Number(row.churned) / Number(row.active_at_time)) * 100
        : 0,
    }))

    // Churn by reason - using parameterized query
    const reasonResult = await sql.query(
      `SELECT
        COALESCE(cancel_reason, 'Not specified') as reason,
        COUNT(*) as count
      FROM subscriptions
      WHERE cancelled_at >= NOW() - ($1 || ' days')::interval
        AND cancelled_at IS NOT NULL
      GROUP BY cancel_reason
      ORDER BY count DESC`,
      [String(days)]
    )

    const totalChurned = reasonResult.rows.reduce((sum, row) => sum + Number(row.count), 0)
    const byReason = reasonResult.rows.map((row) => ({
      reason: row.reason as string,
      count: Number(row.count),
      percentage: totalChurned > 0 ? (Number(row.count) / totalChurned) * 100 : 0,
    }))

    // Churn by product - using parameterized query
    const productResult = await sql.query(
      `SELECT
        product_id,
        product_title,
        COUNT(*) FILTER (WHERE cancelled_at >= NOW() - ($1 || ' days')::interval) as churned,
        COUNT(*) FILTER (WHERE status = 'active' OR cancelled_at >= NOW() - ($1 || ' days')::interval) as total
      FROM subscriptions
      GROUP BY product_id, product_title
      HAVING COUNT(*) FILTER (WHERE cancelled_at >= NOW() - ($1 || ' days')::interval) > 0
      ORDER BY churned DESC`,
      [String(days)]
    )

    const byProduct = productResult.rows.map((row) => ({
      productId: row.product_id as string,
      productTitle: row.product_title as string,
      churnRate: Number(row.total) > 0 ? (Number(row.churned) / Number(row.total)) * 100 : 0,
    }))

    // At-risk subscribers (no orders in 2x billing period, payment failed, etc.)
    const atRiskResult = await sql`
      SELECT *
      FROM subscriptions
      WHERE status = 'active'
        AND (
          next_billing_date < NOW()
          OR last_billing_date < NOW() - INTERVAL '60 days'
          OR sync_error IS NOT NULL
        )
      ORDER BY next_billing_date ASC
      LIMIT 50
    `

    // Map at-risk subscriptions - simplified for now
    const atRisk: Subscription[] = atRiskResult.rows.map((row) => ({
      id: row.id as string,
      provider: row.provider as Subscription['provider'],
      providerSubscriptionId: row.provider_subscription_id as string | null,
      shopifySubscriptionId: row.shopify_subscription_id as string | null,
      customerId: row.customer_id as string,
      customerEmail: row.customer_email as string,
      customerName: row.customer_name as string | null,
      productId: row.product_id as string,
      variantId: row.variant_id as string | null,
      productTitle: row.product_title as string,
      variantTitle: row.variant_title as string | null,
      quantity: row.quantity as number,
      priceCents: row.price_cents as number,
      discountCents: row.discount_cents as number,
      discountType: row.discount_type as string | null,
      discountCode: row.discount_code as string | null,
      currency: row.currency as string,
      frequency: row.frequency as Subscription['frequency'],
      frequencyInterval: row.frequency_interval as number,
      status: row.status as Subscription['status'],
      pauseReason: row.pause_reason as string | null,
      cancelReason: row.cancel_reason as string | null,
      pausedAt: row.paused_at as string | null,
      cancelledAt: row.cancelled_at as string | null,
      autoResumeAt: row.auto_resume_at as string | null,
      nextBillingDate: row.next_billing_date as string | null,
      lastBillingDate: row.last_billing_date as string | null,
      billingAnchorDay: row.billing_anchor_day as number | null,
      paymentMethodId: row.payment_method_id as string | null,
      paymentMethodLast4: row.payment_method_last4 as string | null,
      paymentMethodBrand: row.payment_method_brand as string | null,
      paymentMethodExpMonth: row.payment_method_exp_month as number | null,
      paymentMethodExpYear: row.payment_method_exp_year as number | null,
      shippingAddress: row.shipping_address as Subscription['shippingAddress'],
      totalOrders: row.total_orders as number,
      totalSpentCents: row.total_spent_cents as number,
      skippedOrders: row.skipped_orders as number,
      sellingPlanId: row.selling_plan_id as string | null,
      sellingPlanName: row.selling_plan_name as string | null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      notes: row.notes as string | null,
      tags: (row.tags as string[]) || [],
      lastSyncedAt: row.last_synced_at as string | null,
      syncError: row.sync_error as string | null,
      startedAt: row.started_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))

    return {
      trend,
      byReason,
      byProduct,
      atRisk,
    }
  })
}

/**
 * Get growth metrics
 */
export async function getGrowthMetrics(
  tenantSlug: string,
  days: number = 30
): Promise<GrowthMetrics> {
  return withTenant(tenantSlug, async () => {
    // Summary metrics - using parameterized query
    const summaryResult = await sql.query(
      `SELECT
        COUNT(*) FILTER (WHERE started_at >= NOW() - ($1 || ' days')::interval AND status = 'active') as new_subscribers,
        COUNT(*) FILTER (WHERE cancelled_at >= NOW() - ($1 || ' days')::interval) as churned_subscribers
      FROM subscriptions`,
      [String(days)]
    )

    const summary = summaryResult.rows[0] || {}
    const newSubscribers = Number(summary.new_subscribers || 0)
    const churnedSubscribers = Number(summary.churned_subscribers || 0)
    const netGrowth = newSubscribers - churnedSubscribers

    // Calculate velocity (average daily net growth)
    const velocity = netGrowth / days

    // Trend data - using parameterized query
    const trendResult = await sql.query(
      `WITH dates AS (
        SELECT generate_series(
          NOW() - ($1 || ' days')::interval,
          NOW(),
          '1 day'::interval
        )::date as date
      )
      SELECT
        d.date,
        COUNT(*) FILTER (WHERE s.started_at::date = d.date AND s.status = 'active') as new,
        COUNT(*) FILTER (WHERE s.cancelled_at::date = d.date) as churned
      FROM dates d
      LEFT JOIN subscriptions s ON true
      GROUP BY d.date
      ORDER BY d.date ASC`,
      [String(days)]
    )

    const trend = trendResult.rows.map((row) => {
      const newCount = Number(row.new || 0)
      const churnedCount = Number(row.churned || 0)
      return {
        date: (row.date as Date).toISOString().slice(0, 10),
        new: newCount,
        churned: churnedCount,
        net: newCount - churnedCount,
      }
    })

    return {
      newSubscribers,
      churnedSubscribers,
      netGrowth,
      velocity: Math.round(velocity * 100) / 100,
      trend,
    }
  })
}

/**
 * Get product breakdown
 */
export async function getProductBreakdown(
  tenantSlug: string
): Promise<ProductSubscriptionData[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        product_id,
        product_title,
        COUNT(*) FILTER (WHERE status = 'active') as active_subscribers,
        SUM((price_cents - discount_cents) * quantity) FILTER (WHERE status = 'active') as revenue,
        COUNT(*) FILTER (WHERE cancelled_at >= NOW() - INTERVAL '30 days') as churned_30d,
        COUNT(*) FILTER (WHERE status = 'active' OR cancelled_at >= NOW() - INTERVAL '30 days') as total_30d,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '30 days' AND status = 'active') as converted_from_trial
      FROM subscriptions
      GROUP BY product_id, product_title
      ORDER BY active_subscribers DESC
    `

    return result.rows.map((row) => {
      const total30d = Number(row.total_30d || 0)
      const churned30d = Number(row.churned_30d || 0)

      return {
        productId: row.product_id as string,
        productTitle: row.product_title as string,
        activeSubscribers: Number(row.active_subscribers || 0),
        revenue: Number(row.revenue || 0),
        churnRate: total30d > 0 ? (churned30d / total30d) * 100 : 0,
        conversionFromTrial: Number(row.converted_from_trial || 0), // Simplified
      }
    })
  })
}

/**
 * Get full analytics dashboard data
 */
export async function getAnalytics(
  tenantSlug: string,
  dateRange: { days: number } = { days: 30 }
): Promise<SubscriptionAnalytics> {
  const [overview, cohorts, churnAnalysis, growthMetrics, productBreakdown] = await Promise.all([
    getOverviewMetrics(tenantSlug),
    getCohortAnalysis(tenantSlug, 12),
    getChurnAnalysis(tenantSlug, dateRange.days),
    getGrowthMetrics(tenantSlug, dateRange.days),
    getProductBreakdown(tenantSlug),
  ])

  return {
    overview,
    cohorts,
    churnAnalysis,
    growthMetrics,
    productBreakdown,
  }
}
