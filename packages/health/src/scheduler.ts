/**
 * Health check scheduler
 *
 * Implements tiered scheduling with configurable intervals.
 */

import { sql } from '@cgk/db'

import { createAndDispatchAlert } from './alerts/dispatch.js'
import {
  getLastRunTime,
  setLastRunTime,
  cacheHealthResult,
  getConsecutiveFailures,
  setConsecutiveFailures,
} from './cache.js'
import { thresholdResultToSeverity } from './evaluator.js'
import {
  getMonitor,
  getMonitorsByTier,
  getPlatformMonitors,
  getTenantMonitors,
  TIER_CONFIG,
} from './monitors/index.js'
import type {
  HealthCheckResult,
  ServiceTier,
  TenantHealthReport,
} from './types.js'

/**
 * Get all active tenant IDs from the database
 */
async function getActiveTenantIds(): Promise<string[]> {
  try {
    const result = await sql<{ id: string }>`
      SELECT id FROM public.organizations WHERE status = 'active'
    `
    return result.rows.map((r) => r.id)
  } catch {
    return []
  }
}

/**
 * Store health check result in history table
 */
async function storeHealthResult(
  service: string,
  tenantId: string | undefined,
  result: HealthCheckResult
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.health_check_history (
        service, tenant_id, status, latency_ms, details, checked_at
      )
      VALUES (
        ${service},
        ${tenantId || null},
        ${result.status},
        ${result.latencyMs},
        ${JSON.stringify(result.details)},
        NOW()
      )
    `
  } catch (error) {
    console.error('Failed to store health result:', error)
  }
}

/**
 * Run a single health check with failure tracking and alerting
 */
async function runHealthCheck(
  service: string,
  tier: ServiceTier,
  tenantId?: string
): Promise<HealthCheckResult> {
  const monitor = getMonitor(service)
  if (!monitor) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: { error: `Unknown service: ${service}` },
    }
  }

  const result = await monitor.check(tenantId)

  // Track consecutive failures
  const prevFailures = await getConsecutiveFailures(service, tenantId)
  const newFailures = result.status === 'unhealthy' ? prevFailures + 1 : 0
  await setConsecutiveFailures(service, tenantId, newFailures)

  // Cache the result
  await cacheHealthResult(service, tenantId, tier, result)

  // Store in history
  await storeHealthResult(service, tenantId, result)

  // Alert on consecutive failures or status changes
  if (newFailures >= 3 && prevFailures < 3) {
    // Trigger alert after 3 consecutive failures
    const severity = thresholdResultToSeverity(
      result.status === 'unhealthy' ? 'critical' : 'warning'
    )

    if (severity) {
      await createAndDispatchAlert({
        severity,
        source: 'health_check',
        service,
        tenantId,
        title: `${service} health check failing`,
        message: `${service} has failed ${newFailures} consecutive health checks. Last error: ${result.error || 'Unknown'}`,
        metadata: {
          consecutiveFailures: newFailures,
          lastResult: result,
        },
      })
    }
  }

  return result
}

/**
 * Run health checks for a specific tier
 */
export async function runTierHealthChecks(
  tier: ServiceTier
): Promise<Map<string, HealthCheckResult>> {
  const monitors = getMonitorsByTier(tier)
  const results = new Map<string, HealthCheckResult>()

  // Run platform monitors
  const platformMonitors = monitors.filter((m) => !m.requiresTenant)
  await Promise.all(
    platformMonitors.map(async (monitor) => {
      const result = await runHealthCheck(monitor.name, tier)
      results.set(monitor.name, result)
    })
  )

  // Run tenant-specific monitors for all active tenants
  const tenantMonitors = monitors.filter((m) => m.requiresTenant)
  if (tenantMonitors.length > 0) {
    const tenantIds = await getActiveTenantIds()

    await Promise.all(
      tenantMonitors.flatMap((monitor) =>
        tenantIds.map(async (tenantId) => {
          const result = await runHealthCheck(monitor.name, tier, tenantId)
          results.set(`${monitor.name}:${tenantId}`, result)
        })
      )
    )
  }

  return results
}

/**
 * Run all health checks for a specific tenant
 */
export async function runTenantHealthChecks(
  tenantId: string
): Promise<TenantHealthReport> {
  const tenantMonitors = getTenantMonitors()
  const platformMonitors = getPlatformMonitors()

  const report: TenantHealthReport = {
    tenantId,
    timestamp: new Date().toISOString(),
    overallStatus: 'healthy',
    services: {},
  }

  // Run tenant-specific monitors
  await Promise.all(
    tenantMonitors.map(async (monitor) => {
      const result = await runHealthCheck(monitor.name, monitor.tier, tenantId)
      report.services[monitor.name] = result

      if (result.status === 'unhealthy') {
        report.overallStatus = 'unhealthy'
      } else if (result.status === 'degraded' && report.overallStatus === 'healthy') {
        report.overallStatus = 'degraded'
      }
    })
  )

  // Include platform monitor results (they apply to all tenants)
  await Promise.all(
    platformMonitors.map(async (monitor) => {
      const result = await runHealthCheck(monitor.name, monitor.tier)
      report.services[monitor.name] = result

      if (result.status === 'unhealthy') {
        report.overallStatus = 'unhealthy'
      } else if (result.status === 'degraded' && report.overallStatus === 'healthy') {
        report.overallStatus = 'degraded'
      }
    })
  )

  return report
}

/**
 * Determine which tiers should run based on time elapsed
 */
export async function getTiersToRun(): Promise<ServiceTier[]> {
  const now = Date.now()
  const tiersToRun: ServiceTier[] = []

  for (const [tier, config] of Object.entries(TIER_CONFIG) as [ServiceTier, typeof TIER_CONFIG[ServiceTier]][]) {
    const firstService = config.services[0]
    if (!firstService) continue

    const lastRun = await getLastRunTime(firstService)
    if (now - lastRun >= config.interval) {
      tiersToRun.push(tier)
    }
  }

  return tiersToRun
}

/**
 * Run scheduled health checks
 *
 * This function should be called periodically (e.g., every minute).
 * It determines which tiers are due to run based on their intervals.
 */
export async function runScheduledHealthChecks(): Promise<{
  ran: ServiceTier[]
  results: Map<string, HealthCheckResult>
}> {
  const tiersToRun = await getTiersToRun()
  const allResults = new Map<string, HealthCheckResult>()

  for (const tier of tiersToRun) {
    const tierResults = await runTierHealthChecks(tier)

    // Merge results
    for (const [key, value] of tierResults) {
      allResults.set(key, value)
    }

    // Update last run time for services in this tier
    const config = TIER_CONFIG[tier]
    for (const service of config.services) {
      await setLastRunTime(service, Date.now())
    }
  }

  return { ran: tiersToRun, results: allResults }
}

/**
 * Force run all health checks (ignores schedule)
 */
export async function runAllHealthChecks(): Promise<Map<string, HealthCheckResult>> {
  const allResults = new Map<string, HealthCheckResult>()

  for (const tier of ['critical', 'core', 'integrations', 'external'] as ServiceTier[]) {
    const tierResults = await runTierHealthChecks(tier)
    for (const [key, value] of tierResults) {
      allResults.set(key, value)
    }
  }

  return allResults
}
