/**
 * Subscription Scheduled Tasks
 *
 * Trigger.dev task definitions for subscription billing:
 * - Daily billing processing
 * - Batch billing
 * - Retry failed payments
 * - Catchup billing
 * - Shadow validation
 * - Analytics snapshot
 * - Upcoming reminders
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  SubscriptionDailyBillingPayload,
  SubscriptionProcessBillingPayload,
  SubscriptionBatchBillingPayload,
  SubscriptionRetryFailedPayload,
  SubscriptionCatchupBillingPayload,
  SubscriptionShadowValidationPayload,
  SubscriptionAnalyticsSnapshotPayload,
  SubscriptionUpcomingReminderPayload,
} from '../../handlers/scheduled/subscriptions'
import { createJobFromPayload, getActiveTenants } from '../utils'
import { createPermanentError, handleJobResult } from '../errors'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const BILLING_RETRY = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 120000,
}

const PROCESS_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 30000,
}

// ============================================================
// DAILY BILLING TASK
// ============================================================

export const subscriptionDailyBillingTask = task({
  id: 'subscription-daily-billing',
  retry: BILLING_RETRY,
  run: async (payload: TenantEvent<SubscriptionDailyBillingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Running daily billing', { tenantId })

    const { subscriptionDailyBillingJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionDailyBillingJob.handler(
      createJobFromPayload('daily', payload)
    )

    return handleJobResult(result, 'Daily billing')
  },
})

// ============================================================
// PROCESS BILLING TASK
// ============================================================

export const subscriptionProcessBillingTask = task({
  id: 'subscription-process-billing',
  retry: BILLING_RETRY,
  run: async (payload: TenantEvent<SubscriptionProcessBillingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Processing billing', { tenantId })

    const { subscriptionProcessBillingJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionProcessBillingJob.handler(
      createJobFromPayload('process', payload)
    )

    return handleJobResult(result, 'Process billing')
  },
})

// ============================================================
// BATCH BILLING TASK
// ============================================================

export const subscriptionBatchBillingTask = task({
  id: 'subscription-batch-billing',
  retry: BILLING_RETRY,
  run: async (payload: TenantEvent<SubscriptionBatchBillingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Processing batch billing', { tenantId })

    const { subscriptionBatchBillingJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionBatchBillingJob.handler(
      createJobFromPayload('batch', payload)
    )

    return handleJobResult(result, 'Batch billing')
  },
})

// ============================================================
// RETRY FAILED TASK
// ============================================================

export const subscriptionRetryFailedTask = task({
  id: 'subscription-retry-failed',
  retry: PROCESS_RETRY,
  run: async (payload: TenantEvent<SubscriptionRetryFailedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Retrying failed subscriptions', { tenantId })

    const { subscriptionRetryFailedJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionRetryFailedJob.handler(
      createJobFromPayload('retry', payload)
    )

    return handleJobResult(result, 'Retry failed subscriptions')
  },
})

// ============================================================
// CATCHUP BILLING TASK
// ============================================================

export const subscriptionCatchupBillingTask = task({
  id: 'subscription-catchup-billing',
  retry: BILLING_RETRY,
  run: async (payload: TenantEvent<SubscriptionCatchupBillingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Running catchup billing', { tenantId })

    const { subscriptionCatchupBillingJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionCatchupBillingJob.handler(
      createJobFromPayload('catchup', payload)
    )

    return handleJobResult(result, 'Catchup billing')
  },
})

// ============================================================
// SHADOW VALIDATION TASK
// ============================================================

export const subscriptionShadowValidationTask = task({
  id: 'subscription-shadow-validation',
  retry: PROCESS_RETRY,
  run: async (payload: TenantEvent<SubscriptionShadowValidationPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Running shadow validation', { tenantId })

    const { subscriptionShadowValidationJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionShadowValidationJob.handler(
      createJobFromPayload('shadow', payload)
    )

    return handleJobResult(result, 'Shadow validation')
  },
})

// ============================================================
// ANALYTICS SNAPSHOT TASK
// ============================================================

export const subscriptionAnalyticsSnapshotTask = task({
  id: 'subscription-analytics-snapshot',
  retry: PROCESS_RETRY,
  run: async (payload: TenantEvent<SubscriptionAnalyticsSnapshotPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Creating analytics snapshot', { tenantId })

    const { subscriptionAnalyticsSnapshotJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionAnalyticsSnapshotJob.handler(
      createJobFromPayload('analytics', payload)
    )

    return handleJobResult(result, 'Analytics snapshot')
  },
})

// ============================================================
// UPCOMING REMINDER TASK
// ============================================================

export const subscriptionUpcomingReminderTask = task({
  id: 'subscription-upcoming-reminder',
  retry: PROCESS_RETRY,
  run: async (payload: TenantEvent<SubscriptionUpcomingReminderPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw createPermanentError('tenantId is required', 'MISSING_TENANT_ID')
    }

    logger.info('Sending upcoming reminders', { tenantId })

    const { subscriptionUpcomingReminderJob } = await import('../../handlers/scheduled/subscriptions.js')

    const result = await subscriptionUpcomingReminderJob.handler(
      createJobFromPayload('upcoming', payload)
    )

    return handleJobResult(result, 'Upcoming reminder')
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const subscriptionDailyBillingScheduledTask = schedules.task({
  id: 'subscription-daily-billing-scheduled',
  cron: '0 6 * * *', // 6 AM daily
  run: async () => {
    logger.info('Running scheduled daily billing')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await subscriptionDailyBillingTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const subscriptionRetryFailedScheduledTask = schedules.task({
  id: 'subscription-retry-failed-scheduled',
  cron: '0 */4 * * *', // Every 4 hours
  run: async () => {
    logger.info('Running scheduled retry failed - will query for failed subscriptions')
    // Note: This is a coordinator task. In production, it should:
    // 1. Query for subscriptions with failed payments
    // 2. Dispatch individual retry tasks for each
    // For now, we log and return - actual implementation in Phase 7
    return { message: 'Coordinator task - see Phase 7 for full implementation' }
  },
})

export const subscriptionAnalyticsSnapshotScheduledTask = schedules.task({
  id: 'subscription-analytics-snapshot-scheduled',
  cron: '0 2 * * *', // 2 AM daily
  run: async () => {
    logger.info('Running scheduled analytics snapshot')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await subscriptionAnalyticsSnapshotTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const subscriptionUpcomingReminderScheduledTask = schedules.task({
  id: 'subscription-upcoming-reminder-scheduled',
  cron: '0 9 * * *', // 9 AM daily
  run: async () => {
    logger.info('Running scheduled upcoming reminders - will query for expiring subscriptions')
    // Note: This is a coordinator task. In production, it should:
    // 1. Query for subscriptions renewing in 3 days
    // 2. Dispatch individual reminder tasks for each
    // For now, we log and return - actual implementation in Phase 7
    return { message: 'Coordinator task - see Phase 7 for full implementation' }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const subscriptionTasks = [
  subscriptionDailyBillingTask,
  subscriptionProcessBillingTask,
  subscriptionBatchBillingTask,
  subscriptionRetryFailedTask,
  subscriptionCatchupBillingTask,
  subscriptionShadowValidationTask,
  subscriptionAnalyticsSnapshotTask,
  subscriptionUpcomingReminderTask,
  subscriptionDailyBillingScheduledTask,
  subscriptionRetryFailedScheduledTask,
  subscriptionAnalyticsSnapshotScheduledTask,
  subscriptionUpcomingReminderScheduledTask,
]
