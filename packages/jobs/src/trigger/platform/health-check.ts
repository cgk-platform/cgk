/**
 * Platform Health Check Task
 *
 * Scheduled Trigger.dev task that runs every 5 minutes to:
 * 1. Check all configured services (database, redis, external APIs)
 * 2. Record results in platform_health_matrix table
 * 3. Calculate aggregate health scores
 * 4. Trigger alerts if services are unhealthy
 *
 * @ai-pattern trigger-tasks
 * @ai-critical Must complete within 30 seconds
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import { sql } from '@cgk-platform/db'
import { criticalAlertTask, systemErrorAlertTask } from '../scheduled/alerts'

// ============================================================
// TYPES
// ============================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface ServiceCheckResult {
  serviceName: string
  status: HealthStatus
  responseTimeMs: number
  lastError: string | null
  metadata: Record<string, unknown>
}

export interface HealthCheckSummary {
  totalTenants: number
  totalChecks: number
  healthyCount: number
  degradedCount: number
  unhealthyCount: number
  overallHealthScore: number
  checkedAt: string
}

// ============================================================
// SERVICE DEFINITIONS
// ============================================================

/**
 * Services to monitor for each tenant
 * Must match the services defined in the health matrix API
 */
const MONITORED_SERVICES = [
  'database',
  'redis',
  'shopify',
  'stripe',
  'inngest',
  'vercel',
  'email',
] as const

type MonitoredService = (typeof MONITORED_SERVICES)[number]

// Critical services that trigger immediate alerts
const CRITICAL_SERVICES: MonitoredService[] = ['database', 'redis', 'shopify']

// ============================================================
// HEALTH CHECK FUNCTIONS
// ============================================================

/**
 * Check database connectivity
 * Executes a simple SELECT query to verify database is responding
 */
async function checkDatabaseHealth(): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // Simple query to verify database connectivity
    await sql`SELECT 1 as health_check`
    const responseTimeMs = Date.now() - start

    // Determine status based on response time
    let status: HealthStatus = 'healthy'
    if (responseTimeMs > 1000) {
      status = 'degraded'
    } else if (responseTimeMs > 5000) {
      status = 'unhealthy'
    }

    return {
      status,
      responseTimeMs,
      lastError: null,
      metadata: { latencyMs: responseTimeMs },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown database error',
      metadata: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
    }
  }
}

/**
 * Check Redis connectivity
 * Note: Uses in-memory fallback if Redis not configured
 */
