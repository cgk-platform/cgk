/**
 * Commerce Review Email Tasks
 *
 * Trigger.dev task definitions for review email management:
 * - Process review email queue (every 5 min)
 * - Retry failed review emails (every 15 min)
 * - Promote awaiting delivery emails (daily)
 * - Manual resend capability
 * - Follow-up sequence scheduling
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent, ReviewEmailQueuedPayload, ReviewEmailSentPayload } from '../../events'
import type {
  ProcessReviewEmailQueuePayload,
  ReviewEmailAwaitingDeliveryPayload,
  RetryFailedReviewEmailsPayload,
  SendQueuedReviewEmailPayload,
  ScheduleFollowUpPayload,
  ReviewEmailStatsPayload,
} from '../../handlers/commerce/review-email'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const REVIEW_EMAIL_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1000,
  maxTimeoutInMs: 30000,
}

const QUEUE_PROCESS_RETRY = {
  maxAttempts: 2,
  factor: 1,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 5000,
}

// ============================================================
// PROCESS REVIEW EMAIL QUEUE TASK
// ============================================================

/**
 * Process scheduled review emails
 *
 * Task ID: commerce-process-review-email-queue
 */
export const processReviewEmailQueueTask = task({
  id: 'commerce-process-review-email-queue',
  retry: QUEUE_PROCESS_RETRY,
  run: async (payload: TenantEvent<ProcessReviewEmailQueuePayload>) => {
    const { tenantId, limit = 50, dryRun = false } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing review email queue', { tenantId, limit, dryRun })

    const { processReviewEmailQueueJob } = await import('../../handlers/commerce/review-email.js')

    const result = await processReviewEmailQueueJob.handler(
      createJobFromPayload('process', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Queue processing failed')
    }

    return result.data
  },
})

// ============================================================
// REVIEW EMAIL AWAITING DELIVERY TASK
// ============================================================

/**
 * Promote emails that have been awaiting delivery too long
 *
 * Task ID: commerce-review-email-awaiting-delivery
 */
export const reviewEmailAwaitingDeliveryTask = task({
  id: 'commerce-review-email-awaiting-delivery',
  retry: QUEUE_PROCESS_RETRY,
  run: async (payload: TenantEvent<ReviewEmailAwaitingDeliveryPayload>) => {
    const { tenantId, daysWaiting = 14 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Checking awaiting delivery emails', { tenantId, daysWaiting })

    const { reviewEmailAwaitingDeliveryJob } = await import('../../handlers/commerce/review-email.js')

    const result = await reviewEmailAwaitingDeliveryJob.handler(
      createJobFromPayload('review', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Awaiting delivery check failed')
    }

    return result.data
  },
})

// ============================================================
// RETRY FAILED REVIEW EMAILS TASK
// ============================================================

/**
 * Retry emails that failed to send
 *
 * Task ID: commerce-retry-failed-review-emails
 */
export const retryFailedReviewEmailsTask = task({
  id: 'commerce-retry-failed-review-emails',
  retry: QUEUE_PROCESS_RETRY,
  run: async (payload: TenantEvent<RetryFailedReviewEmailsPayload>) => {
    const { tenantId, maxRetries = 5, limit = 25 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Retrying failed review emails', { tenantId, maxRetries, limit })

    const { retryFailedReviewEmailsJob } = await import('../../handlers/commerce/review-email.js')

    const result = await retryFailedReviewEmailsJob.handler(
      createJobFromPayload('retry', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Retry failed emails failed')
    }

    return result.data
  },
})

// ============================================================
// SEND QUEUED REVIEW EMAIL TASK
// ============================================================

/**
 * Send a single queued review email
 *
 * Task ID: commerce-send-queued-review-email
 */
export const sendQueuedReviewEmailTask = task({
  id: 'commerce-send-queued-review-email',
  retry: REVIEW_EMAIL_RETRY,
  run: async (payload: TenantEvent<SendQueuedReviewEmailPayload>) => {
    const { tenantId, reviewEmailId, orderId, force = false } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!reviewEmailId) {
      throw new Error('reviewEmailId is required')
    }

    logger.info('Sending queued review email', { tenantId, reviewEmailId, orderId, force })

    const { sendQueuedReviewEmailJob } = await import('../../handlers/commerce/review-email.js')

    const result = await sendQueuedReviewEmailJob.handler(
      createJobFromPayload('send', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send review email failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULE FOLLOW-UP TASK
// ============================================================

/**
 * Schedule a follow-up email in the review sequence
 *
 * Task ID: commerce-schedule-follow-up
 */
export const scheduleFollowUpTask = task({
  id: 'commerce-schedule-follow-up',
  retry: REVIEW_EMAIL_RETRY,
  run: async (payload: TenantEvent<ScheduleFollowUpPayload>) => {
    const { tenantId, reviewEmailId, orderId, sequenceNumber } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Scheduling follow-up email', { tenantId, reviewEmailId, orderId, sequenceNumber })

    const { scheduleFollowUpJob } = await import('../../handlers/commerce/review-email.js')

    const result = await scheduleFollowUpJob.handler(
      createJobFromPayload('schedule', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Schedule follow-up failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE REVIEW EMAIL QUEUED TASK
// ============================================================

/**
 * Handle review.email.queued event
 *
 * Task ID: commerce-handle-review-email-queued
 */
export const handleReviewEmailQueuedTask = task({
  id: 'commerce-handle-review-email-queued',
  retry: REVIEW_EMAIL_RETRY,
  run: async (payload: TenantEvent<ReviewEmailQueuedPayload>) => {
    const { tenantId, reviewEmailId, orderId, customerId, templateId, scheduledFor } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling review email queued', { tenantId, reviewEmailId, orderId, customerId, templateId, scheduledFor })

    const { handleReviewEmailQueuedJob } = await import('../../handlers/commerce/review-email.js')

    const result = await handleReviewEmailQueuedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle review email queued failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE REVIEW EMAIL SENT TASK
// ============================================================

/**
 * Handle review.email.sent event
 *
 * Task ID: commerce-handle-review-email-sent
 */
export const handleReviewEmailSentTask = task({
  id: 'commerce-handle-review-email-sent',
  retry: REVIEW_EMAIL_RETRY,
  run: async (payload: TenantEvent<ReviewEmailSentPayload>) => {
    const { tenantId, reviewEmailId, messageId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling review email sent', { tenantId, reviewEmailId, messageId })

    const { handleReviewEmailSentJob } = await import('../../handlers/commerce/review-email.js')

    const result = await handleReviewEmailSentJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle review email sent failed')
    }

    return result.data
  },
})

// ============================================================
// REVIEW EMAIL STATS TASK
// ============================================================

/**
 * Generate review email statistics
 *
 * Task ID: commerce-review-email-stats
 */
export const reviewEmailStatsTask = task({
  id: 'commerce-review-email-stats',
  retry: QUEUE_PROCESS_RETRY,
  run: async (payload: TenantEvent<ReviewEmailStatsPayload>) => {
    const { tenantId, startDate, endDate } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating review email stats', { tenantId, startDate, endDate })

    const { reviewEmailStatsJob } = await import('../../handlers/commerce/review-email.js')

    const result = await reviewEmailStatsJob.handler(
      createJobFromPayload('review', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Review email stats generation failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED: PROCESS REVIEW EMAIL QUEUE
// ============================================================

/**
 * Scheduled process review email queue - runs every 5 minutes
 *
 * Task ID: commerce-process-review-email-queue-scheduled
 */
export const processReviewEmailQueueScheduledTask = schedules.task({
  id: 'commerce-process-review-email-queue-scheduled',
  cron: '*/5 * * * *',
  run: async () => {
    logger.info('Running scheduled review email queue processing')

    const tenants = ['system'] // Placeholder for all active tenants

    const results = []
    for (const tenantId of tenants) {
      try {
        const result = await processReviewEmailQueueTask.triggerAndWait({
          tenantId,
          limit: 50,
          dryRun: false,
        })
        results.push({ tenantId, success: result.ok })
      } catch (error) {
        logger.error('Queue processing failed for tenant', { tenantId, error })
        results.push({ tenantId, success: false })
      }
    }

    return { processedTenants: results.length, results }
  },
})

// ============================================================
// SCHEDULED: RETRY FAILED REVIEW EMAILS
// ============================================================

/**
 * Scheduled retry failed review emails - runs every 15 minutes
 *
 * Task ID: commerce-retry-failed-review-emails-scheduled
 */
export const retryFailedReviewEmailsScheduledTask = schedules.task({
  id: 'commerce-retry-failed-review-emails-scheduled',
  cron: '*/15 * * * *',
  run: async () => {
    logger.info('Running scheduled retry failed review emails')

    const tenants = ['system']

    const results = []
    for (const tenantId of tenants) {
      try {
        const result = await retryFailedReviewEmailsTask.triggerAndWait({
          tenantId,
          maxRetries: 5,
          limit: 25,
        })
        results.push({ tenantId, success: result.ok })
      } catch (error) {
        logger.error('Retry failed for tenant', { tenantId, error })
        results.push({ tenantId, success: false })
      }
    }

    return { processedTenants: results.length, results }
  },
})

// ============================================================
// SCHEDULED: AWAITING DELIVERY CHECK
// ============================================================

/**
 * Scheduled awaiting delivery check - runs daily at 12 PM
 *
 * Task ID: commerce-review-email-awaiting-delivery-scheduled
 */
export const reviewEmailAwaitingDeliveryScheduledTask = schedules.task({
  id: 'commerce-review-email-awaiting-delivery-scheduled',
  cron: '0 12 * * *',
  run: async () => {
    logger.info('Running scheduled awaiting delivery check')

    const tenants = ['system']

    const results = []
    for (const tenantId of tenants) {
      try {
        const result = await reviewEmailAwaitingDeliveryTask.triggerAndWait({
          tenantId,
          daysWaiting: 14,
        })
        results.push({ tenantId, success: result.ok })
      } catch (error) {
        logger.error('Awaiting delivery check failed for tenant', { tenantId, error })
        results.push({ tenantId, success: false })
      }
    }

    return { processedTenants: results.length, results }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const reviewEmailTasks = [
  processReviewEmailQueueTask,
  reviewEmailAwaitingDeliveryTask,
  retryFailedReviewEmailsTask,
  sendQueuedReviewEmailTask,
  scheduleFollowUpTask,
  handleReviewEmailQueuedTask,
  handleReviewEmailSentTask,
  reviewEmailStatsTask,
  processReviewEmailQueueScheduledTask,
  retryFailedReviewEmailsScheduledTask,
  reviewEmailAwaitingDeliveryScheduledTask,
]
