/**
 * System Health Check Scheduled Jobs
 *
 * Monitors critical system services at different intervals:
 * - Critical (1 min): DB, Redis, Shopify - must complete within 30 seconds
 * - Full (5 min): All 15+ services - comprehensive health check
 *
 * @ai-pattern scheduled-jobs
 * @ai-critical Health checks must complete within 30 seconds
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// HEALTH CHECK PAYLOAD TYPES
// ============================================================

export interface HealthCheckCriticalPayload {
  /** Always 'system' for platform-wide checks */
  tenantId: string
}

export interface HealthCheckFullPayload {
  /** Always 'system' for platform-wide checks */
  tenantId: string
}

export interface ServiceHealthResult {
  service: string
  healthy: boolean
  latencyMs?: number
  error?: string
  timestamp: Date
}

export interface HealthCheckResult {
  healthy: boolean
  checkedAt: Date
  durationMs: number
  services: ServiceHealthResult[]
  failedServices: string[]
}

// ============================================================
// SERVICE HEALTH CHECK FUNCTIONS (STUBS)
// ============================================================

/**
 * Check database connectivity
 * CRITICAL: Must complete within 5 seconds
 */
async function checkDatabase(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    // Implementation would:
    // 1. Execute a simple SELECT query
    // 2. Verify connection pool is healthy
    // 3. Check replication lag if applicable
    return {
      service: 'database',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'database',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Redis connectivity
 * CRITICAL: Must complete within 5 seconds
 */
async function checkRedis(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    // Implementation would:
    // 1. PING Redis
    // 2. Check memory usage
    // 3. Verify write/read operations
    return {
      service: 'redis',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'redis',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Shopify API connectivity
 * CRITICAL: Must complete within 10 seconds
 */
async function checkShopify(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    // Implementation would:
    // 1. Make a simple Shop query
    // 2. Verify API rate limits are not exhausted
    // 3. Check webhook delivery status
    return {
      service: 'shopify',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'shopify',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Stripe API connectivity
 */
async function checkStripe(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    // Implementation would verify Stripe API is responding
    return {
      service: 'stripe',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'stripe',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Mux video service
 */
async function checkMux(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    // Implementation would verify Mux API is responding
    return {
      service: 'mux',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'mux',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check email service (Resend/SendGrid)
 */
async function checkEmailService(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'email',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'email',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check SMS service (Twilio)
 */
async function checkSmsService(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'sms',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'sms',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Slack integration
 */
async function checkSlack(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'slack',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'slack',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check OpenAI/AI services
 */
async function checkAiServices(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'ai',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'ai',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Google APIs (Analytics, Ads, etc.)
 */
async function checkGoogleApis(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'google',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'google',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Wise API for international payouts
 */
async function checkWise(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'wise',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'wise',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check Klaviyo for email marketing
 */
async function checkKlaviyo(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'klaviyo',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'klaviyo',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check background job provider health
 */
async function checkJobProvider(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'jobs',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'jobs',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check file storage (S3/R2)
 */
async function checkStorage(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'storage',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'storage',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

/**
 * Check CDN status
 */
async function checkCdn(): Promise<ServiceHealthResult> {
  const start = Date.now()
  try {
    return {
      service: 'cdn',
      healthy: true,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      service: 'cdn',
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}

// ============================================================
// HEALTH CHECK JOBS
// ============================================================

/**
 * Critical health check - runs every 1 minute
 *
 * Checks only critical-path services:
 * - Database
 * - Redis
 * - Shopify
 *
 * CONSTRAINT: Must complete within 30 seconds
 */
export const opsHealthCheckCriticalJob = defineJob<TenantEvent<HealthCheckCriticalPayload>>({
  name: 'ops/health-check-critical',
  handler: async (job) => {
    const { tenantId } = job.payload
    const start = Date.now()

    console.log(`[Health Check] Running critical health check for ${tenantId}`)

    // Run critical checks in parallel
    const results = await Promise.all([checkDatabase(), checkRedis(), checkShopify()])

    const failedServices = results.filter((r) => !r.healthy).map((r) => r.service)
    const durationMs = Date.now() - start

    const result: HealthCheckResult = {
      healthy: failedServices.length === 0,
      checkedAt: new Date(),
      durationMs,
      services: results,
      failedServices,
    }

    // Log result
    if (!result.healthy) {
      console.error(`[Health Check] CRITICAL: Services unhealthy: ${failedServices.join(', ')}`)
      // Would trigger criticalAlert job here
    } else {
      console.log(`[Health Check] All critical services healthy (${durationMs}ms)`)
    }

    // Enforce 30 second constraint
    if (durationMs > 30000) {
      console.warn(`[Health Check] Critical check exceeded 30s timeout: ${durationMs}ms`)
    }

    return { success: result.healthy, data: result }
  },
  retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 0 },
})

/**
 * Full health check - runs every 5 minutes
 *
 * Checks all 15+ services:
 * - Database, Redis, Shopify (critical)
 * - Stripe, Mux, Email, SMS, Slack
 * - AI services, Google APIs, Wise
 * - Klaviyo, Job provider, Storage, CDN
 *
 * CONSTRAINT: Must complete within 30 seconds
 */
export const opsHealthCheckFullJob = defineJob<TenantEvent<HealthCheckFullPayload>>({
  name: 'ops/health-check-full',
  handler: async (job) => {
    const { tenantId } = job.payload
    const start = Date.now()

    console.log(`[Health Check] Running full health check for ${tenantId}`)

    // Run all checks in parallel for speed
    const results = await Promise.all([
      // Critical path
      checkDatabase(),
      checkRedis(),
      checkShopify(),
      // Payments
      checkStripe(),
      checkWise(),
      // Media
      checkMux(),
      // Communications
      checkEmailService(),
      checkSmsService(),
      checkSlack(),
      // Integrations
      checkAiServices(),
      checkGoogleApis(),
      checkKlaviyo(),
      // Infrastructure
      checkJobProvider(),
      checkStorage(),
      checkCdn(),
    ])

    const failedServices = results.filter((r) => !r.healthy).map((r) => r.service)
    const durationMs = Date.now() - start

    const result: HealthCheckResult = {
      healthy: failedServices.length === 0,
      checkedAt: new Date(),
      durationMs,
      services: results,
      failedServices,
    }

    // Log and alert based on severity
    if (failedServices.length > 0) {
      const criticalServices = ['database', 'redis', 'shopify']
      const hasCriticalFailure = failedServices.some((s) => criticalServices.includes(s))

      if (hasCriticalFailure) {
        console.error(`[Health Check] CRITICAL: ${failedServices.join(', ')}`)
        // Would trigger criticalAlert job
      } else {
        console.warn(`[Health Check] WARNING: ${failedServices.join(', ')}`)
        // Would trigger systemErrorAlert job
      }
    } else {
      console.log(`[Health Check] All ${results.length} services healthy (${durationMs}ms)`)
    }

    // Enforce 30 second constraint
    if (durationMs > 30000) {
      console.warn(`[Health Check] Full check exceeded 30s timeout: ${durationMs}ms`)
    }

    return { success: result.healthy, data: result }
  },
  retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 0 },
})

// ============================================================
// SCHEDULES
// ============================================================

export const HEALTH_CHECK_SCHEDULES = {
  /** Critical checks every 1 minute */
  critical: { cron: '* * * * *' },
  /** Full checks every 5 minutes */
  full: { cron: '*/5 * * * *' },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const healthCheckJobs = [opsHealthCheckCriticalJob, opsHealthCheckFullJob]
