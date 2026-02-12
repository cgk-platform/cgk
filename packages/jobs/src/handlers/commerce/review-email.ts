/**
 * Review Email Queue Job Handlers
 *
 * Background jobs for review email management:
 * - Process review email queue (every 5 min)
 * - Retry failed review emails (every 15 min)
 * - Promote awaiting delivery emails (daily)
 * - Manual resend capability
 * - Follow-up sequence scheduling
 *
 * Rate limiting: 10 emails/second per tenant (respecting Resend 0.55s delay)
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All handlers require tenantId
 */

import { defineJob } from '../../define'
import type {
  ReviewEmailQueuedPayload,
  ReviewEmailSentPayload,
  TenantEvent,
} from '../../events'
import type { JobResult } from '../../types'

// ---------------------------------------------------------------------------
// Job Payloads
// ---------------------------------------------------------------------------

export interface ProcessReviewEmailQueuePayload {
  tenantId: string
  limit?: number
  dryRun?: boolean
}

export interface ReviewEmailAwaitingDeliveryPayload {
  tenantId: string
  daysWaiting?: number
}

export interface RetryFailedReviewEmailsPayload {
  tenantId: string
  maxRetries?: number
  limit?: number
}

export interface SendQueuedReviewEmailPayload {
  tenantId: string
  reviewEmailId: string
  orderId: string
  force?: boolean
}

export interface ScheduleFollowUpPayload {
  tenantId: string
  reviewEmailId: string
  orderId: string
  sequenceNumber: number
}

export interface ReviewEmailStatsPayload {
  tenantId: string
  startDate?: string
  endDate?: string
}

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

const REVIEW_EMAIL_RETRY = {
  maxAttempts: 3,
  backoff: 'exponential' as const,
  initialDelay: 1000,
  maxDelay: 30000,
}

const QUEUE_PROCESS_RETRY = {
  maxAttempts: 2,
  backoff: 'fixed' as const,
  initialDelay: 5000,
}

// ---------------------------------------------------------------------------
// Rate Limiting Constants
// ---------------------------------------------------------------------------

/**
 * Rate limiting configuration for Resend API
 * - RESEND_DELAY_MS: Minimum 550ms between API calls
 * - MAX_EMAILS_PER_SECOND: Per-tenant limit of 10 emails/sec
 *
 * These constants are documented here and will be used
 * in the actual implementation when the handler logic is completed.
 */
export const REVIEW_EMAIL_RATE_LIMITS = {
  RESEND_DELAY_MS: 550,
  MAX_EMAILS_PER_SECOND: 10,
} as const

// ---------------------------------------------------------------------------
// Process Review Email Queue Job
// ---------------------------------------------------------------------------

/**
 * Process scheduled review emails
 *
 * Runs every 5 minutes to process up to 50 scheduled emails.
 *
 * For each email:
 * 1. Check if customer already reviewed (skip if yes)
 * 2. Get order details
 * 3. Calculate incentive tier
 * 4. Send email via Resend
 * 5. Schedule follow-up if sequence 1
 *
 * Schedule: every 5 minutes
 */
export const processReviewEmailQueueJob = defineJob<TenantEvent<ProcessReviewEmailQueuePayload>>({
  name: 'commerce.processReviewEmailQueue',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, limit = 50, dryRun = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.processReviewEmailQueue] Processing queue`, {
      tenantId,
      limit,
      dryRun,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Query review_emails where status = 'scheduled' AND scheduled_at <= NOW()
    // 2. Order by scheduled_at ASC, LIMIT to batch size
    // 3. For each email:
    //    a. Check if order already has a review (skip)
    //    b. Check if customer unsubscribed (skip)
    //    c. Get order and customer details
    //    d. Get tenant incentive settings
    //    e. Render email template
    //    f. Send via Resend API (with delay)
    //    g. Update status to 'sent'
    //    h. Schedule follow-up if sequence 1
    // 4. Track success/failure counts

    return {
      success: true,
      data: {
        tenantId,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        dryRun,
        processedAt: new Date().toISOString(),
      },
    }
  },
  retry: QUEUE_PROCESS_RETRY,
})

// ---------------------------------------------------------------------------
// Review Email Awaiting Delivery Job
// ---------------------------------------------------------------------------

/**
 * Promote emails that have been awaiting delivery too long
 *
 * If an order shows "awaiting delivery" status for too long,
 * promote the review email to send anyway. This catches cases
 * where delivery status wasn't updated.
 *
 * Schedule: 0 12 * * * (daily at 12 PM)
 */
export const reviewEmailAwaitingDeliveryJob = defineJob<TenantEvent<ReviewEmailAwaitingDeliveryPayload>>({
  name: 'commerce.reviewEmailAwaitingDelivery',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, daysWaiting = 14 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.reviewEmailAwaitingDelivery] Checking stale emails`, {
      tenantId,
      daysWaiting,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Query emails where status = 'awaiting_delivery'
    //    AND created_at < NOW() - daysWaiting
    // 2. For each email:
    //    a. Check if order was actually delivered (tracking update)
    //    b. If not delivered but waiting too long, promote to 'scheduled'
    //    c. Set scheduled_at to NOW()
    // 3. Track count of promoted emails

    return {
      success: true,
      data: {
        tenantId,
        daysWaiting,
        checked: 0,
        promoted: 0,
        promotedAt: new Date().toISOString(),
      },
    }
  },
  retry: QUEUE_PROCESS_RETRY,
})

