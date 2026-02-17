import { createGlobalCache, sql, withTenant } from '@cgk-platform/db'

import type { PlatformAnalytics, TenantRevenue, TimeSeriesDataPoint } from '../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache TTL for analytics data (5 minutes - balance between freshness and performance)
const ANALYTICS_CACHE_TTL = 300

// Batch size for processing tenants
const TENANT_BATCH_SIZE = 25

// Timeout per tenant query in milliseconds
const TENANT_QUERY_TIMEOUT = 5000

/**
 * GET /api/platform/analytics
 *
 * Returns platform-wide analytics aggregated across all tenants.
 * Supports date range filtering via query params.
 *
 * Query params:
 * - startDate: Start date (ISO string, default: 30 days ago)
 * - endDate: End date (ISO string, default: now)
 * - granularity: 'day' | 'week' | 'month' (default: 'day')
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)

    // Parse date range params
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')

    const startDate = startDateParam ? new Date(startDateParam) : thirtyDaysAgo
    const endDate = endDateParam ? new Date(endDateParam) : now

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (startDate > endDate) {
      return Response.json({ error: 'startDate must be before endDate' }, { status: 400 })
    }

    // Generate cache key
    const cacheKey = `platform-analytics:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`
    const cache = createGlobalCache()
    const cachedData = await cache.get<PlatformAnalytics>(cacheKey)

    if (cachedData) {
      return Response.json({
        data: cachedData,
        cached: true,
        cachedAt: new Date().toISOString(),
      })
    }

    // Aggregate analytics from all tenants
    const analytics = await aggregatePlatformAnalytics(startDate, endDate)

    // Cache the result
    await cache.set(cacheKey, analytics, { ttl: ANALYTICS_CACHE_TTL })

    return Response.json({
      data: analytics,
      cached: false,
    })
  } catch (error) {
    console.error('Failed to fetch platform analytics:', error)
    return Response.json({ error: 'Failed to fetch platform analytics' }, { status: 500 })
  }
}

interface TenantMetrics {
  slug: string
  name: string
  gmvCents: number
  orderCount: number
  customerCount: number
  newCustomers: number
  dailyData: { date: string; gmvCents: number; orderCount: number; customerCount: number }[]
}

/**
 * Query a single tenant's analytics metrics with timeout protection
 */
async function queryTenantAnalytics(
  tenantSlug: string,
  tenantName: string,
  startDate: Date,
  endDate: Date
): Promise<TenantMetrics> {
  const timeoutPromise = new Promise<TenantMetrics>((_, reject) => {
    setTimeout(() => reject(new Error('Tenant query timeout')), TENANT_QUERY_TIMEOUT)
  })

  const queryPromise = withTenant(tenantSlug, async () => {
    // Get aggregate metrics
    const [ordersResult, customersResult, dailyResult] = await Promise.all([
      // Total GMV and order count
      sql`
        SELECT
          COALESCE(SUM(total_cents), 0) as gmv_cents,
          COUNT(*) as order_count
        FROM orders
        WHERE created_at >= ${startDate.toISOString()}
          AND created_at <= ${endDate.toISOString()}
          AND financial_status IN ('paid', 'partially_paid', 'partially_refunded')
      `,
      // Customer metrics
      sql`
        SELECT
          COUNT(DISTINCT id) as total_customers,
          COUNT(DISTINCT id) FILTER (WHERE created_at >= ${startDate.toISOString()}) as new_customers
        FROM customers
        WHERE created_at <= ${endDate.toISOString()}
      `,
      // Daily breakdown
      sql`
        SELECT
          DATE(created_at) as date,
          COALESCE(SUM(total_cents), 0) as gmv_cents,
          COUNT(*) as order_count,
          COUNT(DISTINCT customer_id) as customer_count
        FROM orders
        WHERE created_at >= ${startDate.toISOString()}
          AND created_at <= ${endDate.toISOString()}
          AND financial_status IN ('paid', 'partially_paid', 'partially_refunded')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `,
    ])

    const dailyData = dailyResult.rows.map((row) => ({
      date: String(row.date),
      gmvCents: Number(row.gmv_cents || 0),
      orderCount: Number(row.order_count || 0),
      customerCount: Number(row.customer_count || 0),
    }))

    return {
      slug: tenantSlug,
      name: tenantName,
      gmvCents: Number(ordersResult.rows[0]?.gmv_cents || 0),
      orderCount: Number(ordersResult.rows[0]?.order_count || 0),
      customerCount: Number(customersResult.rows[0]?.total_customers || 0),
      newCustomers: Number(customersResult.rows[0]?.new_customers || 0),
      dailyData,
    }
  })

  return Promise.race([queryPromise, timeoutPromise])
}

/**
 * Aggregate analytics across all tenants
 */
