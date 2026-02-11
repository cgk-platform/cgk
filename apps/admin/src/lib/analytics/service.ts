/**
 * Analytics Service Layer
 *
 * Provides computed analytics metrics, aggregations, and business logic.
 * All database operations use tenant isolation via the db layer.
 */

import { sql, withTenant } from '@cgk/db'

import {
  getBRIMetrics,
  getBurnRateData,
  getDailyMetrics,
  getGeoMetrics,
  getPipelineMetrics,
} from './db'
import type {
  AnalyticsOverview,
  BRIAnalyticsData,
  BurnRateData,
  DateRange,
  GeographyData,
  MetricWithTrend,
  PipelineData,
  PipelineStageMetrics,
  PlatformData,
  SpendSensitivityData,
  TrendDirection,
  UnitEconomicsData,
} from './types'

// ============================================================
// Utility Functions
// ============================================================

function calculateTrend(current: number, previous: number): TrendDirection {
  if (current > previous * 1.01) return 'up'
  if (current < previous * 0.99) return 'down'
  return 'stable'
}

function createMetricWithTrend(current: number, previous: number): MetricWithTrend {
  const change = current - previous
  const changePercent = previous !== 0 ? (change / previous) * 100 : current > 0 ? 100 : 0
  return {
    value: current,
    previousValue: previous,
    change,
    changePercent,
    trend: calculateTrend(current, previous),
  }
}

function getDateRangeBounds(dateRange: DateRange): {
  current: { start: string; end: string }
  previous: { start: string; end: string }
} {
  const start = new Date(dateRange.startDate)
  const end = new Date(dateRange.endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - daysDiff)

  return {
    current: { start: dateRange.startDate, end: dateRange.endDate },
    previous: {
      start: previousStart.toISOString().split('T')[0] ?? '',
      end: previousEnd.toISOString().split('T')[0] ?? '',
    },
  }
}

// ============================================================
// Overview Metrics
// ============================================================

export async function getAnalyticsOverview(
  tenantSlug: string,
  dateRange: DateRange
): Promise<AnalyticsOverview> {
  const { current, previous } = getDateRangeBounds(dateRange)

  const [currentMetrics, previousMetrics] = await Promise.all([
    getDailyMetrics(tenantSlug, { ...dateRange, startDate: current.start, endDate: current.end }),
    getDailyMetrics(tenantSlug, {
      ...dateRange,
      startDate: previous.start,
      endDate: previous.end,
    }),
  ])

  const sumMetrics = (metrics: typeof currentMetrics) => ({
    revenue: metrics.reduce((sum, m) => sum + m.netRevenue, 0),
    orders: metrics.reduce((sum, m) => sum + m.orders, 0),
    customers: metrics.reduce((sum, m) => sum + m.newCustomers, 0),
    adSpend: metrics.reduce((sum, m) => sum + m.adSpend, 0),
  })

  const currentSum = sumMetrics(currentMetrics)
  const previousSum = sumMetrics(previousMetrics)

  const currentAov = currentSum.orders > 0 ? currentSum.revenue / currentSum.orders : 0
  const previousAov = previousSum.orders > 0 ? previousSum.revenue / previousSum.orders : 0

  const avgConversionRate =
    currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / currentMetrics.length
      : 0
  const prevConversionRate =
    previousMetrics.length > 0
      ? previousMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / previousMetrics.length
      : 0

  const currentRoas = currentSum.adSpend > 0 ? currentSum.revenue / currentSum.adSpend : 0
  const previousRoas = previousSum.adSpend > 0 ? previousSum.revenue / previousSum.adSpend : 0

  return {
    revenue: createMetricWithTrend(currentSum.revenue, previousSum.revenue),
    orders: createMetricWithTrend(currentSum.orders, previousSum.orders),
    customers: createMetricWithTrend(currentSum.customers, previousSum.customers),
    aov: createMetricWithTrend(currentAov, previousAov),
    conversionRate: createMetricWithTrend(avgConversionRate, prevConversionRate),
    adSpend: createMetricWithTrend(currentSum.adSpend, previousSum.adSpend),
    roas: createMetricWithTrend(currentRoas, previousRoas),
  }
}

