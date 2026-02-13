/**
 * System Health Check Scheduled Tasks
 *
 * Trigger.dev task definitions for health monitoring:
 * - Critical checks (every 1 minute): DB, Redis, Shopify
 * - Full checks (every 5 minutes): All 15+ services
 *
 * @ai-pattern trigger-tasks
 * @ai-critical Health checks must complete within 30 seconds
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type { HealthCheckCriticalPayload, HealthCheckFullPayload } from '../../handlers/scheduled/health-checks'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const HEALTH_CHECK_RETRY = {
  maxAttempts: 1,
  factor: 1,
  minTimeoutInMs: 0,
  maxTimeoutInMs: 0,
}

// ============================================================
// CRITICAL HEALTH CHECK TASK
// ============================================================

/**
 * Critical health check
 *
 * Task ID: ops-health-check-critical
 */
export const opsHealthCheckCriticalTask = task({
  id: 'ops-health-check-critical',
  retry: HEALTH_CHECK_RETRY,
  maxDuration: 30,
  run: async (payload: TenantEvent<HealthCheckCriticalPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running critical health check', { tenantId })

    const { opsHealthCheckCriticalJob } = await import('../../handlers/scheduled/health-checks.js')

    const result = await opsHealthCheckCriticalJob.handler(
      createJobFromPayload('health', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Critical health check failed')
    }

    return result.data
  },
})

// ============================================================
// FULL HEALTH CHECK TASK
// ============================================================

/**
 * Full health check
 *
 * Task ID: ops-health-check-full
 */
export const opsHealthCheckFullTask = task({
  id: 'ops-health-check-full',
  retry: HEALTH_CHECK_RETRY,
  maxDuration: 30,
  run: async (payload: TenantEvent<HealthCheckFullPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running full health check', { tenantId })

    const { opsHealthCheckFullJob } = await import('../../handlers/scheduled/health-checks.js')

    const result = await opsHealthCheckFullJob.handler(
      createJobFromPayload('health', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Full health check failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

/**
 * Scheduled critical health check - runs every 1 minute
 *
 * Task ID: ops-health-check-critical-scheduled
 */
export const opsHealthCheckCriticalScheduledTask = schedules.task({
  id: 'ops-health-check-critical-scheduled',
  cron: '* * * * *',
  run: async () => {
    logger.info('Running scheduled critical health check')

    const result = await opsHealthCheckCriticalTask.triggerAndWait({
      tenantId: 'system',
    })

    if (!result.ok) {
      logger.error('Critical health check failed', { error: result.error })
      // Would trigger critical alert here
    }

    return {
      healthy: result.ok,
      checkedAt: new Date().toISOString(),
    }
  },
})

/**
 * Scheduled full health check - runs every 5 minutes
 *
 * Task ID: ops-health-check-full-scheduled
 */
export const opsHealthCheckFullScheduledTask = schedules.task({
  id: 'ops-health-check-full-scheduled',
  cron: '*/5 * * * *',
  run: async () => {
    logger.info('Running scheduled full health check')

    const result = await opsHealthCheckFullTask.triggerAndWait({
      tenantId: 'system',
    })

    if (!result.ok) {
      logger.error('Full health check failed', { error: result.error })
      // Would trigger system error alert here
    }

    return {
      healthy: result.ok,
      checkedAt: new Date().toISOString(),
    }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const healthCheckTasks = [
  opsHealthCheckCriticalTask,
  opsHealthCheckFullTask,
  opsHealthCheckCriticalScheduledTask,
  opsHealthCheckFullScheduledTask,
]
