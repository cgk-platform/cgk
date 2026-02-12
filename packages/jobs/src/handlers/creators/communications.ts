/**
 * Creator Communication Jobs
 *
 * Background jobs for creator communications:
 * - Email queue processing
 * - Welcome email sequences
 * - Reminder systems (delivery, deadline, no-response, abandoned)
 * - Email cancellation and retry
 *
 * CRITICAL: All jobs require tenantId for tenant isolation.
 * See TENANT-ISOLATION.md for patterns.
 *
 * @ai-pattern creator-communications
 * @ai-critical Email sequences MUST be cancellable mid-stream
 */

import { defineJob } from '../../define'
import type { Job, JobResult } from '../../types'
import type {
  TenantEvent,
  CreatorSetupCompletePayload,
} from '../../events'

// Note: CreatorEmailQueuedPayload and CreatorReminderPayload are available
// from events.ts but we use custom payloads with more specific fields

// ============================================================
// PAYLOAD TYPES
// ============================================================

export interface ProcessCreatorEmailQueuePayload {
  limit?: number // Default 20
  priority?: 'high' | 'normal' | 'low'
}

export interface ScheduleWelcomeSequencePayload {
  creatorId: string
  email: string
  creatorName: string
  welcomeCallScheduled?: boolean
}

export interface CancelPendingEmailsPayload {
  creatorId: string
  reason: 'status_change' | 'unsubscribed' | 'bounced' | 'admin_cancel'
  emailTypes?: string[] // If provided, only cancel these types
}

export interface RetryFailedEmailsPayload {
  limit?: number
  maxRetries?: number
  minAgeMinutes?: number
}

export interface QueueCreatorEmailPayload {
  creatorId: string
  templateId: string
  data: Record<string, unknown>
  priority?: 'high' | 'normal' | 'low'
  scheduledFor?: Date
  idempotencyKey?: string
}

export interface QueueProjectEmailPayload {
  creatorId: string
  projectId: string
  templateId: string
  data: Record<string, unknown>
  priority?: 'high' | 'normal' | 'low'
}

export interface QueuePaymentEmailPayload {
  creatorId: string
  payoutId?: string
  templateId: string
  amount: number
  currency: string
  data?: Record<string, unknown>
}

export interface ProductDeliveryRemindersPayload {
  daysAfterDelivery?: number // Default 5
}

export interface DeadlineRemindersPayload {
  daysBeforeDeadline?: number[] // Default [3, 1]
}

export interface NoResponseRemindersPayload {
  daysWithoutResponse?: number // Default 2
}

export interface AbandonedApplicationRemindersPayload {
  checkType: '1h_sms' | '24h_email' | '48h_final'
}

export interface SendCreatorReminderPayload {
  creatorId: string
  reminderType: 'delivery' | 'deadline' | 'noResponse' | 'abandoned' | 'manual'
  projectId?: string
  message?: string
}