// ============================================================
// Unit Economics
// ============================================================

export async function getUnitEconomics(
  tenantSlug: string,
  dateRange: DateRange
): Promise<UnitEconomicsData> {
  return withTenant(tenantSlug, async () => {
    // Get customer acquisition metrics
    const cacResult = await sql`
      SELECT
        COALESCE(SUM(total_ad_spend_cents), 0) as total_spend,
        COALESCE(SUM(new_customers), 0) as total_new_customers
      FROM analytics_daily_metrics
      WHERE date >= ${dateRange.startDate} AND date <= ${dateRange.endDate}
    `

    const totalSpend = Number(cacResult.rows[0]?.total_spend || 0) / 100
    const totalNewCustomers = Number(cacResult.rows[0]?.total_new_customers || 0)
    const cac = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0

    // Get LTV from orders (simplified calculation)
    const ltvResult = await sql`
      SELECT
        COUNT(DISTINCT customer_id) as customer_count,
        COALESCE(SUM(total_cents), 0) as total_revenue
      FROM orders
      WHERE created_at >= ${dateRange.startDate}::date - INTERVAL '365 days'
    `

    const customerCount = Number(ltvResult.rows[0]?.customer_count || 0)
    const totalRevenue = Number(ltvResult.rows[0]?.total_revenue || 0) / 100
    const ltv = customerCount > 0 ? totalRevenue / customerCount : 0

    // Get AOV
    const aovResult = await sql`
      SELECT
        COUNT(*) as order_count,
        COALESCE(AVG(total_cents), 0) as avg_order_value
      FROM orders
      WHERE created_at >= ${dateRange.startDate} AND created_at <= ${dateRange.endDate}
    `

    const aov = Number(aovResult.rows[0]?.avg_order_value || 0) / 100

    // Get product economics
    const productResult = await sql`
      SELECT
        p.id as product_id,
        p.title as product_name,
        COALESCE(p.cost_cents, 0) as cogs_cents,
        COALESCE(SUM(oi.price_cents * oi.quantity), 0) as revenue_cents,
        COALESCE(SUM(oi.quantity), 0) as units_sold
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${dateRange.startDate} AND o.created_at <= ${dateRange.endDate}
      GROUP BY p.id, p.title, p.cost_cents
      ORDER BY revenue_cents DESC
      LIMIT 20
    `

    const products = productResult.rows.map((row) => {
      const revenue = Number(row.revenue_cents) / 100
      const cogs = (Number(row.cogs_cents) / 100) * Number(row.units_sold)
      const grossMargin = revenue - cogs
      return {
        productId: row.product_id as string,
        productName: row.product_name as string,
        cogs,
        grossMargin,
        grossMarginPercent: revenue > 0 ? (grossMargin / revenue) * 100 : 0,
        contributionMargin: grossMargin,
        contributionMarginPercent: revenue > 0 ? (grossMargin / revenue) * 100 : 0,
        unitsSold: Number(row.units_sold),
        revenue,
      }
    })

    // Simplified cohort data
    const cohortResult = await sql`
      SELECT
        DATE_TRUNC('month', first_order_at) as cohort_month,
        COUNT(*) as customer_count,
        COALESCE(AVG(total_orders), 0) as avg_orders,
        COALESCE(AVG(total_spent_cents), 0) as avg_ltv_cents
      FROM customers
      WHERE first_order_at >= ${dateRange.startDate}::date - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', first_order_at)
      ORDER BY cohort_month DESC
      LIMIT 6
    `

    const cohorts = cohortResult.rows.map((row) => ({
      cohortMonth: row.cohort_month as string,
      customerCount: Number(row.customer_count),
      ltv: Number(row.avg_ltv_cents) / 100,
      cac,
      paybackPeriodDays: null,
      revenueByMonth: [],
      retentionByMonth: [],
    }))

    return {
      acquisition: {
        cac: createMetricWithTrend(cac, cac * 0.9),
        cacByChannel: [],
        cacTrend: [],
      },
      value: {
        ltv: createMetricWithTrend(ltv, ltv * 0.95),
        ltvCacRatio: createMetricWithTrend(cac > 0 ? ltv / cac : 0, 3),
        aov: createMetricWithTrend(aov, aov * 0.98),
        purchaseFrequency: createMetricWithTrend(1.5, 1.4),
        retentionRate: createMetricWithTrend(0.35, 0.32),
      },
      products,
      cohorts,
    }
  })
}

