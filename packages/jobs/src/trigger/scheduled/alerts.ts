/**
 * Alert Scheduled Tasks
 *
 * Trigger.dev task definitions for alerts:
 * - Critical alerts
 * - System error alerts
 * - High value submission alerts
 * - Creator complaint alerts
 * - Security alerts
 * - API failure alerts
 * - Unusual activity alerts
 * - Milestone alerts
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  CriticalAlertPayload,
  SystemErrorAlertPayload,
  HighValueSubmissionAlertPayload,
  CreatorComplaintAlertPayload,
  SecurityAlertPayload,
  ApiFailureAlertPayload,
  UnusualActivityAlertPayload,
  MilestoneAlertPayload,
} from '../../handlers/scheduled/alerts'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const ALERT_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1000,
  maxTimeoutInMs: 30000,
}

const CRITICAL_ALERT_RETRY = {
  maxAttempts: 5,
  factor: 1.5,
  minTimeoutInMs: 500,
  maxTimeoutInMs: 10000,
}

// ============================================================
// CRITICAL ALERT TASK
// ============================================================

export const criticalAlertTask = task({
  id: 'alert-critical',
  retry: CRITICAL_ALERT_RETRY,
  run: async (payload: TenantEvent<CriticalAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending critical alert', { tenantId, payload })

    const { criticalAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await criticalAlertJob.handler(
      createJobFromPayload('critical', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Critical alert failed')
    }

    return result.data
  },
})

// ============================================================
// SYSTEM ERROR ALERT TASK
// ============================================================

export const systemErrorAlertTask = task({
  id: 'alert-system-error',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<SystemErrorAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending system error alert', { tenantId })

    const { systemErrorAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await systemErrorAlertJob.handler(
      createJobFromPayload('system', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'System error alert failed')
    }

    return result.data
  },
})

// ============================================================
// HIGH VALUE SUBMISSION ALERT TASK
// ============================================================

export const highValueSubmissionAlertTask = task({
  id: 'alert-high-value-submission',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<HighValueSubmissionAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending high value submission alert', { tenantId })

    const { highValueSubmissionAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await highValueSubmissionAlertJob.handler(
      createJobFromPayload('high', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'High value submission alert failed')
    }

    return result.data
  },
})

// ============================================================
// CREATOR COMPLAINT ALERT TASK
// ============================================================

export const creatorComplaintAlertTask = task({
  id: 'alert-creator-complaint',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<CreatorComplaintAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending creator complaint alert', { tenantId })

    const { creatorComplaintAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await creatorComplaintAlertJob.handler(
      createJobFromPayload('creator', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Creator complaint alert failed')
    }

    return result.data
  },
})

// ============================================================
// SECURITY ALERT TASK
// ============================================================

export const securityAlertTask = task({
  id: 'alert-security',
  retry: CRITICAL_ALERT_RETRY,
  run: async (payload: TenantEvent<SecurityAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending security alert', { tenantId })

    const { securityAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await securityAlertJob.handler(
      createJobFromPayload('security', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Security alert failed')
    }

    return result.data
  },
})

// ============================================================
// API FAILURE ALERT TASK
// ============================================================

export const apiFailureAlertTask = task({
  id: 'alert-api-failure',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<ApiFailureAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending API failure alert', { tenantId })

    const { apiFailureAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await apiFailureAlertJob.handler(
      createJobFromPayload('api', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'API failure alert failed')
    }

    return result.data
  },
})

// ============================================================
// UNUSUAL ACTIVITY ALERT TASK
// ============================================================

export const unusualActivityAlertTask = task({
  id: 'alert-unusual-activity',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<UnusualActivityAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending unusual activity alert', { tenantId })

    const { unusualActivityAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await unusualActivityAlertJob.handler(
      createJobFromPayload('unusual', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Unusual activity alert failed')
    }

    return result.data
  },
})

// ============================================================
// MILESTONE ALERT TASK
// ============================================================

export const milestoneAlertTask = task({
  id: 'alert-milestone',
  retry: ALERT_RETRY,
  run: async (payload: TenantEvent<MilestoneAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending milestone alert', { tenantId })

    const { milestoneAlertJob } = await import('../../handlers/scheduled/alerts.js')

    const result = await milestoneAlertJob.handler(
      createJobFromPayload('milestone', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Milestone alert failed')
    }

    return result.data
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const alertTasks = [
  criticalAlertTask,
  systemErrorAlertTask,
  highValueSubmissionAlertTask,
  creatorComplaintAlertTask,
  securityAlertTask,
  apiFailureAlertTask,
  unusualActivityAlertTask,
  milestoneAlertTask,
]
