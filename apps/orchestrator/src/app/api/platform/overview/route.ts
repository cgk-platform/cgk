import { createGlobalCache, sql, withTenant } from '@cgk-platform/db'

import type { PlatformKPIs } from '../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache TTL for KPIs (60 seconds - balance between freshness and performance)
const KPI_CACHE_TTL = 60

// Batch size for processing tenants (avoid memory issues with large counts)
const TENANT_BATCH_SIZE = 50

// Timeout per tenant query in milliseconds
const TENANT_QUERY_TIMEOUT = 5000

/**
 * GET /api/platform/overview
 *
 * Returns platform-wide KPIs aggregated across all tenants.
 * Data is cached for 60 seconds to avoid hammering the database.
 * Uses batched processing to handle large tenant counts efficiently.
 */
export async function GET(request: Request): Promise<Response> {
  // Check for super admin authorization (set by middleware)
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  try {
    // Try to get from cache first
    const cache = createGlobalCache()
    const cachedKPIs = await cache.get<PlatformKPIs>('platform-kpis')

    if (cachedKPIs) {
      return Response.json({
        data: cachedKPIs,
        cached: true,
        cachedAt: new Date().toISOString(),
      })
    }

    // Aggregate KPIs from database
    const kpis = await aggregatePlatformKPIs()

    // Cache the result
    await cache.set('platform-kpis', kpis, { ttl: KPI_CACHE_TTL })

    return Response.json({
      data: kpis,
      cached: false,
    })
  } catch (error) {
    console.error('Failed to fetch platform KPIs:', error)
    return Response.json({ error: 'Failed to fetch platform KPIs' }, { status: 500 })
  }
}

/**
 * Aggregate platform KPIs across all tenants using batched processing
 */
async function aggregatePlatformKPIs(): Promise<PlatformKPIs> {
  // Run organization count and alert queries in parallel
  const [orgsResult, alertsResult, activityResult] = await Promise.all([
    // Get organization counts
    sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active
      FROM organizations
    `,
    // Get open alerts by priority
    sql`
      SELECT
        COUNT(*) FILTER (WHERE action LIKE '%p1%' OR metadata->>'priority' = 'p1') as p1,
        COUNT(*) FILTER (WHERE action LIKE '%p2%' OR metadata->>'priority' = 'p2') as p2,
        COUNT(*) FILTER (WHERE action LIKE '%p3%' OR metadata->>'priority' = 'p3') as p3
      FROM super_admin_audit_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND action IN ('alert_created', 'error_logged')
    `,
    // Get session/activity metrics for error rate proxy
    sql`
      SELECT
        COUNT(*) FILTER (WHERE action = 'api_request') as total_requests,
        COUNT(*) FILTER (WHERE action = 'api_request' AND (metadata->>'error')::boolean = true) as error_requests
      FROM super_admin_audit_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `,
  ])

  const totalBrands = Number(orgsResult.rows[0]?.total || 0)
  const activeBrands = Number(orgsResult.rows[0]?.active || 0)

  const openAlerts = {
    p1: Number(alertsResult.rows[0]?.p1 || 0),
    p2: Number(alertsResult.rows[0]?.p2 || 0),
    p3: Number(alertsResult.rows[0]?.p3 || 0),
  }

  // Calculate system status based on alerts
  let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (openAlerts.p1 > 0) {
    systemStatus = 'critical'
  } else if (openAlerts.p2 > 2 || openAlerts.p3 > 10) {
    systemStatus = 'degraded'
  }

  const totalRequests = Number(activityResult.rows[0]?.total_requests || 1)
  const errorRequests = Number(activityResult.rows[0]?.error_requests || 0)
  const errorRate24h = (errorRequests / totalRequests) * 100

  // Query health and job metrics
  const [healthMetricsResult, jobMetricsResult] = await Promise.all([
    // Get average latency from health check history (last 24 hours)
    sql`
      SELECT
        COALESCE(AVG(latency_ms), 150) as avg_latency,
        COUNT(*) FILTER (WHERE status = 'healthy') as healthy_checks,
        COUNT(*) as total_checks
      FROM health_check_history
      WHERE checked_at > NOW() - INTERVAL '24 hours'
    `,
    // Get pending and failed jobs from platform_jobs
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as failed_jobs_24h
      FROM platform_jobs
    `,
  ])

  const avgLatency = Math.round(Number(healthMetricsResult.rows[0]?.avg_latency || 150))
  const healthyChecks = Number(healthMetricsResult.rows[0]?.healthy_checks || 0)
  const totalChecks = Number(healthMetricsResult.rows[0]?.total_checks || 1)
  const uptimePercent = totalChecks > 0
    ? Number(((healthyChecks / totalChecks) * 100).toFixed(2))
    : 99.95

  const pendingJobs = Number(jobMetricsResult.rows[0]?.pending_jobs || 0)
  const failedJobs24h = Number(jobMetricsResult.rows[0]?.failed_jobs_24h || 0)

  // Initialize KPIs with base values
  const kpis: PlatformKPIs = {
    totalGMV: { value: 0, change: 0 },
    platformMRR: { value: 0, change: 0 },
    totalBrands,
    activeBrands,
    systemStatus,
    openAlerts,
    errorRate24h: Number(errorRate24h.toFixed(2)),
    avgLatency,
    uptimePercent,
    pendingJobs,
    failedJobs24h,
  }

  // Get ALL active tenant slugs
  const allTenantsResult = await sql`
    SELECT slug FROM organizations WHERE status = 'active' ORDER BY slug
  `

  const tenantSlugs = allTenantsResult.rows.map((row) => row.slug as string)

  // Aggregate GMV and MRR across all tenants in batches
  const { totalGMV, previousGMV, currentMRR, previousMRR } =
    await aggregateTenantMetrics(tenantSlugs)

  // Calculate GMV change percentage
  const gmvChange = previousGMV > 0 ? ((totalGMV - previousGMV) / previousGMV) * 100 : 0
  // GMV is stored in cents, convert to dollars for display
  kpis.totalGMV = { value: totalGMV / 100, change: Number(gmvChange.toFixed(1)) }

  // Calculate MRR change percentage
  const mrrChange = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0
  // MRR is stored in cents, convert to dollars for display
  kpis.platformMRR = { value: currentMRR / 100, change: Number(mrrChange.toFixed(1)) }

  return kpis
}