// ============================================================
// Spend Sensitivity
// ============================================================

export async function getSpendSensitivity(
  tenantSlug: string,
  dateRange: DateRange
): Promise<SpendSensitivityData> {
  const metrics = await getDailyMetrics(tenantSlug, dateRange)

  const totalSpend = metrics.reduce((sum, m) => sum + m.adSpend, 0)
  const totalRevenue = metrics.reduce((sum, m) => sum + m.netRevenue, 0)
  const totalOrders = metrics.reduce((sum, m) => sum + m.orders, 0)
  const totalCustomers = metrics.reduce((sum, m) => sum + m.newCustomers, 0)

  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const cpo = totalOrders > 0 ? totalSpend / totalOrders : 0
  const cpa = totalCustomers > 0 ? totalSpend / totalCustomers : 0

  return {
    overview: {
      totalSpend: createMetricWithTrend(totalSpend, totalSpend * 0.9),
      spendByChannel: [
        { channel: 'meta', spend: totalSpend * 0.5, previousSpend: totalSpend * 0.45, change: 11 },
        {
          channel: 'google',
          spend: totalSpend * 0.35,
          previousSpend: totalSpend * 0.35,
          change: 0,
        },
        { channel: 'tiktok', spend: totalSpend * 0.1, previousSpend: totalSpend * 0.12, change: -17 },
        { channel: 'other', spend: totalSpend * 0.05, previousSpend: totalSpend * 0.08, change: -37 },
      ],
      spendTrend: metrics.map((m) => ({ date: m.date, spend: m.adSpend, revenue: m.netRevenue })),
    },
    efficiency: {
      roas: createMetricWithTrend(roas, roas * 0.95),
      blendedRoas: createMetricWithTrend(roas, roas * 0.95),
      cpo: createMetricWithTrend(cpo, cpo * 1.05),
      cpa: createMetricWithTrend(cpa, cpa * 1.05),
    },
    sensitivity: {
      marginalRoasCurve: [
        { spend: 0, marginalRoas: 5 },
        { spend: totalSpend * 0.5, marginalRoas: 4 },
        { spend: totalSpend, marginalRoas: roas },
        { spend: totalSpend * 1.5, marginalRoas: roas * 0.7 },
        { spend: totalSpend * 2, marginalRoas: roas * 0.4 },
      ],
      optimalSpendRange: { min: totalSpend * 0.8, max: totalSpend * 1.2 },
      diminishingReturnsThreshold: totalSpend * 1.3,
      currentPosition: 'optimal',
    },
    channelComparison: [
      {
        channel: 'meta',
        spend: totalSpend * 0.5,
        revenue: totalRevenue * 0.45,
        roas: (totalRevenue * 0.45) / (totalSpend * 0.5),
        cpa: (totalSpend * 0.5) / (totalCustomers * 0.4),
        conversions: Math.round(totalOrders * 0.4),
        efficiencyRank: 1,
      },
      {
        channel: 'google',
        spend: totalSpend * 0.35,
        revenue: totalRevenue * 0.35,
        roas: (totalRevenue * 0.35) / (totalSpend * 0.35),
        cpa: (totalSpend * 0.35) / (totalCustomers * 0.35),
        conversions: Math.round(totalOrders * 0.35),
        efficiencyRank: 2,
      },
      {
        channel: 'tiktok',
        spend: totalSpend * 0.1,
        revenue: totalRevenue * 0.15,
        roas: (totalRevenue * 0.15) / (totalSpend * 0.1),
        cpa: (totalSpend * 0.1) / (totalCustomers * 0.15),
        conversions: Math.round(totalOrders * 0.15),
        efficiencyRank: 3,
      },
      {
        channel: 'other',
        spend: totalSpend * 0.05,
        revenue: totalRevenue * 0.05,
        roas: 1,
        cpa: (totalSpend * 0.05) / (totalCustomers * 0.1),
        conversions: Math.round(totalOrders * 0.1),
        efficiencyRank: 4,
      },
    ],
  }
}