async function aggregatePlatformAnalytics(
  startDate: Date,
  endDate: Date
): Promise<PlatformAnalytics> {
  // Get all active tenants
  const tenantsResult = await sql`
    SELECT slug, name FROM organizations WHERE status = 'active' ORDER BY name
  `

  const tenants = tenantsResult.rows.map((row) => ({
    slug: row.slug as string,
    name: row.name as string,
  }))

  // Aggregate metrics across tenants in batches
  const allTenantMetrics: TenantMetrics[] = []

  for (let i = 0; i < tenants.length; i += TENANT_BATCH_SIZE) {
    const batch = tenants.slice(i, i + TENANT_BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map((t) => queryTenantAnalytics(t.slug, t.name, startDate, endDate))
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allTenantMetrics.push(result.value)
      }
    }
  }

  // Calculate totals
  let totalGmvCents = 0
  let totalOrderCount = 0
  let totalCustomerCount = 0
  let totalNewCustomers = 0

  for (const metrics of allTenantMetrics) {
    totalGmvCents += metrics.gmvCents
    totalOrderCount += metrics.orderCount
    totalCustomerCount += metrics.customerCount
    totalNewCustomers += metrics.newCustomers
  }

  // Build tenant revenue breakdown (sorted by GMV descending)
  const tenantRevenue: TenantRevenue[] = allTenantMetrics
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      gmvCents: m.gmvCents,
      orderCount: m.orderCount,
      aovCents: m.orderCount > 0 ? Math.round(m.gmvCents / m.orderCount) : 0,
    }))
    .sort((a, b) => b.gmvCents - a.gmvCents)
    .slice(0, 10) // Top 10 tenants

  // Build time series data by aggregating all tenant daily data
  const dateMap = new Map<string, { gmvCents: number; orderCount: number; customerCount: number }>()

  // Initialize all dates in range
  const current = new Date(startDate)
  while (current <= endDate) {
    const isoStr = current.toISOString()
    const dateStr = isoStr.split('T')[0] ?? isoStr.substring(0, 10)
    dateMap.set(dateStr, { gmvCents: 0, orderCount: 0, customerCount: 0 })
    current.setDate(current.getDate() + 1)
  }

  // Aggregate daily data from all tenants
  for (const metrics of allTenantMetrics) {
    for (const daily of metrics.dailyData) {
      const dateStr = daily.date.includes('T')
        ? daily.date.split('T')[0] ?? daily.date.substring(0, 10)
        : daily.date
      const existing = dateMap.get(dateStr)
      if (existing) {
        existing.gmvCents += daily.gmvCents
        existing.orderCount += daily.orderCount
        existing.customerCount += daily.customerCount
      }
    }
  }

  // Convert to sorted array
  const timeSeries: TimeSeriesDataPoint[] = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      gmvCents: data.gmvCents,
      orderCount: data.orderCount,
      customerCount: data.customerCount,
    }))

  // Get previous period for growth calculations
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000)
  const previousEndDate = new Date(startDate.getTime() - 1)

  // Query previous period totals for growth comparison
  let previousGmvCents = 0
  let previousOrderCount = 0
  let previousCustomerCount = 0

  for (let i = 0; i < tenants.length; i += TENANT_BATCH_SIZE) {
    const batch = tenants.slice(i, i + TENANT_BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map((t) =>
        withTenant(t.slug, async () => {
          const result = await sql`
            SELECT
              COALESCE(SUM(total_cents), 0) as gmv_cents,
              COUNT(*) as order_count,
              COUNT(DISTINCT customer_id) as customer_count
            FROM orders
            WHERE created_at >= ${previousStartDate.toISOString()}
              AND created_at <= ${previousEndDate.toISOString()}
              AND financial_status IN ('paid', 'partially_paid', 'partially_refunded')
          `
          return {
            gmvCents: Number(result.rows[0]?.gmv_cents || 0),
            orderCount: Number(result.rows[0]?.order_count || 0),
            customerCount: Number(result.rows[0]?.customer_count || 0),
          }
        })
      )
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        previousGmvCents += result.value.gmvCents
        previousOrderCount += result.value.orderCount
        previousCustomerCount += result.value.customerCount
      }
    }
  }

  // Calculate growth indicators
  const momGmvChange =
    previousGmvCents > 0 ? ((totalGmvCents - previousGmvCents) / previousGmvCents) * 100 : 0
  const momOrderChange =
    previousOrderCount > 0
      ? ((totalOrderCount - previousOrderCount) / previousOrderCount) * 100
      : 0
  const momCustomerChange =
    previousCustomerCount > 0
      ? ((totalNewCustomers - previousCustomerCount) / previousCustomerCount) * 100
      : 0

  // Calculate AOV
  const currentAovCents = totalOrderCount > 0 ? Math.round(totalGmvCents / totalOrderCount) : 0
  const previousAovCents =
    previousOrderCount > 0 ? Math.round(previousGmvCents / previousOrderCount) : 0

  return {
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    timeSeries,
    tenantRevenue,
    customerMetrics: {
      totalCustomers: totalCustomerCount,
      newCustomers: totalNewCustomers,
      returningCustomers: totalCustomerCount - totalNewCustomers,
      aovCents: currentAovCents,
      previousAovCents,
    },
    growth: {
      momGmvChange: Number(momGmvChange.toFixed(1)),
      yoyGmvChange: null, // Would need 12+ months of data
      momOrderChange: Number(momOrderChange.toFixed(1)),
      momCustomerChange: Number(momCustomerChange.toFixed(1)),
    },
    totals: {
      gmvCents: totalGmvCents,
      orderCount: totalOrderCount,
      customerCount: totalCustomerCount,
    },
  }
}