interface TenantMetrics {
  currentGMV: number
  previousGMV: number
  currentMRR: number
  previousMRR: number
}

/**
 * Query a single tenant's GMV and MRR metrics with timeout protection
 */
async function queryTenantMetrics(tenantSlug: string): Promise<TenantMetrics> {
  // Create a timeout promise
  const timeoutPromise = new Promise<TenantMetrics>((_, reject) => {
    setTimeout(() => reject(new Error('Tenant query timeout')), TENANT_QUERY_TIMEOUT)
  })

  const queryPromise = withTenant(tenantSlug, async () => {
    // Run GMV and MRR queries in parallel
    const [currentGMVResult, previousGMVResult, currentMRRResult, previousMRRResult] =
      await Promise.all([
        // Current 30-day GMV (total_cents is stored in cents)
        sql`
          SELECT COALESCE(SUM(total_cents), 0) as gmv
          FROM orders
          WHERE created_at > NOW() - INTERVAL '30 days'
            AND financial_status IN ('paid', 'partially_paid', 'partially_refunded')
        `,
        // Previous 30-day GMV (31-60 days ago)
        sql`
          SELECT COALESCE(SUM(total_cents), 0) as gmv
          FROM orders
          WHERE created_at > NOW() - INTERVAL '60 days'
            AND created_at <= NOW() - INTERVAL '30 days'
            AND financial_status IN ('paid', 'partially_paid', 'partially_refunded')
        `,
        // Current MRR from active subscriptions (price_cents * quantity, monthly basis)
        sql`
          SELECT COALESCE(SUM(
            CASE frequency
              WHEN 'weekly' THEN (price_cents - discount_cents) * quantity * 4.33
              WHEN 'biweekly' THEN (price_cents - discount_cents) * quantity * 2.17
              WHEN 'monthly' THEN (price_cents - discount_cents) * quantity
              WHEN 'bimonthly' THEN (price_cents - discount_cents) * quantity / 2
              WHEN 'quarterly' THEN (price_cents - discount_cents) * quantity / 3
              WHEN 'semiannually' THEN (price_cents - discount_cents) * quantity / 6
              WHEN 'annually' THEN (price_cents - discount_cents) * quantity / 12
              ELSE (price_cents - discount_cents) * quantity
            END
          ), 0)::integer as mrr
          FROM subscriptions
          WHERE status = 'active'
        `,
        // Previous month MRR (subscriptions that were active 30 days ago)
        // This is an approximation based on subscriptions created before 30 days ago
        sql`
          SELECT COALESCE(SUM(
            CASE frequency
              WHEN 'weekly' THEN (price_cents - discount_cents) * quantity * 4.33
              WHEN 'biweekly' THEN (price_cents - discount_cents) * quantity * 2.17
              WHEN 'monthly' THEN (price_cents - discount_cents) * quantity
              WHEN 'bimonthly' THEN (price_cents - discount_cents) * quantity / 2
              WHEN 'quarterly' THEN (price_cents - discount_cents) * quantity / 3
              WHEN 'semiannually' THEN (price_cents - discount_cents) * quantity / 6
              WHEN 'annually' THEN (price_cents - discount_cents) * quantity / 12
              ELSE (price_cents - discount_cents) * quantity
            END
          ), 0)::integer as mrr
          FROM subscriptions
          WHERE (status = 'active' AND created_at <= NOW() - INTERVAL '30 days')
             OR (status = 'cancelled' AND cancelled_at > NOW() - INTERVAL '30 days')
        `,
      ])

    return {
      currentGMV: Number(currentGMVResult.rows[0]?.gmv || 0),
      previousGMV: Number(previousGMVResult.rows[0]?.gmv || 0),
      currentMRR: Number(currentMRRResult.rows[0]?.mrr || 0),
      previousMRR: Number(previousMRRResult.rows[0]?.mrr || 0),
    }
  })

  // Race between query and timeout
  return Promise.race([queryPromise, timeoutPromise])
}

/**
 * Aggregate metrics across all tenants in batches for memory efficiency
 */
async function aggregateTenantMetrics(
  tenantSlugs: string[]
): Promise<{ totalGMV: number; previousGMV: number; currentMRR: number; previousMRR: number }> {
  let totalGMV = 0
  let previousGMV = 0
  let currentMRR = 0
  let previousMRR = 0

  // Process tenants in batches
  for (let i = 0; i < tenantSlugs.length; i += TENANT_BATCH_SIZE) {
    const batch = tenantSlugs.slice(i, i + TENANT_BATCH_SIZE)

    // Process batch in parallel
    const batchResults = await Promise.allSettled(batch.map((slug) => queryTenantMetrics(slug)))

    // Aggregate successful results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        totalGMV += result.value.currentGMV
        previousGMV += result.value.previousGMV
        currentMRR += result.value.currentMRR
        previousMRR += result.value.previousMRR
      }
      // Silently skip failed tenants (schema might not exist, table missing, etc.)
    }
  }

  return { totalGMV, previousGMV, currentMRR, previousMRR }
}