// ---------------------------------------------------------------------------
// Retry Failed Review Emails Job
// ---------------------------------------------------------------------------

/**
 * Retry emails that failed to send
 *
 * Picks up emails with status = 'failed' and attempts < maxRetries.
 * Uses exponential backoff between retries.
 *
 * Schedule: every 15 minutes
 */
export const retryFailedReviewEmailsJob = defineJob<TenantEvent<RetryFailedReviewEmailsPayload>>({
  name: 'commerce.retryFailedReviewEmails',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, maxRetries = 5, limit = 25 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.retryFailedReviewEmails] Retrying failed emails`, {
      tenantId,
      maxRetries,
      limit,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Query review_emails where status = 'failed' AND attempts < maxRetries
    // 2. Order by last_attempt_at ASC (oldest failures first)
    // 3. Check if enough time has passed (exponential backoff)
    // 4. For each eligible email:
    //    a. Increment attempt counter
    //    b. Attempt to send via Resend
    //    c. Update status to 'sent' or 'failed'
    //    d. If attempts >= maxRetries, mark as 'permanently_failed'

    return {
      success: true,
      data: {
        tenantId,
        retried: 0,
        succeeded: 0,
        failed: 0,
        permanentlyFailed: 0,
        retriedAt: new Date().toISOString(),
      },
    }
  },
  retry: QUEUE_PROCESS_RETRY,
})

// ---------------------------------------------------------------------------
// Send Queued Review Email Job
// ---------------------------------------------------------------------------

/**
 * Send a single queued review email
 *
 * Can be triggered manually or by the queue processor.
 * Handles the actual email sending logic.
 */
export const sendQueuedReviewEmailJob = defineJob<TenantEvent<SendQueuedReviewEmailPayload>>({
  name: 'commerce.sendQueuedReviewEmail',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, reviewEmailId, orderId, force = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    if (!reviewEmailId) {
      return {
        success: false,
        error: {
          message: 'reviewEmailId is required',
          code: 'MISSING_REVIEW_EMAIL_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.sendQueuedReviewEmail] Sending email`, {
      tenantId,
      reviewEmailId,
      orderId,
      force,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get review email record
    // 2. If not force, validate:
    //    a. Email status is 'scheduled'
    //    b. Order doesn't have a review yet
    //    c. Customer hasn't unsubscribed
    // 3. Get order, customer, and product details
    // 4. Get tenant email settings and incentive config
    // 5. Render email template with personalization
    // 6. Send via Resend API
    // 7. Update email status and record message_id
    // 8. If sequence 1, schedule sequence 2 follow-up

    return {
      success: true,
      data: {
        tenantId,
        reviewEmailId,
        orderId,
        messageId: undefined,
        sentAt: new Date().toISOString(),
      },
    }
  },
  retry: REVIEW_EMAIL_RETRY,
})

// ---------------------------------------------------------------------------
// Schedule Follow-Up Job
// ---------------------------------------------------------------------------

/**
 * Schedule a follow-up email in the review sequence
 *
 * After sending sequence 1, this schedules sequence 2.
 * Typically sequence 2 is sent 7 days after sequence 1.
 */