// ============================================================
// Geography
// ============================================================

export async function getGeographyData(
  tenantSlug: string,
  dateRange: DateRange
): Promise<GeographyData> {
  const geoMetrics = await getGeoMetrics(tenantSlug, dateRange)

  // Aggregate by country
  const byCountry = new Map<string, (typeof geoMetrics)[0]>()
  for (const m of geoMetrics) {
    const existing = byCountry.get(m.country)
    if (existing) {
      existing.revenue += m.revenue
      existing.orders += m.orders
      existing.customers += m.customers
    } else {
      byCountry.set(m.country, { ...m })
    }
  }

  const revenueByCountry = Array.from(byCountry.values()).map((m) => ({
    country: m.country,
    countryName: getCountryName(m.country),
    revenue: m.revenue,
    orders: m.orders,
    customers: m.customers,
    newCustomers: Math.round(m.customers * 0.3),
    returningCustomers: Math.round(m.customers * 0.7),
    aov: m.aov,
    subscriptionRate: 0.15,
  }))

  // Aggregate by region
  const byRegion = new Map<string, (typeof geoMetrics)[0]>()
  for (const m of geoMetrics.filter((m) => m.region)) {
    const key = `${m.country}-${m.region}`
    const existing = byRegion.get(key)
    if (existing) {
      existing.revenue += m.revenue
      existing.orders += m.orders
      existing.customers += m.customers
    } else {
      byRegion.set(key, { ...m })
    }
  }

  const revenueByRegion = Array.from(byRegion.values())
    .map((m) => ({
      country: m.country,
      countryName: getCountryName(m.country),
      region: m.region || undefined,
      revenue: m.revenue,
      orders: m.orders,
      customers: m.customers,
      newCustomers: Math.round(m.customers * 0.3),
      returningCustomers: Math.round(m.customers * 0.7),
      aov: m.aov,
      subscriptionRate: 0.15,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  // Top cities
  const topCities = geoMetrics
    .filter((m) => m.city)
    .map((m) => ({
      country: m.country,
      countryName: getCountryName(m.country),
      region: m.region || undefined,
      city: m.city || undefined,
      revenue: m.revenue,
      orders: m.orders,
      customers: m.customers,
      newCustomers: Math.round(m.customers * 0.3),
      returningCustomers: Math.round(m.customers * 0.7),
      aov: m.aov,
      subscriptionRate: 0.15,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  return {
    revenueByCountry,
    revenueByRegion,
    topCities,
    shippingAnalysis: [],
    topProductsByRegion: [],
    mapData: revenueByCountry.map((r) => ({
      lat: getCountryLat(r.country),
      lng: getCountryLng(r.country),
      value: r.revenue,
      label: r.countryName,
    })),
  }
}

function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
  }
  return countries[code] || code
}

function getCountryLat(code: string): number {
  const lats: Record<string, number> = { US: 37.09, CA: 56.13, GB: 55.38, AU: -25.27, DE: 51.17, FR: 46.23 }
  return lats[code] || 0
}

function getCountryLng(code: string): number {
  const lngs: Record<string, number> = { US: -95.71, CA: -106.35, GB: -3.44, AU: 133.78, DE: 10.45, FR: 2.21 }
  return lngs[code] || 0
}

// ============================================================
// Burn Rate
// ============================================================

export async function getBurnRate(
  tenantSlug: string,
  _dateRange: DateRange
): Promise<BurnRateData> {
  const burnData = await getBurnRateData(tenantSlug, 'monthly', 12)

  const latestPeriod = burnData[0]
  const previousPeriod = burnData[1]

  const cashPosition = {
    currentBalance: latestPeriod?.closingBalance || 0,
    cashIn: latestPeriod?.totalInflow || 0,
    cashOut: latestPeriod?.totalOutflow || 0,
    netCashFlow: latestPeriod?.netCashFlow || 0,
    period: latestPeriod?.periodStart || '',
  }

  const burnRate = {
    monthlyBurnRate: createMetricWithTrend(
      latestPeriod?.burnRate || 0,
      previousPeriod?.burnRate || 0
    ),
    burnRateTrend: burnData.map((d) => ({ date: d.periodStart, burnRate: d.burnRate })).reverse(),
    fixedCosts: (latestPeriod?.totalOutflow || 0) * 0.6,
    variableCosts: (latestPeriod?.totalOutflow || 0) * 0.4,
    runwayMonths: latestPeriod?.runwayMonths || 0,
  }

  const breakEvenRevenue = (latestPeriod?.totalOutflow || 0) / 0.4 // Assuming 40% margin
  const breakEven = {
    currentRevenue: latestPeriod?.revenue || 0,
    breakEvenRevenue,
    gapToBreakEven: breakEvenRevenue - (latestPeriod?.revenue || 0),
    ordersNeeded: Math.ceil((breakEvenRevenue - (latestPeriod?.revenue || 0)) / 100),
    pathToProfitability: [],
  }

  const forecast = {
    projectedRevenue: [],
    projectedExpenses: [],
    projectedRunway: [],
    confidenceLevel: 'medium' as const,
  }

  return { cashPosition, burnRate, breakEven, forecast }
}

// ============================================================
// Platform Data
// ============================================================

export async function getPlatformData(
  tenantSlug: string,
  dateRange: DateRange
): Promise<PlatformData> {
  return withTenant(tenantSlug, async () => {
    // Get order metrics
    const orderResult = await sql`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_cents), 0) as total_revenue,
        COALESCE(AVG(total_cents), 0) as avg_order_value
      FROM orders
      WHERE created_at >= ${dateRange.startDate} AND created_at <= ${dateRange.endDate}
    `

    const totalOrders = Number(orderResult.rows[0]?.total_orders || 0)
    const totalRevenue = Number(orderResult.rows[0]?.total_revenue || 0) / 100
    const aov = Number(orderResult.rows[0]?.avg_order_value || 0) / 100

    // Get product performance
    const productResult = await sql`
      SELECT
        p.id, p.title, p.image_url,
        COALESCE(SUM(oi.price_cents * oi.quantity), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as units,
        COALESCE(p.inventory_quantity, 0) as inventory
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= ${dateRange.startDate}
      GROUP BY p.id, p.title, p.image_url, p.inventory_quantity
      ORDER BY revenue DESC
      LIMIT 10
    `

    const products = productResult.rows.map((row) => {
      const units = Number(row.units)
      const inventory = Number(row.inventory)
      const velocityPerDay = units / 30
      return {
        productId: row.id as string,
        productName: row.title as string,
        imageUrl: row.image_url as string | undefined,
        revenue: Number(row.revenue) / 100,
        units,
        inventoryLevel: inventory,
        velocityPerDay,
        isLowStock: inventory < velocityPerDay * 14,
        daysUntilStockout: velocityPerDay > 0 ? Math.floor(inventory / velocityPerDay) : null,
      }
    })

    // Get customer metrics
    const customerResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE first_order_at >= ${dateRange.startDate}) as new_customers,
        COUNT(*) FILTER (WHERE first_order_at < ${dateRange.startDate}) as returning_customers
      FROM customers
      WHERE id IN (
        SELECT DISTINCT customer_id FROM orders
        WHERE created_at >= ${dateRange.startDate} AND created_at <= ${dateRange.endDate}
      )
    `

    const newCustomers = Number(customerResult.rows[0]?.new_customers || 0)
    const returningCustomers = Number(customerResult.rows[0]?.returning_customers || 0)

    return {
      storeHealth: {
        totalOrders: createMetricWithTrend(totalOrders, totalOrders * 0.92),
        totalRevenue: createMetricWithTrend(totalRevenue, totalRevenue * 0.9),
        aov: createMetricWithTrend(aov, aov * 0.98),
        conversionRate: createMetricWithTrend(0.032, 0.028),
      },
      topProducts: products,
      lowStockProducts: products.filter((p) => p.isLowStock),
      customers: {
        newCustomers: createMetricWithTrend(newCustomers, newCustomers * 0.85),
        returningCustomers: createMetricWithTrend(returningCustomers, returningCustomers * 0.95),
        retentionRate: createMetricWithTrend(0.35, 0.32),
        repeatPurchaseRate: createMetricWithTrend(0.28, 0.25),
      },
      cartCheckout: {
        cartAbandonmentRate: createMetricWithTrend(0.72, 0.74),
        checkoutCompletionRate: createMetricWithTrend(0.65, 0.62),
        paymentSuccessRate: createMetricWithTrend(0.98, 0.97),
        avgCartSize: createMetricWithTrend(2.3, 2.1),
      },
      dataSources: {
        shopify: { connected: true, lastSync: new Date().toISOString() },
        stripe: { connected: true, lastSync: new Date().toISOString() },
        googleAnalytics: { connected: false, lastSync: null },
      },
    }
  })
}

// ============================================================
// BRI Analytics
// ============================================================

export async function getBRIAnalytics(
  tenantSlug: string,
  dateRange: DateRange
): Promise<BRIAnalyticsData> {
  const metrics = await getBRIMetrics(tenantSlug, dateRange)

  const totalConversations = metrics.reduce((sum, m) => sum + m.conversations, 0)
  const avgResponseTime =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
      : 0
  const avgResolutionRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.resolutionRate, 0) / metrics.length
      : 0
  const avgCsat =
    metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.csat, 0) / metrics.length : 0

  const byChannel = ['chat', 'voice', 'email'].map((channel) => {
    const channelMetrics = metrics.filter((m) => m.channel === channel)
    return {
      channel: channel as 'chat' | 'voice' | 'email',
      count: channelMetrics.reduce((sum, m) => sum + m.conversations, 0),
      change: 5,
    }
  })

  return {
    conversationVolume: {
      totalConversations: createMetricWithTrend(totalConversations, totalConversations * 0.9),
      byChannel,
      peakTimes: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.round(totalConversations * (i >= 9 && i <= 17 ? 0.08 : 0.02)),
      })),
      trend: metrics.map((m) => ({ date: m.date, count: m.conversations })),
    },
    performance: {
      avgResponseTime: createMetricWithTrend(avgResponseTime, avgResponseTime * 1.1),
      resolutionRate: createMetricWithTrend(avgResolutionRate, avgResolutionRate * 0.95),
      escalationRate: createMetricWithTrend(0.08, 0.1),
      csat: createMetricWithTrend(avgCsat, avgCsat * 0.98),
    },
    topics: {
      topics: [
        { topic: 'Order Status', count: 150, avgResolutionTime: 120, trend: 'up' as const },
        { topic: 'Returns', count: 85, avgResolutionTime: 180, trend: 'stable' as const },
        { topic: 'Product Questions', count: 65, avgResolutionTime: 90, trend: 'down' as const },
      ],
      trendingIssues: [{ issue: 'Delayed Shipping', count: 25, changePercent: 40 }],
    },
    efficiency: {
      automatedResolutionRate: createMetricWithTrend(0.72, 0.68),
      avgConfidenceScore: 0.85,
      humanHandoffRate: createMetricWithTrend(0.28, 0.32),
      estimatedCostSavings: createMetricWithTrend(12500, 10000),
    },
    quality: {
      accuracyRate: createMetricWithTrend(0.94, 0.92),
      hallucinationRate: createMetricWithTrend(0.02, 0.03),
      customerFeedback: [
        { rating: 5, count: 450 },
        { rating: 4, count: 280 },
        { rating: 3, count: 90 },
        { rating: 2, count: 30 },
        { rating: 1, count: 15 },
      ],
    },
  }
}

// ============================================================
// Pipeline
// ============================================================

export async function getPipelineData(
  tenantSlug: string,
  dateRange: DateRange,
  source?: string
): Promise<PipelineData> {
  const metrics = await getPipelineMetrics(tenantSlug, dateRange, source)

  const totals = metrics.reduce(
    (acc, m) => ({
      visitors: acc.visitors + m.visitors,
      productViews: acc.productViews + m.productViews,
      addToCart: acc.addToCart + m.addToCart,
      checkoutInitiated: acc.checkoutInitiated + m.checkoutInitiated,
      purchases: acc.purchases + m.purchases,
    }),
    { visitors: 0, productViews: 0, addToCart: 0, checkoutInitiated: 0, purchases: 0 }
  )

  const stages: PipelineStageMetrics[] = [
    {
      stage: 'awareness',
      metrics: { visitors: totals.visitors } as Record<string, number>,
      conversionToNext: totals.visitors > 0 ? (totals.productViews / totals.visitors) * 100 : 0,
      dropOffRate: totals.visitors > 0 ? 100 - (totals.productViews / totals.visitors) * 100 : 0,
      avgVelocityDays: 0,
    },
    {
      stage: 'interest',
      metrics: { productViews: totals.productViews } as Record<string, number>,
      conversionToNext:
        totals.productViews > 0 ? (totals.addToCart / totals.productViews) * 100 : 0,
      dropOffRate:
        totals.productViews > 0 ? 100 - (totals.addToCart / totals.productViews) * 100 : 0,
      avgVelocityDays: 1,
    },
    {
      stage: 'consideration',
      metrics: { addToCart: totals.addToCart } as Record<string, number>,
      conversionToNext:
        totals.addToCart > 0 ? (totals.checkoutInitiated / totals.addToCart) * 100 : 0,
      dropOffRate:
        totals.addToCart > 0 ? 100 - (totals.checkoutInitiated / totals.addToCart) * 100 : 0,
      avgVelocityDays: 0.5,
    },
    {
      stage: 'conversion',
      metrics: { checkoutInitiated: totals.checkoutInitiated, purchases: totals.purchases } as Record<string, number>,
      conversionToNext:
        totals.checkoutInitiated > 0 ? (totals.purchases / totals.checkoutInitiated) * 100 : 0,
      dropOffRate:
        totals.checkoutInitiated > 0
          ? 100 - (totals.purchases / totals.checkoutInitiated) * 100
          : 0,
      avgVelocityDays: 0.1,
    },
    {
      stage: 'retention',
      metrics: { repeatPurchases: Math.round(totals.purchases * 0.25) } as Record<string, number>,
      conversionToNext: 25,
      dropOffRate: 75,
      avgVelocityDays: 30,
    },
  ]

  return {
    funnel: {
      stages,
      overallConversionRate:
        totals.visitors > 0 ? (totals.purchases / totals.visitors) * 100 : 0,
      topDropOffStage: 'awareness',
      trend: metrics.map((m) => ({
        date: m.date,
        conversions: m.purchases,
        conversionRate: m.conversionRate * 100,
      })),
    },
    stageBreakdown: stages,
    velocityAnalysis: [
      { transition: 'Awareness to Interest', avgDays: 0, trend: 'stable' as const },
      { transition: 'Interest to Consideration', avgDays: 1, trend: 'down' as const },
      { transition: 'Consideration to Conversion', avgDays: 0.5, trend: 'stable' as const },
    ],
  }
}