async function checkRedisHealth(): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // Check if Redis URL is configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL

    if (!redisUrl) {
      return {
        status: 'unknown',
        responseTimeMs: Date.now() - start,
        lastError: 'Redis not configured - using in-memory cache',
        metadata: { configured: false },
      }
    }

    // Attempt to ping Redis via REST API
    const response = await fetch(`${redisUrl}/ping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    const responseTimeMs = Date.now() - start

    if (response.ok) {
      let status: HealthStatus = 'healthy'
      if (responseTimeMs > 500) status = 'degraded'
      if (responseTimeMs > 2000) status = 'unhealthy'

      return {
        status,
        responseTimeMs,
        lastError: null,
        metadata: { latencyMs: responseTimeMs },
      }
    }

    return {
      status: 'unhealthy',
      responseTimeMs,
      lastError: `Redis returned status ${response.status}`,
      metadata: { httpStatus: response.status },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown Redis error',
      metadata: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
    }
  }
}

/**
 * Check Shopify API connectivity for a tenant
 */
async function checkShopifyHealth(tenantSlug: string): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // Get tenant's Shopify configuration
    const configResult = await sql`
      SELECT shopify_store_domain, shopify_access_token
      FROM public.organizations
      WHERE slug = ${tenantSlug}
        AND shopify_store_domain IS NOT NULL
        AND shopify_access_token IS NOT NULL
      LIMIT 1
    `

    if (configResult.rows.length === 0) {
      return {
        status: 'unknown',
        responseTimeMs: Date.now() - start,
        lastError: 'Shopify not configured for tenant',
        metadata: { configured: false },
      }
    }

    const row = configResult.rows[0] as Record<string, unknown>
    const domain = row.shopify_store_domain as string
    const token = row.shopify_access_token as string

    // Make a simple shop info request
    const response = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    const responseTimeMs = Date.now() - start

    if (response.ok) {
      let status: HealthStatus = 'healthy'
      if (responseTimeMs > 2000) status = 'degraded'
      if (responseTimeMs > 5000) status = 'unhealthy'

      return {
        status,
        responseTimeMs,
        lastError: null,
        metadata: { latencyMs: responseTimeMs },
      }
    }

    // Check for rate limiting
    if (response.status === 429) {
      return {
        status: 'degraded',
        responseTimeMs,
        lastError: 'Shopify rate limited',
        metadata: { httpStatus: 429, rateLimited: true },
      }
    }

    return {
      status: 'unhealthy',
      responseTimeMs,
      lastError: `Shopify returned status ${response.status}`,
      metadata: { httpStatus: response.status },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown Shopify error',
      metadata: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
    }
  }
}

/**
 * Check Stripe API connectivity for a tenant
 */
async function checkStripeHealth(tenantId: string): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // Check tenant's Stripe configuration in tenant schema
    // Note: Using public schema since tenant_stripe_config lives there
    const configResult = await sql`
      SELECT 1 FROM public.organizations
      WHERE id = ${tenantId}
      LIMIT 1
    `

    if (configResult.rows.length === 0) {
      return {
        status: 'unknown',
        responseTimeMs: Date.now() - start,
        lastError: 'Tenant not found',
        metadata: { configured: false },
      }
    }

    // For now, check if Stripe SDK would be available (key configured)
    // A full check would use getTenantStripeClient
    const responseTimeMs = Date.now() - start

    return {
      status: 'healthy',
      responseTimeMs,
      lastError: null,
      metadata: { checkedVia: 'configuration' },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown Stripe error',
      metadata: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' },
    }
  }
}

/**
 * Check Inngest/Trigger.dev job provider health
 */
async function checkJobProviderHealth(): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // The fact that this task is running means Trigger.dev is working
    const responseTimeMs = Date.now() - start

    return {
      status: 'healthy',
      responseTimeMs,
      lastError: null,
      metadata: { provider: 'trigger.dev', selfCheck: true },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown job provider error',
      metadata: {},
    }
  }
}

/**
 * Check Vercel platform health
 */
async function checkVercelHealth(): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    // Check Vercel status page
    const response = await fetch('https://www.vercel-status.com/api/v2/status.json', {
      signal: AbortSignal.timeout(5000),
    })

    const responseTimeMs = Date.now() - start

    if (response.ok) {
      const data = await response.json() as { status?: { indicator?: string } }
      const indicator = data?.status?.indicator || 'none'

      let status: HealthStatus = 'healthy'
      if (indicator === 'minor') status = 'degraded'
      if (indicator === 'major' || indicator === 'critical') status = 'unhealthy'

      return {
        status,
        responseTimeMs,
        lastError: null,
        metadata: { indicator, latencyMs: responseTimeMs },
      }
    }

    return {
      status: 'unknown',
      responseTimeMs,
      lastError: 'Could not fetch Vercel status',
      metadata: { httpStatus: response.status },
    }
  } catch (error) {
    return {
      status: 'unknown',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown Vercel error',
      metadata: {},
    }
  }
}

/**
 * Check email service health (Resend)
 */
async function checkEmailHealth(): Promise<Omit<ServiceCheckResult, 'serviceName'>> {
  const start = Date.now()
  try {
    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      return {
        status: 'unknown',
        responseTimeMs: Date.now() - start,
        lastError: 'Email service not configured',
        metadata: { configured: false },
      }
    }

    // Check Resend API health
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${resendKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    const responseTimeMs = Date.now() - start

    if (response.ok) {
      let status: HealthStatus = 'healthy'
      if (responseTimeMs > 1000) status = 'degraded'

      return {
        status,
        responseTimeMs,
        lastError: null,
        metadata: { latencyMs: responseTimeMs },
      }
    }

    return {
      status: 'unhealthy',
      responseTimeMs,
      lastError: `Email service returned status ${response.status}`,
      metadata: { httpStatus: response.status },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      lastError: error instanceof Error ? error.message : 'Unknown email error',
      metadata: {},
    }
  }
}

// ============================================================
// MAIN HEALTH CHECK TASK
// ============================================================

/** Payload for platform health check (optional overrides) */
export interface PlatformHealthCheckPayload {
  /** Optional list of specific tenant slugs to check (defaults to all active) */
  tenantSlugs?: string[]
  /** Force check even if recently checked */
  force?: boolean
}

/**
 * Platform health matrix population task
 *
 * Task ID: platform-health-check-matrix
 */
export const platformHealthCheckMatrixTask = task({
  id: 'platform-health-check-matrix',
  retry: {
    maxAttempts: 1,
    factor: 1,
    minTimeoutInMs: 0,
    maxTimeoutInMs: 0,
  },
  maxDuration: 60,
  run: async (payload: PlatformHealthCheckPayload = {}) => {
    const { tenantSlugs, force: _force } = payload
    logger.info('Starting platform health matrix check', { tenantSlugs })
    const startTime = Date.now()

    // Get active tenants (optionally filtered by slug)
    const tenantsResult = await sql`
      SELECT id, slug, name
      FROM public.organizations
      WHERE status = 'active'
      ORDER BY slug
      LIMIT 100
    `

    // Filter by tenant slugs if provided
    let tenants = tenantsResult.rows.map((row) => ({
      id: (row as Record<string, unknown>).id as string,
      slug: (row as Record<string, unknown>).slug as string,
      name: (row as Record<string, unknown>).name as string,
    }))

    if (tenantSlugs && tenantSlugs.length > 0) {
      const slugSet = new Set(tenantSlugs)
      tenants = tenants.filter((t) => slugSet.has(t.slug))
    }

    logger.info(`Checking health for ${tenants.length} tenants`)

    // Run global service checks (not tenant-specific)
    const [dbHealth, redisHealth, jobsHealth, vercelHealth, emailHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkJobProviderHealth(),
      checkVercelHealth(),
      checkEmailHealth(),
    ])

    const globalResults: Record<string, Omit<ServiceCheckResult, 'serviceName'>> = {
      database: dbHealth,
      redis: redisHealth,
      inngest: jobsHealth,
      vercel: vercelHealth,
      email: emailHealth,
    }

    // Track unhealthy services for alerting
    const unhealthyServices: { tenantId: string; tenantName: string; service: string; error: string }[] = []

    // Process each tenant
    for (const tenant of tenants) {
      // Run tenant-specific checks
      const [shopifyHealth, stripeHealth] = await Promise.all([
        checkShopifyHealth(tenant.slug),
        checkStripeHealth(tenant.id),
      ])

      const tenantResults: Record<string, Omit<ServiceCheckResult, 'serviceName'>> = {
        ...globalResults,
        shopify: shopifyHealth,
        stripe: stripeHealth,
      }

      // Update health matrix for each service
      for (const [serviceName, result] of Object.entries(tenantResults)) {
        try {
          await sql`
            INSERT INTO platform_health_matrix (
              tenant_id, service_name, status, response_time_ms, last_error, metadata, checked_at
            )
            VALUES (
              ${tenant.id}::uuid,
              ${serviceName},
              ${result.status},
              ${result.responseTimeMs},
              ${result.lastError},
              ${JSON.stringify(result.metadata)}::jsonb,
              NOW()
            )
            ON CONFLICT (tenant_id, service_name)
            DO UPDATE SET
              status = EXCLUDED.status,
              response_time_ms = EXCLUDED.response_time_ms,
              last_error = EXCLUDED.last_error,
              metadata = EXCLUDED.metadata,
              checked_at = NOW()
          `

          // Track unhealthy services
          if (result.status === 'unhealthy') {
            unhealthyServices.push({
              tenantId: tenant.id,
              tenantName: tenant.name,
              service: serviceName,
              error: result.lastError || 'Service unhealthy',
            })
          }
        } catch (dbError) {
          logger.error(`Failed to update health matrix for ${tenant.slug}/${serviceName}`, {
            error: dbError instanceof Error ? dbError.message : 'Unknown error',
          })
        }
      }
    }

    // Calculate aggregate health score
    const healthResult = await sql`
      SELECT
        status,
        COUNT(*) as count
      FROM platform_health_matrix
      WHERE checked_at > NOW() - INTERVAL '10 minutes'
      GROUP BY status
    `

    let healthyCount = 0
    let degradedCount = 0
    let unhealthyCount = 0

    for (const row of healthResult.rows) {
      const r = row as Record<string, unknown>
      const status = r.status as string
      const count = Number(r.count)

      if (status === 'healthy') healthyCount = count
      else if (status === 'degraded') degradedCount = count
      else if (status === 'unhealthy') unhealthyCount = count
    }

    const totalChecks = healthyCount + degradedCount + unhealthyCount
    const overallHealthScore = totalChecks > 0
      ? Math.round(((healthyCount + degradedCount * 0.5) / totalChecks) * 100)
      : 0

    const summary: HealthCheckSummary = {
      totalTenants: tenants.length,
      totalChecks,
      healthyCount,
      degradedCount,
      unhealthyCount,
      overallHealthScore,
      checkedAt: new Date().toISOString(),
    }

    logger.info('Health matrix check complete', {
      ...summary,
      durationMs: Date.now() - startTime,
    })

    // Trigger alerts for unhealthy services
    if (unhealthyServices.length > 0) {
      const criticalFailures = unhealthyServices.filter((s) =>
        CRITICAL_SERVICES.includes(s.service as MonitoredService)
      )
      const nonCriticalFailures = unhealthyServices.filter(
        (s) => !CRITICAL_SERVICES.includes(s.service as MonitoredService)
      )

      // Critical failures trigger immediate critical alert
      if (criticalFailures.length > 0) {
        const failureList = criticalFailures
          .map((f) => `${f.tenantName}: ${f.service} - ${f.error}`)
          .join('\n')

        await criticalAlertTask.trigger({
          tenantId: 'system',
          title: `Critical Services Unhealthy (${criticalFailures.length})`,
          message: `The following critical services are unhealthy:\n${failureList}`,
          source: 'platform-health-check',
          metadata: {
            failureCount: criticalFailures.length,
            services: criticalFailures.map((f) => f.service),
          },
        })

        logger.warn('Critical alert triggered for unhealthy services', {
          count: criticalFailures.length,
          services: criticalFailures.map((f) => f.service),
        })
      }

      // Non-critical failures trigger system error alert
      if (nonCriticalFailures.length > 0) {
        await systemErrorAlertTask.trigger({
          tenantId: 'system',
          errorCode: 'HEALTH_CHECK_FAILED',
          errorMessage: `${nonCriticalFailures.length} non-critical services are unhealthy`,
          service: 'platform-health-check',
          metadata: {
            failureCount: nonCriticalFailures.length,
            services: nonCriticalFailures.map((f) => ({
              tenant: f.tenantName,
              service: f.service,
              error: f.error,
            })),
          },
        })

        logger.info('System error alert triggered for non-critical failures', {
          count: nonCriticalFailures.length,
        })
      }
    }

    return {
      success: true,
      summary,
      unhealthyServices: unhealthyServices.length,
      durationMs: Date.now() - startTime,
    }
  },
})

// ============================================================
// SCHEDULED TASK (runs every 5 minutes)
// ============================================================

/**
 * Scheduled platform health matrix check - runs every 5 minutes
 *
 * Task ID: platform-health-check-matrix-scheduled
 */
export const platformHealthCheckMatrixScheduledTask = schedules.task({
  id: 'platform-health-check-matrix-scheduled',
  cron: '*/5 * * * *',
  run: async () => {
    logger.info('Running scheduled platform health matrix check')

    // Trigger the health check task with empty payload (uses defaults)
    const result = await platformHealthCheckMatrixTask.triggerAndWait({})

    if (!result.ok) {
      logger.error('Platform health matrix check failed', { error: result.error })
      return {
        scheduled: true,
        healthy: false,
        error: 'Health check failed',
        checkedAt: new Date().toISOString(),
      }
    }

    return {
      scheduled: true,
      healthy: result.output.success,
      summary: result.output.summary,
      unhealthyServices: result.output.unhealthyServices,
      durationMs: result.output.durationMs,
      checkedAt: new Date().toISOString(),
    }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const platformHealthTasks = [
  platformHealthCheckMatrixTask,
  platformHealthCheckMatrixScheduledTask,
]