export const scheduleFollowUpJob = defineJob<TenantEvent<ScheduleFollowUpPayload>>({
  name: 'commerce.scheduleFollowUp',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, reviewEmailId, orderId, sequenceNumber } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.scheduleFollowUp] Scheduling follow-up`, {
      tenantId,
      reviewEmailId,
      orderId,
      sequenceNumber,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Check if a review was submitted after sequence 1 (skip if yes)
    // 2. Get tenant follow-up settings (delay, enabled)
    // 3. Calculate scheduled_at based on delay settings
    // 4. Create new review_email record for sequence 2
    // 5. Set status to 'scheduled'

    const nextSequence = sequenceNumber + 1
    const followUpDelayDays = 7

    return {
      success: true,
      data: {
        tenantId,
        originalEmailId: reviewEmailId,
        orderId,
        newSequenceNumber: nextSequence,
        scheduledFor: new Date(Date.now() + followUpDelayDays * 24 * 60 * 60 * 1000).toISOString(),
      },
    }
  },
  retry: REVIEW_EMAIL_RETRY,
})

// ---------------------------------------------------------------------------
// Handle Review Email Queued Event
// ---------------------------------------------------------------------------

/**
 * Handle review.email.queued event
 *
 * Entry point when a new review email is queued.
 */
export const handleReviewEmailQueuedJob = defineJob<TenantEvent<ReviewEmailQueuedPayload>>({
  name: 'commerce.handleReviewEmailQueued',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, reviewEmailId, orderId, customerId, templateId, scheduledFor } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.handleReviewEmailQueued] Email queued`, {
      tenantId,
      reviewEmailId,
      orderId,
      customerId,
      templateId,
      scheduledFor,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Create or update review_email record
    // 2. Set status to 'scheduled'
    // 3. Store template and customer details
    // 4. The queue processor will pick it up at scheduled time

    return {
      success: true,
      data: {
        tenantId,
        reviewEmailId,
        orderId,
        status: 'scheduled',
        scheduledFor: scheduledFor || new Date().toISOString(),
      },
    }
  },
  retry: REVIEW_EMAIL_RETRY,
})

// ---------------------------------------------------------------------------
// Handle Review Email Sent Event
// ---------------------------------------------------------------------------

/**
 * Handle review.email.sent event
 *
 * Post-send processing and analytics.
 */
export const handleReviewEmailSentJob = defineJob<TenantEvent<ReviewEmailSentPayload>>({
  name: 'commerce.handleReviewEmailSent',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, reviewEmailId, messageId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.handleReviewEmailSent] Recording sent email`, {
      tenantId,
      reviewEmailId,
      messageId,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Update review_email record with sent status
    // 2. Store Resend message_id for tracking
    // 3. Update tenant email metrics/analytics
    // 4. Potentially trigger follow-up scheduling

    return {
      success: true,
      data: {
        tenantId,
        reviewEmailId,
        messageId,
        recordedAt: new Date().toISOString(),
      },
    }
  },
  retry: REVIEW_EMAIL_RETRY,
})

// ---------------------------------------------------------------------------
// Review Email Stats Job
// ---------------------------------------------------------------------------

/**
 * Generate review email statistics
 *
 * Calculates delivery rates, open rates, review conversion rates.
 */
export const reviewEmailStatsJob = defineJob<TenantEvent<ReviewEmailStatsPayload>>({
  name: 'commerce.reviewEmailStats',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, startDate, endDate } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[commerce.reviewEmailStats] Generating stats`, {
      tenantId,
      startDate,
      endDate,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Query review_emails for the date range
    // 2. Calculate: sent, delivered, opened, clicked, converted
    // 3. Calculate rates (delivery rate, open rate, conversion rate)
    // 4. Compare to previous period
    // 5. Store aggregated stats

    return {
      success: true,
      data: {
        tenantId,
        startDate,
        endDate,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          deliveryRate: 0,
          openRate: 0,
          conversionRate: 0,
        },
      },
    }
  },
  retry: QUEUE_PROCESS_RETRY,
})

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export const REVIEW_EMAIL_SCHEDULES = {
  // Process email queue every 5 minutes
  processQueue: { cron: '*/5 * * * *' },
  // Retry failed emails every 15 minutes
  retryFailed: { cron: '*/15 * * * *' },
  // Check awaiting delivery daily at 12 PM
  awaitingDelivery: { cron: '0 12 * * *' },
} as const

// ---------------------------------------------------------------------------
// Export All Jobs
// ---------------------------------------------------------------------------

export const reviewEmailJobs = [
  processReviewEmailQueueJob,
  reviewEmailAwaitingDeliveryJob,
  retryFailedReviewEmailsJob,
  sendQueuedReviewEmailJob,
  scheduleFollowUpJob,
  handleReviewEmailQueuedJob,
  handleReviewEmailSentJob,
  reviewEmailStatsJob,
]
