/**
 * Master health endpoint
 *
 * GET /api/platform/health
 *
 * Returns aggregated health status for all services across all tenants.
 * Supports both legacy format (simple component status) and new format
 * (detailed per-tenant, per-service matrix).
 */

import { createGlobalCache, sql } from '@cgk-platform/db'
import {
  aggregateHealthStatus,
  ALL_MONITORS,
  countHealthStatuses,
  getCachedHealth,
  getOpenAlerts,
  runAllHealthChecks,
  type Alert,
  type HealthStatus,
  type PlatformHealthResponse,
  type ServiceHealthSummary,
  type TenantHealthSummary,
} from '@cgk-platform/health'

import type { SystemHealth } from '../../../../types/platform'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache TTL for health check (10 seconds)
const HEALTH_CACHE_TTL = 10

/**
 * Get all active tenants
 */
async function getActiveTenants(): Promise<Array<{ id: string; slug: string }>> {
  try {
    const result = await sql<{ id: string; slug: string }>`
      SELECT id, slug FROM public.organizations WHERE status = 'active'
    `
    return result.rows
  } catch {
    return []
  }
}

/**
 * Build tenant health summaries
 */
async function buildTenantSummaries(
  tenants: Array<{ id: string; slug: string }>
): Promise<TenantHealthSummary[]> {
  const summaries: TenantHealthSummary[] = []

  for (const tenant of tenants) {
    const serviceStatuses: HealthStatus[] = []
    const unhealthyServices: string[] = []
    let lastChecked = ''

    for (const monitor of ALL_MONITORS) {
      const tenantId = monitor.requiresTenant ? tenant.id : undefined
      const cached = await getCachedHealth(monitor.name, tenantId)

      if (cached) {
        serviceStatuses.push(cached.status)
        if (cached.status === 'unhealthy' || cached.status === 'degraded') {
          unhealthyServices.push(monitor.name)
        }
        if (!lastChecked || cached.cachedAt > lastChecked) {
          lastChecked = cached.cachedAt
        }
      }
    }

    summaries.push({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      status: aggregateHealthStatus(serviceStatuses),
      unhealthyServices,
      lastChecked: lastChecked || new Date().toISOString(),
    })
  }

  return summaries
}

/**
 * Build service health summaries
 */
async function buildServiceSummaries(
  tenants: Array<{ id: string; slug: string }>
): Promise<ServiceHealthSummary[]> {
  const summaries: ServiceHealthSummary[] = []

  for (const monitor of ALL_MONITORS) {
    const statuses: HealthStatus[] = []
    const latencies: number[] = []
    const failingTenants: string[] = []
    let lastChecked = ''

    if (monitor.requiresTenant) {
      for (const tenant of tenants) {
        const cached = await getCachedHealth(monitor.name, tenant.id)
        if (cached) {
          statuses.push(cached.status)
          latencies.push(cached.latencyMs)
          if (cached.status === 'unhealthy' || cached.status === 'degraded') {
            failingTenants.push(tenant.slug)
          }
          if (!lastChecked || cached.cachedAt > lastChecked) {
            lastChecked = cached.cachedAt
          }
        }
      }
    } else {
      const cached = await getCachedHealth(monitor.name)
      if (cached) {
        statuses.push(cached.status)
        latencies.push(cached.latencyMs)
        lastChecked = cached.cachedAt
      }
    }

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0

    summaries.push({
      service: monitor.name,
      status: aggregateHealthStatus(statuses),
      avgLatencyMs: avgLatency,
      failingTenants,
      lastChecked: lastChecked || new Date().toISOString(),
    })
  }

  return summaries
}

/**
 * Convert new health status to legacy format
 */
function toLegacyStatus(
  status: HealthStatus
): 'healthy' | 'degraded' | 'critical' {
  switch (status) {
    case 'healthy':
      return 'healthy'
    case 'degraded':
      return 'degraded'
    case 'unhealthy':
      return 'critical'
    case 'unknown':
      return 'degraded'
  }
}

/**
 * GET /api/platform/health
 */
export async function GET(request: Request): Promise<Response> {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'legacy'
  const refresh = searchParams.get('refresh') === 'true'

  try {
    // If refresh requested, run all health checks
    if (refresh) {
      await runAllHealthChecks()
    }

    // New format: full platform health response
    if (format === 'full') {
      const tenants = await getActiveTenants()
      const [tenantSummaries, serviceSummaries, openAlerts] = await Promise.all([
        buildTenantSummaries(tenants),
        buildServiceSummaries(tenants),
        getOpenAlerts({ limit: 20 }),
      ])

      const allStatuses = [
        ...tenantSummaries.map((t: TenantHealthSummary) => t.status),
        ...serviceSummaries.map((s: ServiceHealthSummary) => s.status),
      ]
      const counts = countHealthStatuses(allStatuses)
      const overallStatus = aggregateHealthStatus(allStatuses)

      const response: PlatformHealthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        summary: counts,
        tenants: tenantSummaries,
        services: serviceSummaries,
        alerts: openAlerts as Alert[],
      }

      return Response.json({
        ...response,
        responseTimeMs: Date.now() - startTime,
      })
    }

    // Legacy format: simple component status
    const cache = createGlobalCache()
    const cachedHealth = await cache.get<SystemHealth>('platform-health')

    if (cachedHealth && !refresh) {
      return Response.json({
        ...cachedHealth,
        cached: true,
        responseTimeMs: Date.now() - startTime,
      })
    }

    // Get status from new health monitors
    const [dbCached, redisCached, stripeCached, inngestCached] =
      await Promise.all([
        getCachedHealth('database'),
        getCachedHealth('redis'),
        getCachedHealth('stripe'),
        getCachedHealth('inngest'),
      ])

    const components = {
      database: dbCached
        ? toLegacyStatus(dbCached.status)
        : ('degraded' as const),
      cache: redisCached
        ? toLegacyStatus(redisCached.status)
        : ('degraded' as const),
      shopify: 'healthy' as const, // Shopify is per-tenant, default healthy
      stripe: stripeCached
        ? toLegacyStatus(stripeCached.status)
        : ('healthy' as const),
      jobs: inngestCached
        ? toLegacyStatus(inngestCached.status)
        : ('healthy' as const),
    }

    const componentStatuses = Object.values(components)
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'

    if (componentStatuses.includes('critical')) {
      overallStatus = 'critical'
    } else if (componentStatuses.includes('degraded')) {
      overallStatus = 'degraded'
    }

    if (components.database === 'critical') {
      overallStatus = 'critical'
    }

    const health: SystemHealth = {
      status: overallStatus,
      components,
      checkedAt: new Date(),
    }

    await cache.set('platform-health', health, { ttl: HEALTH_CACHE_TTL })

    return Response.json({
      ...health,
      cached: false,
      responseTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return Response.json(
      {
        status: 'critical',
        error: 'Health check failed',
        responseTimeMs: Date.now() - startTime,
      },
      { status: 503 }
    )
  }
}