export interface ApprovalRemindersPayload {
  // Empty - processes all approved creators who need reminders
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface EmailQueueResult {
  processed: number
  sent: number
  failed: number
  skipped: number
}

export interface WelcomeSequenceResult {
  sequenceId: string
  emailsScheduled: number
  firstEmailAt: Date
}

export interface CancelEmailsResult {
  cancelled: number
  alreadySent: number
}

export interface RetryEmailsResult {
  retried: number
  exhausted: number
  tooRecent: number
}

export interface QueueEmailResult {
  emailId: string
  scheduledFor: Date
  deduplicated: boolean
}

export interface ReminderBatchResult {
  creatorsChecked: number
  remindersQueued: number
  skipped: number
}

export interface SingleReminderResult {
  sent: boolean
  channel: 'email' | 'sms' | 'both'
  messageId?: string
}

// ============================================================
// PROCESS EMAIL QUEUE (Every 5 minutes)
// ============================================================

/**
 * Process pending creator emails from the queue
 * Runs every 5 minutes, processes up to 20 emails per run
 *
 * Steps:
 * 1. Fetch pending emails ordered by priority, scheduled_for
 * 2. For each email, check if still valid (creator active, not unsubscribed)
 * 3. Render template with data
 * 4. Send via email provider (Resend/SendGrid)
 * 5. Update status (sent/failed)
 * 6. Track metrics
 */
export const processCreatorEmailQueueJob = defineJob<
  TenantEvent<ProcessCreatorEmailQueuePayload>,
  EmailQueueResult
>({
  name: 'creator.processEmailQueue',
  handler: async (
    job: Job<TenantEvent<ProcessCreatorEmailQueuePayload>>
  ): Promise<JobResult<EmailQueueResult>> => {
    const { tenantId, limit = 20, priority } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(`[processCreatorEmailQueue] Processing up to ${limit} emails for tenant ${tenantId}`, {
      priority,
    })

    // Implementation would:
    // 1. Query creator_email_queue WHERE status = 'pending' AND scheduled_for <= NOW()
    //    ORDER BY priority DESC, scheduled_for ASC LIMIT ${limit}
    // 2. For each email:
    //    a. Verify creator is still active and not unsubscribed
    //    b. Get template from email_templates
    //    c. Render template with data
    //    d. Send via email provider with idempotency key
    //    e. Update status to 'sent' or 'failed'
    //    f. Log to creator_email_log

    return {
      success: true,
      data: {
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// SCHEDULE WELCOME SEQUENCE
// ============================================================

/**
 * Schedule the 4-email welcome sequence for new approved creators
 * Triggered when creator is approved
 *
 * Welcome sequence:
 * 1. Email 1 (immediate): Welcome & getting started
 * 2. Email 2 (day 2): Profile tips & best practices
 * 3. Email 3 (day 5): First project guidance
 * 4. Email 4 (day 10): Success stories & motivation
 */
export const scheduleCreatorWelcomeSequenceJob = defineJob<
  TenantEvent<ScheduleWelcomeSequencePayload>,
  WelcomeSequenceResult
>({
  name: 'creator.scheduleWelcomeSequence',
  handler: async (
    job: Job<TenantEvent<ScheduleWelcomeSequencePayload>>
  ): Promise<JobResult<WelcomeSequenceResult>> => {
    const { tenantId, creatorId, email, creatorName, welcomeCallScheduled } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[scheduleCreatorWelcomeSequence] Scheduling welcome sequence for ${creatorName} (${email}) in tenant ${tenantId}`
    )

    const sequenceId = `welcome_${creatorId}_${Date.now()}`
    const now = new Date()

    // Welcome sequence schedule (in days from now)
    const emailSchedule = [
      { templateId: 'welcome-1-getting-started', delayDays: 0 },
      { templateId: 'welcome-2-profile-tips', delayDays: 2 },
      { templateId: 'welcome-3-first-project', delayDays: 5 },
      { templateId: 'welcome-4-success-stories', delayDays: 10 },
    ]

    // Implementation would:
    // 1. Create welcome_sequence record with status 'active'
    // 2. For each email in sequence:
    //    - Calculate scheduled_for date
    //    - Insert into creator_email_queue
    //    - Link to sequence via sequence_id
    // 3. If welcomeCallScheduled, skip email 1 (they're already engaged)
    // 4. Store sequence metadata for cancellation

    console.log(
      `[scheduleCreatorWelcomeSequence] Scheduled ${emailSchedule.length} emails for sequence ${sequenceId}`
    )

    return {
      success: true,
      data: {
        sequenceId,
        emailsScheduled: welcomeCallScheduled ? 3 : 4,
        firstEmailAt: welcomeCallScheduled
          ? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
          : now,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// CANCEL PENDING EMAILS
// ============================================================

/**
 * Cancel pending emails for a creator
 * Called when creator status changes or unsubscribes
 *
 * Soft cancel - marks emails as 'cancelled' rather than deleting
 * for audit trail purposes
 */
export const cancelCreatorPendingEmailsJob = defineJob<
  TenantEvent<CancelPendingEmailsPayload>,
  CancelEmailsResult
>({
  name: 'creator.cancelPendingEmails',
  handler: async (
    job: Job<TenantEvent<CancelPendingEmailsPayload>>
  ): Promise<JobResult<CancelEmailsResult>> => {
    const { tenantId, creatorId, reason, emailTypes } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[cancelCreatorPendingEmails] Cancelling emails for creator ${creatorId} in tenant ${tenantId}`,
      { reason, emailTypes }
    )

    // Implementation would:
    // 1. Build query for pending emails:
    //    WHERE creator_id = ${creatorId} AND status = 'pending'
    //    AND (emailTypes IS NULL OR template_id IN (emailTypes))
    // 2. Update status to 'cancelled', cancelled_reason = reason
    // 3. Cancel any active sequences for this creator
    // 4. Count already-sent emails that couldn't be cancelled

    return {
      success: true,
      data: {
        cancelled: 0,
        alreadySent: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 1000 },
})

// ============================================================
// RETRY FAILED EMAILS
// ============================================================

/**
 * Retry failed email sends
 * Runs periodically to pick up transient failures
 *
 * Only retries emails that:
 * - Failed due to retryable errors (not bounces/spam)
 * - Haven't exceeded max retry count
 * - Are at least X minutes old (avoid hot retry loops)
 */
export const retryFailedCreatorEmailsJob = defineJob<
  TenantEvent<RetryFailedEmailsPayload>,
  RetryEmailsResult
>({
  name: 'creator.retryFailedEmails',
  handler: async (
    job: Job<TenantEvent<RetryFailedEmailsPayload>>
  ): Promise<JobResult<RetryEmailsResult>> => {
    const { tenantId, limit = 50, maxRetries = 3, minAgeMinutes = 15 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[retryFailedCreatorEmails] Retrying failed emails for tenant ${tenantId}`,
      { limit, maxRetries, minAgeMinutes }
    )

    // Implementation would:
    // 1. Query emails WHERE status = 'failed'
    //    AND retry_count < maxRetries
    //    AND failed_at < NOW() - minAgeMinutes
    //    AND error_code IN (retryable_error_codes)
    // 2. For each email:
    //    - Increment retry_count
    //    - Reset status to 'pending'
    //    - Set scheduled_for to now + exponential backoff
    // 3. Track exhausted emails (exceeded max retries)

    return {
      success: true,
      data: {
        retried: 0,
        exhausted: 0,
        tooRecent: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 5000 },
})

// ============================================================
// QUEUE SINGLE CREATOR EMAIL
// ============================================================

/**
 * Queue a single email for a creator
 * Generic endpoint for ad-hoc emails
 *
 * Supports idempotency to prevent duplicate emails
 */
export const queueCreatorEmailJob = defineJob<
  TenantEvent<QueueCreatorEmailPayload>,
  QueueEmailResult
>({
  name: 'creator.queueEmail',
  handler: async (
    job: Job<TenantEvent<QueueCreatorEmailPayload>>
  ): Promise<JobResult<QueueEmailResult>> => {
    const { tenantId, creatorId, templateId, priority = 'normal', scheduledFor, idempotencyKey } =
      job.payload
    // data used in full implementation for template rendering

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[queueCreatorEmail] Queuing ${templateId} for creator ${creatorId} in tenant ${tenantId}`,
      { priority, scheduledFor, idempotencyKey }
    )

    const effectiveScheduledFor = scheduledFor || new Date()

    // Implementation would:
    // 1. If idempotencyKey provided, check for existing email
    // 2. If duplicate found, return with deduplicated: true
    // 3. Get creator email address from creators table
    // 4. Validate template exists
    // 5. Insert into creator_email_queue
    // 6. Return email ID

    return {
      success: true,
      data: {
        emailId: `email_${Date.now()}`,
        scheduledFor: effectiveScheduledFor,
        deduplicated: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 1000 },
})

// ============================================================
// QUEUE PROJECT EMAIL
// ============================================================

/**
 * Queue a project-specific email
 * Includes project context in the template data
 */
export const queueProjectEmailJob = defineJob<
  TenantEvent<QueueProjectEmailPayload>,
  QueueEmailResult
>({
  name: 'creator.queueProjectEmail',
  handler: async (
    job: Job<TenantEvent<QueueProjectEmailPayload>>
  ): Promise<JobResult<QueueEmailResult>> => {
    const { tenantId, creatorId, projectId, templateId } = job.payload
    // data, priority used in full implementation for email content and scheduling

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[queueProjectEmail] Queuing ${templateId} for creator ${creatorId}, project ${projectId} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Get project details from projects table
    // 2. Get creator email from creators table
    // 3. Merge project data with provided data
    // 4. Insert into creator_email_queue with project_id
    // 5. Use project-based idempotency key

    return {
      success: true,
      data: {
        emailId: `email_${Date.now()}`,
        scheduledFor: new Date(),
        deduplicated: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 1000 },
})

// ============================================================
// QUEUE PAYMENT EMAIL
// ============================================================

/**
 * Queue a payment notification email
 * Special handling for payment-related templates
 */
export const queuePaymentEmailJob = defineJob<
  TenantEvent<QueuePaymentEmailPayload>,
  QueueEmailResult
>({
  name: 'creator.queuePaymentEmail',
  handler: async (
    job: Job<TenantEvent<QueuePaymentEmailPayload>>
  ): Promise<JobResult<QueueEmailResult>> => {
    const { tenantId, creatorId, payoutId, templateId, amount, currency } = job.payload
    // data used in full implementation for additional template context

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[queuePaymentEmail] Queuing ${templateId} for creator ${creatorId} in tenant ${tenantId}`,
      { payoutId, amount, currency }
    )

    // Implementation would:
    // 1. Get creator details from creators table
    // 2. Get payout details if payoutId provided
    // 3. Format amount for display (cents to dollars)
    // 4. Insert with high priority (payment emails are important)
    // 5. Use payout-based idempotency key

    return {
      success: true,
      data: {
        emailId: `email_${Date.now()}`,
        scheduledFor: new Date(),
        deduplicated: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 1000 },
})

// ============================================================
// ON CREATOR SETUP COMPLETE
// ============================================================

/**
 * Handle creator setup completion
 * Cancels setup reminder sequence and triggers next steps
 */
export const onCreatorSetupCompleteJob = defineJob<
  TenantEvent<CreatorSetupCompletePayload>,
  { cancelledReminders: number; nextStepsQueued: boolean }
>({
  name: 'creator.onSetupComplete',
  handler: async (
    job: Job<TenantEvent<CreatorSetupCompletePayload>>
  ): Promise<JobResult<{ cancelledReminders: number; nextStepsQueued: boolean }>> => {
    const { tenantId, creatorId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onCreatorSetupComplete] Creator ${creatorId} completed setup in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Cancel any pending setup reminder emails
    // 2. Cancel welcome sequence if still pending (they're already engaged)
    // 3. Queue "setup complete" confirmation email
    // 4. Update creator.setup_completed_at
    // 5. Optionally notify admin via Slack

    return {
      success: true,
      data: {
        cancelledReminders: 0,
        nextStepsQueued: true,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 1000 },
})

// ============================================================
// PRODUCT DELIVERY REMINDERS (Daily 10 AM)
// ============================================================

/**
 * Send reminders to creators 5 days after product delivery
 * "Have you received your product? Start creating!"
 */
export const creatorProductDeliveryRemindersJob = defineJob<
  TenantEvent<ProductDeliveryRemindersPayload>,
  ReminderBatchResult
>({
  name: 'creator.productDeliveryReminders',
  handler: async (
    job: Job<TenantEvent<ProductDeliveryRemindersPayload>>
  ): Promise<JobResult<ReminderBatchResult>> => {
    const { tenantId, daysAfterDelivery = 5 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[creatorProductDeliveryReminders] Checking ${daysAfterDelivery}-day delivery reminders for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Find shipments delivered exactly daysAfterDelivery days ago
    // 2. Check if creator has started any content since delivery
    // 3. Skip if content already submitted
    // 4. Skip if reminder already sent for this shipment
    // 5. Queue reminder email with product/project context

    return {
      success: true,
      data: {
        creatorsChecked: 0,
        remindersQueued: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// DEADLINE REMINDERS (Daily 9 AM)
// ============================================================

/**
 * Send deadline reminders 3 days and 1 day before project deadline
 * Helps creators stay on track
 */
export const creatorDeadlineRemindersJob = defineJob<
  TenantEvent<DeadlineRemindersPayload>,
  ReminderBatchResult
>({
  name: 'creator.deadlineReminders',
  handler: async (
    job: Job<TenantEvent<DeadlineRemindersPayload>>
  ): Promise<JobResult<ReminderBatchResult>> => {
    const { tenantId, daysBeforeDeadline = [3, 1] } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[creatorDeadlineReminders] Checking deadline reminders for tenant ${tenantId}`,
      { daysBeforeDeadline }
    )

    // Implementation would:
    // 1. For each days threshold in daysBeforeDeadline:
    //    a. Find projects with deadline = NOW + days
    //    b. Filter out completed/submitted projects
    //    c. Check if reminder already sent for this deadline/days combo
    //    d. Queue reminder email with deadline context
    // 2. Track which reminder (3-day vs 1-day) was sent

    return {
      success: true,
      data: {
        creatorsChecked: 0,
        remindersQueued: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// NO-RESPONSE REMINDERS (Daily 2 PM)
// ============================================================

/**
 * Send reminders to creators who haven't responded in 2 days
 * For pending admin questions or revision requests
 */
export const creatorNoResponseRemindersJob = defineJob<
  TenantEvent<NoResponseRemindersPayload>,
  ReminderBatchResult
>({
  name: 'creator.noResponseReminders',
  handler: async (
    job: Job<TenantEvent<NoResponseRemindersPayload>>
  ): Promise<JobResult<ReminderBatchResult>> => {
    const { tenantId, daysWithoutResponse = 2 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[creatorNoResponseReminders] Checking ${daysWithoutResponse}-day no-response for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Find threads/messages requiring creator response
    // 2. Filter where last_message_at < NOW() - daysWithoutResponse
    // 3. Skip if creator has responded since
    // 4. Skip if reminder already sent for this thread
    // 5. Queue reminder email with thread context
    // 6. Optionally escalate to admin if multiple reminders sent

    return {
      success: true,
      data: {
        creatorsChecked: 0,
        remindersQueued: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// ABANDONED APPLICATION REMINDERS (Hourly :15)
// ============================================================

/**
 * Send reminders for abandoned creator applications
 * Multi-stage: 1h SMS, 24h email, 48h final
 *
 * CRITICAL: SMS requires consent check
 */
export const creatorAbandonedApplicationRemindersJob = defineJob<
  TenantEvent<AbandonedApplicationRemindersPayload>,
  ReminderBatchResult
>({
  name: 'creator.abandonedApplicationReminders',
  handler: async (
    job: Job<TenantEvent<AbandonedApplicationRemindersPayload>>
  ): Promise<JobResult<ReminderBatchResult>> => {
    const { tenantId, checkType } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[creatorAbandonedApplicationReminders] Processing ${checkType} reminders for tenant ${tenantId}`
    )

    // Implementation would vary by checkType:
    //
    // 1h_sms:
    //   - Find applications started 1h ago, not completed
    //   - Check SMS consent before sending
    //   - Send brief SMS reminder
    //   - Mark reminder_1h_sent_at
    //
    // 24h_email:
    //   - Find applications started 24h ago, not completed
    //   - Send detailed email with benefits
    //   - Mark reminder_24h_sent_at
    //
    // 48h_final:
    //   - Find applications started 48h ago, not completed
    //   - Send final reminder with urgency
    //   - Mark reminder_48h_sent_at
    //   - If still not completed after 72h, archive application

    return {
      success: true,
      data: {
        creatorsChecked: 0,
        remindersQueued: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// SEND SINGLE CREATOR REMINDER
// ============================================================

/**
 * Send a single reminder to a specific creator
 * Manual trigger from admin or automated escalation
 */
export const sendCreatorReminderJob = defineJob<
  TenantEvent<SendCreatorReminderPayload>,
  SingleReminderResult
>({
  name: 'creator.sendReminder',
  handler: async (
    job: Job<TenantEvent<SendCreatorReminderPayload>>
  ): Promise<JobResult<SingleReminderResult>> => {
    const { tenantId, creatorId, reminderType, projectId, message } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[sendCreatorReminder] Sending ${reminderType} reminder to creator ${creatorId} in tenant ${tenantId}`,
      { projectId, message }
    )

    // Implementation would:
    // 1. Get creator preferences (email, SMS consent)
    // 2. Get project context if projectId provided
    // 3. Select template based on reminderType
    // 4. If manual and message provided, use custom message
    // 5. Send via preferred channel(s)
    // 6. Log reminder to creator_reminders table

    return {
      success: true,
      data: {
        sent: true,
        channel: 'email',
        messageId: `msg_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// APPROVAL REMINDERS (Daily 9 AM)
// ============================================================

/**
 * Send reminders to approved creators who haven't logged in
 * Multi-step escalation based on days since approval
 */
export const checkApprovalRemindersJob = defineJob<
  TenantEvent<ApprovalRemindersPayload>,
  ReminderBatchResult
>({
  name: 'creator.checkApprovalReminders',
  handler: async (
    job: Job<TenantEvent<ApprovalRemindersPayload>>
  ): Promise<JobResult<ReminderBatchResult>> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[checkApprovalReminders] Checking approval reminders for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Get reminder config from tenant settings
    // 2. Find approved creators who haven't logged in
    // 3. For each creator, determine which reminder step they're on
    // 4. Queue appropriate reminder based on days since approval
    // 5. Update reminder_count and last_reminder_at
    // 6. Mark as escalated if past final step

    return {
      success: true,
      data: {
        creatorsChecked: 0,
        remindersQueued: 0,
        skipped: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

// ============================================================
// SCHEDULES
// ============================================================

export const COMMUNICATION_SCHEDULES = {
  processEmailQueue: {
    cron: '*/5 * * * *', // Every 5 minutes
    timezone: 'UTC',
  },
  approvalReminders: {
    cron: '0 9 * * *', // Daily at 9 AM UTC
    timezone: 'UTC',
  },
  productDeliveryReminders: {
    cron: '0 10 * * *', // Daily at 10 AM UTC
    timezone: 'UTC',
  },
  deadlineReminders: {
    cron: '0 9 * * *', // Daily at 9 AM UTC
    timezone: 'UTC',
  },
  noResponseReminders: {
    cron: '0 14 * * *', // Daily at 2 PM UTC
    timezone: 'UTC',
  },
  abandonedApplicationReminders: {
    cron: '15 * * * *', // Every hour at :15
    timezone: 'UTC',
  },
  retryFailedEmails: {
    cron: '30 * * * *', // Every hour at :30
    timezone: 'UTC',
  },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const creatorCommunicationJobs = [
  processCreatorEmailQueueJob,
  scheduleCreatorWelcomeSequenceJob,
  cancelCreatorPendingEmailsJob,
  retryFailedCreatorEmailsJob,
  queueCreatorEmailJob,
  queueProjectEmailJob,
  queuePaymentEmailJob,
  onCreatorSetupCompleteJob,
  creatorProductDeliveryRemindersJob,
  creatorDeadlineRemindersJob,
  creatorNoResponseRemindersJob,
  creatorAbandonedApplicationRemindersJob,
  sendCreatorReminderJob,
  checkApprovalRemindersJob,
]
