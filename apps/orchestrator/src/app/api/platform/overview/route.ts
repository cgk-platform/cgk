import { createGlobalCache, sql, withTenant } from '@cgk/db'

import type { PlatformKPIs } from '../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache TTL for KPIs (30 seconds)
const KPI_CACHE_TTL = 30

/**
 * GET /api/platform/overview
 *
 * Returns platform-wide KPIs aggregated across all tenants.
 * Data is cached for 30 seconds to avoid hammering the database.
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
 * Aggregate platform KPIs across all tenants
 */
async function aggregatePlatformKPIs(): Promise<PlatformKPIs> {
  // Get organization counts
  const orgsResult = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active
    FROM organizations
  `
  const totalBrands = Number(orgsResult.rows[0]?.total || 0)
  const activeBrands = Number(orgsResult.rows[0]?.active || 0)

  // Get open alerts by priority
  const alertsResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE action LIKE '%p1%' OR metadata->>'priority' = 'p1') as p1,
      COUNT(*) FILTER (WHERE action LIKE '%p2%' OR metadata->>'priority' = 'p2') as p2,
      COUNT(*) FILTER (WHERE action LIKE '%p3%' OR metadata->>'priority' = 'p3') as p3
    FROM super_admin_audit_log
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND action IN ('alert_created', 'error_logged')
  `
  const openAlerts = {
    p1: Number(alertsResult.rows[0]?.p1 || 0),
    p2: Number(alertsResult.rows[0]?.p2 || 0),
    p3: Number(alertsResult.rows[0]?.p3 || 0),
  }

  // Calculate system status based on alerts and other factors
  let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (openAlerts.p1 > 0) {
    systemStatus = 'critical'
  } else if (openAlerts.p2 > 2 || openAlerts.p3 > 10) {
    systemStatus = 'degraded'
  }

  // Get session/activity metrics for error rate proxy
  const activityResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE action = 'api_request') as total_requests,
      COUNT(*) FILTER (WHERE action = 'api_request' AND (metadata->>'error')::boolean = true) as error_requests
    FROM super_admin_audit_log
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `
  const totalRequests = Number(activityResult.rows[0]?.total_requests || 1)
  const errorRequests = Number(activityResult.rows[0]?.error_requests || 0)
  const errorRate24h = (errorRequests / totalRequests) * 100

  // Estimate other metrics (these would come from actual monitoring in production)
  // For now, return sensible defaults
  const kpis: PlatformKPIs = {
    totalGMV: { value: 0, change: 0 },
    platformMRR: { value: 0, change: 0 },
    totalBrands,
    activeBrands,
    systemStatus,
    openAlerts,
    errorRate24h: Number(errorRate24h.toFixed(2)),
    avgLatency: 150, // Placeholder - would come from APM
    uptimePercent: 99.95, // Placeholder - would come from monitoring
    pendingJobs: 0, // Placeholder - would come from job queue
    failedJobs24h: 0, // Placeholder - would come from job queue
  }

  // Try to get GMV and MRR from tenant schemas
  // This is a simplified approach - in production you'd aggregate across all tenant schemas
  const tenantSchemasResult = await sql`
    SELECT slug FROM organizations WHERE status = 'active' LIMIT 10
  `

  let totalGMV = 0
  let previousGMV = 0

  for (const row of tenantSchemasResult.rows) {
    const tenantSlug = row.slug as string
    try {
      // Try to get order totals from tenant schema using withTenant
      const metrics = await withTenant(tenantSlug, async () => {
        const orderResult = await sql`
          SELECT
            COALESCE(SUM(total_price), 0) as current_gmv
          FROM orders
          WHERE created_at > NOW() - INTERVAL '30 days'
        `
        const previousOrderResult = await sql`
          SELECT
            COALESCE(SUM(total_price), 0) as previous_gmv
          FROM orders
          WHERE created_at > NOW() - INTERVAL '60 days'
            AND created_at <= NOW() - INTERVAL '30 days'
        `
        return {
          current: Number(orderResult.rows[0]?.current_gmv || 0),
          previous: Number(previousOrderResult.rows[0]?.previous_gmv || 0),
        }
      })
      totalGMV += metrics.current
      previousGMV += metrics.previous
    } catch {
      // Schema might not exist or table might not be there yet
      continue
    }
  }

  // Calculate GMV change percentage
  const gmvChange = previousGMV > 0 ? ((totalGMV - previousGMV) / previousGMV) * 100 : 0

  kpis.totalGMV = { value: totalGMV, change: Number(gmvChange.toFixed(1)) }

  // MRR would be calculated from billing/subscriptions
  // For now, estimate based on active brands
  const estimatedMRR = activeBrands * 99 // $99/brand placeholder
  kpis.platformMRR = { value: estimatedMRR, change: 0 }

  return kpis
}
