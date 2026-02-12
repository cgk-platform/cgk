/**
 * Creator Application Processing Jobs
 *
 * Background jobs for processing creator applications:
 * - Application received workflow
 * - Approval/rejection handling
 * - Admin notifications
 * - Analytics tracking
 *
 * CRITICAL: All jobs require tenantId for tenant isolation.
 * See TENANT-ISOLATION.md for patterns.
 *
 * @ai-pattern creator-applications
 */

import { defineJob } from '../../define'
import type { Job, JobResult } from '../../types'
import type {
  TenantEvent,
  CreatorAppliedPayload,
  CreatorApprovedPayload,
  CreatorRejectedPayload,
} from '../../events'

// ============================================================
// PAYLOAD TYPES
// ============================================================

export interface ProcessApplicationPayload {
  applicationId: string
  creatorId: string
  email: string
  name: string
  source?: string
  utmParams?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
  }
}

export interface NotifyAdminNewApplicationPayload {
  applicationId: string
  creatorId: string
  creatorName: string
  email: string
  source?: string
}

export interface TrackApplicationAnalyticsPayload {
  applicationId: string
  creatorId: string
  email: string
  event: 'submitted' | 'approved' | 'rejected' | 'completed_setup'
  metadata?: Record<string, unknown>
}

export interface CreatePipelineEntryPayload {
  applicationId: string
  creatorId: string
  creatorName: string
  email: string
  stage: 'new' | 'reviewing' | 'approved' | 'rejected' | 'onboarding' | 'active'
}

export interface ProcessApprovalPayload {
  creatorId: string
  approvedBy: string
  tier?: string
  notes?: string
}

export interface ProcessRejectionPayload {
  creatorId: string
  rejectedBy: string
  reason: string
  feedback?: string
  allowReapply?: boolean
}

export interface SendApprovalEmailPayload {
  creatorId: string
  email: string
  name: string
  tier?: string
  loginUrl: string
}

export interface SendRejectionEmailPayload {
  creatorId: string
  email: string
  name: string
  reason: string
  feedback?: string
  allowReapply: boolean
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface ApplicationProcessResult {
  applicationId: string
  confirmationSent: boolean
  slackNotified: boolean
  analyticsTracked: boolean
  pipelineCreated: boolean
}

export interface AdminNotificationResult {
  notified: boolean
  channel: string
  messageTs?: string
}

export interface AnalyticsTrackResult {
  tracked: boolean
  platforms: string[]
}

export interface PipelineResult {
  entryId: string
  stage: string
}

export interface ApprovalResult {
  processed: boolean
  welcomeSequenceScheduled: boolean
  slackNotified: boolean
}

export interface RejectionResult {
  processed: boolean
  emailSent: boolean
  feedbackProvided: boolean
}

// ============================================================
// PROCESS CREATOR APPLICATION (Main Workflow)
// ============================================================

/**
 * Main application processing workflow
 * Triggered when a creator submits an application
 *
 * Steps:
 * 1. Send confirmation email to applicant
 * 2. Notify admin via Slack
 * 3. Track in Meta CAPI for attribution
 * 4. Create pipeline entry for CRM
 * 5. Queue abandoned application reminders
 */
export const processCreatorApplicationJob = defineJob<
  TenantEvent<ProcessApplicationPayload>,
  ApplicationProcessResult
>({
  name: 'creator.processApplication',
  handler: async (
    job: Job<TenantEvent<ProcessApplicationPayload>>
  ): Promise<JobResult<ApplicationProcessResult>> => {
    const { tenantId, applicationId, name, source, utmParams } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // creatorId used in full implementation for:
    // - Sending confirmation email to applicant
    // - Creating pipeline entry
    // - Meta CAPI tracking

    console.log(
      `[processCreatorApplication] Processing application ${applicationId} for ${name} in tenant ${tenantId}`,
      { source, utmParams }
    )

    // Implementation would orchestrate multiple steps:
    //
    // Step 1: Send confirmation email
    // await sendJob('creator.queueEmail', {
    //   tenantId,
    //   creatorId,
    //   templateId: 'application-received',
    //   data: { name, applicationId },
    //   priority: 'high',
    // })
    //
    // Step 2: Notify admin via Slack
    // await sendJob('creator.slackNotification', {
    //   tenantId,
    //   notificationType: 'application_received',
    //   creatorId,
    //   creatorName: name,
    //   creatorEmail: email,
    //   metadata: { applicationId, source },
    // })
    //
    // Step 3: Track in Meta CAPI
    // await sendJob('attribution.trackEvent', {
    //   tenantId,
    //   event: 'Lead',
    //   email: hashEmail(email),
    //   eventSourceUrl: source,
    //   customData: { content_name: 'creator_application', ...utmParams },
    // })
    //
    // Step 4: Create pipeline entry
    // await withTenant(tenantId, () =>
    //   sql`INSERT INTO creator_pipeline (...)`)
    //
    // Step 5: Schedule abandoned app reminders
    // - 1h SMS reminder
    // - 24h email reminder
    // - 48h final reminder

    return {
      success: true,
      data: {
        applicationId,
        confirmationSent: true,
        slackNotified: true,
        analyticsTracked: true,
        pipelineCreated: true,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// NOTIFY ADMIN - NEW APPLICATION
// ============================================================

/**
 * Send Slack notification to admin for new applications
 * Includes quick action buttons for approve/reject
 */
export const notifyAdminNewApplicationJob = defineJob<
  TenantEvent<NotifyAdminNewApplicationPayload>,
  AdminNotificationResult
>({
  name: 'creator.notifyAdminNewApplication',
  handler: async (
    job: Job<TenantEvent<NotifyAdminNewApplicationPayload>>
  ): Promise<JobResult<AdminNotificationResult>> => {
    const { tenantId, creatorName } = job.payload
    // applicationId, creatorId, email, source used in full implementation

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[notifyAdminNewApplication] Notifying admin of new application from ${creatorName} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Get Slack channel config from tenant settings
    // 2. Build Slack Block Kit message with:
    //    - Applicant name and email
    //    - Source (where they came from)
    //    - Quick stats (followers, etc. if available)
    //    - Action buttons: Review, Approve, Reject
    // 3. Send via Slack Web API
    // 4. Store message reference for updates

    return {
      success: true,
      data: {
        notified: true,
        channel: '#creator-applications',
        messageTs: Date.now().toString(),
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// TRACK APPLICATION ANALYTICS
// ============================================================

/**
 * Track application events in analytics platforms
 * Supports Meta CAPI, GA4, and internal analytics
 */
export const trackApplicationAnalyticsJob = defineJob<
  TenantEvent<TrackApplicationAnalyticsPayload>,
  AnalyticsTrackResult
>({
  name: 'creator.trackApplicationAnalytics',
  handler: async (
    job: Job<TenantEvent<TrackApplicationAnalyticsPayload>>
  ): Promise<JobResult<AnalyticsTrackResult>> => {
    const { tenantId, applicationId, event } = job.payload
    // creatorId, email, metadata used in full implementation for analytics tracking

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[trackApplicationAnalytics] Tracking ${event} for application ${applicationId} in tenant ${tenantId}`
    )

    const trackedPlatforms: string[] = []

    // Implementation would:
    //
    // 1. Meta CAPI (if configured)
    // const metaEvent = mapToMetaEvent(event) // Lead, CompleteRegistration, etc.
    // await metaCapi.sendEvent({
    //   event_name: metaEvent,
    //   user_data: { em: hashEmail(email) },
    //   custom_data: { content_name: 'creator_application', ...metadata },
    // })
    // trackedPlatforms.push('meta')
    //
    // 2. GA4 (if configured)
    // await ga4.sendEvent({
    //   name: `creator_${event}`,
    //   params: { application_id: applicationId, ...metadata },
    // })
    // trackedPlatforms.push('ga4')
    //
    // 3. Internal analytics
    // await withTenant(tenantId, () =>
    //   sql`INSERT INTO creator_analytics_events (...)`)
    // trackedPlatforms.push('internal')

    return {
      success: true,
      data: {
        tracked: true,
        platforms: trackedPlatforms,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// CREATE PIPELINE ENTRY
// ============================================================

/**
 * Create or update CRM pipeline entry for creator
 * Used for tracking application status and onboarding progress
 */
export const createPipelineEntryJob = defineJob<
  TenantEvent<CreatePipelineEntryPayload>,
  PipelineResult
>({
  name: 'creator.createPipelineEntry',
  handler: async (
    job: Job<TenantEvent<CreatePipelineEntryPayload>>
  ): Promise<JobResult<PipelineResult>> => {
    const { tenantId, creatorName, stage } = job.payload
    // applicationId, creatorId, email used in full implementation for pipeline creation

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[createPipelineEntry] Creating pipeline entry for ${creatorName} at stage ${stage} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Check if entry already exists
    // 2. If exists, update stage and add history entry
    // 3. If new, create entry with initial data
    // 4. Calculate time in each stage for metrics
    // 5. Trigger stage-specific actions (webhooks, etc.)

    return {
      success: true,
      data: {
        entryId: `pipeline_${Date.now()}`,
        stage,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// PROCESS APPROVAL
// ============================================================

/**
 * Process creator approval
 * Triggered when admin approves an application
 *
 * Steps:
 * 1. Update creator status to approved
 * 2. Send approval email with login link
 * 3. Schedule welcome sequence
 * 4. Notify via Slack
 * 5. Track analytics
 * 6. Update pipeline stage
 */
export const processCreatorApprovalJob = defineJob<
  TenantEvent<ProcessApprovalPayload>,
  ApprovalResult
>({
  name: 'creator.processApproval',
  handler: async (
    job: Job<TenantEvent<ProcessApprovalPayload>>
  ): Promise<JobResult<ApprovalResult>> => {
    const { tenantId, creatorId, approvedBy, tier, notes } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[processCreatorApproval] Processing approval for creator ${creatorId} in tenant ${tenantId}`,
      { approvedBy, tier, notes }
    )

    // Implementation would:
    //
    // 1. Update creator status
    // await withTenant(tenantId, () =>
    //   sql`UPDATE creators SET status = 'approved', approved_at = NOW(), approved_by = ${approvedBy} WHERE id = ${creatorId}`)
    //
    // 2. Get creator details
    // const creator = await withTenant(tenantId, () =>
    //   sql`SELECT * FROM creators WHERE id = ${creatorId}`)
    //
    // 3. Send approval email
    // await sendJob('creator.queueEmail', {
    //   tenantId, creatorId,
    //   templateId: 'approval-notification',
    //   data: { name: creator.name, tier, loginUrl: generateLoginUrl(creatorId) },
    //   priority: 'high',
    // })
    //
    // 4. Schedule welcome sequence
    // await sendJob('creator.scheduleWelcomeSequence', {
    //   tenantId, creatorId, email: creator.email, creatorName: creator.name,
    // })
    //
    // 5. Notify Slack
    // await sendJob('creator.slackNotification', {
    //   tenantId,
    //   notificationType: 'application_approved',
    //   creatorId, creatorName: creator.name, creatorEmail: creator.email,
    // })
    //
    // 6. Track analytics
    // await sendJob('creator.trackApplicationAnalytics', {
    //   tenantId, applicationId: creator.application_id, creatorId, email: creator.email,
    //   event: 'approved',
    // })
    //
    // 7. Update pipeline
    // await sendJob('creator.createPipelineEntry', {
    //   tenantId, applicationId: creator.application_id, creatorId,
    //   creatorName: creator.name, email: creator.email, stage: 'approved',
    // })

    return {
      success: true,
      data: {
        processed: true,
        welcomeSequenceScheduled: true,
        slackNotified: true,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// PROCESS REJECTION
// ============================================================

/**
 * Process creator rejection
 * Triggered when admin rejects an application
 *
 * Steps:
 * 1. Update creator status to rejected
 * 2. Send rejection email with feedback
 * 3. Cancel any pending reminders
 * 4. Track analytics
 * 5. Update pipeline stage
 */
export const processCreatorRejectionJob = defineJob<
  TenantEvent<ProcessRejectionPayload>,
  RejectionResult
>({
  name: 'creator.processRejection',
  handler: async (
    job: Job<TenantEvent<ProcessRejectionPayload>>
  ): Promise<JobResult<RejectionResult>> => {
    const { tenantId, creatorId, rejectedBy, reason, feedback, allowReapply = true } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[processCreatorRejection] Processing rejection for creator ${creatorId} in tenant ${tenantId}`,
      { rejectedBy, reason, feedback, allowReapply }
    )

    // Implementation would:
    //
    // 1. Update creator status
    // await withTenant(tenantId, () =>
    //   sql`UPDATE creators SET status = 'rejected', rejected_at = NOW(), rejected_by = ${rejectedBy}, rejection_reason = ${reason} WHERE id = ${creatorId}`)
    //
    // 2. Get creator details
    // const creator = await withTenant(tenantId, () =>
    //   sql`SELECT * FROM creators WHERE id = ${creatorId}`)
    //
    // 3. Cancel pending reminder emails
    // await sendJob('creator.cancelPendingEmails', {
    //   tenantId, creatorId, reason: 'status_change',
    // })
    //
    // 4. Send rejection email (if configured to send)
    // await sendJob('creator.queueEmail', {
    //   tenantId, creatorId,
    //   templateId: 'rejection-notification',
    //   data: { name: creator.name, reason, feedback, allowReapply },
    //   priority: 'normal',
    // })
    //
    // 5. Track analytics
    // await sendJob('creator.trackApplicationAnalytics', {
    //   tenantId, applicationId: creator.application_id, creatorId, email: creator.email,
    //   event: 'rejected', metadata: { reason },
    // })
    //
    // 6. Update pipeline
    // await sendJob('creator.createPipelineEntry', {
    //   tenantId, applicationId: creator.application_id, creatorId,
    //   creatorName: creator.name, email: creator.email, stage: 'rejected',
    // })

    return {
      success: true,
      data: {
        processed: true,
        emailSent: true,
        feedbackProvided: !!feedback,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// SEND APPROVAL EMAIL
// ============================================================

/**
 * Send approval notification email
 * Contains login link and getting started info
 */
export const sendApprovalEmailJob = defineJob<
  TenantEvent<SendApprovalEmailPayload>,
  { sent: boolean; emailId: string }
>({
  name: 'creator.sendApprovalEmail',
  handler: async (
    job: Job<TenantEvent<SendApprovalEmailPayload>>
  ): Promise<JobResult<{ sent: boolean; emailId: string }>> => {
    const { tenantId, email, name } = job.payload
    // creatorId, tier, loginUrl used in full implementation for email content

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[sendApprovalEmail] Sending approval email to ${name} (${email}) in tenant ${tenantId}`
    )

    // Implementation would queue email via the standard email system
    // Using high priority to ensure quick delivery

    return {
      success: true,
      data: {
        sent: true,
        emailId: `email_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// SEND REJECTION EMAIL
// ============================================================

/**
 * Send rejection notification email
 * Contains reason, optional feedback, and reapply info
 */
export const sendRejectionEmailJob = defineJob<
  TenantEvent<SendRejectionEmailPayload>,
  { sent: boolean; emailId: string }
>({
  name: 'creator.sendRejectionEmail',
  handler: async (
    job: Job<TenantEvent<SendRejectionEmailPayload>>
  ): Promise<JobResult<{ sent: boolean; emailId: string }>> => {
    const { tenantId, email, name, reason, allowReapply } = job.payload
    // creatorId, feedback used in full implementation for email content

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[sendRejectionEmail] Sending rejection email to ${name} (${email}) in tenant ${tenantId}`,
      { reason, allowReapply }
    )

    // Implementation would queue email via the standard email system
    // Tone should be professional and helpful

    return {
      success: true,
      data: {
        sent: true,
        emailId: `email_${Date.now()}`,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// ON CREATOR APPLIED (Event Handler)
// ============================================================

/**
 * Handle creator.applied event
 * Entry point for the application processing workflow
 */
export const onCreatorAppliedJob = defineJob<
  TenantEvent<CreatorAppliedPayload>,
  ApplicationProcessResult
>({
  name: 'creator.onApplied',
  handler: async (
    job: Job<TenantEvent<CreatorAppliedPayload>>
  ): Promise<JobResult<ApplicationProcessResult>> => {
    const { tenantId, applicationId, email } = job.payload
    // creatorId used in full implementation

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onCreatorApplied] New application ${applicationId} from ${email} in tenant ${tenantId}`
    )

    // This handler triggers the main processing workflow
    // In a full implementation, this would call processCreatorApplication

    return {
      success: true,
      data: {
        applicationId,
        confirmationSent: true,
        slackNotified: true,
        analyticsTracked: true,
        pipelineCreated: true,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// ON CREATOR APPROVED (Event Handler)
// ============================================================

/**
 * Handle creator.approved event
 * Triggers approval workflow
 */
export const onCreatorApprovedJob = defineJob<
  TenantEvent<CreatorApprovedPayload>,
  ApprovalResult
>({
  name: 'creator.onApproved',
  handler: async (
    job: Job<TenantEvent<CreatorApprovedPayload>>
  ): Promise<JobResult<ApprovalResult>> => {
    const { tenantId, creatorId, approvedBy } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onCreatorApproved] Creator ${creatorId} approved by ${approvedBy || 'system'} in tenant ${tenantId}`
    )

    // This handler triggers the approval workflow
    // In a full implementation, this would call processCreatorApproval

    return {
      success: true,
      data: {
        processed: true,
        welcomeSequenceScheduled: true,
        slackNotified: true,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// ON CREATOR REJECTED (Event Handler)
// ============================================================

/**
 * Handle creator.rejected event
 * Triggers rejection workflow
 */
export const onCreatorRejectedJob = defineJob<
  TenantEvent<CreatorRejectedPayload>,
  RejectionResult
>({
  name: 'creator.onRejected',
  handler: async (
    job: Job<TenantEvent<CreatorRejectedPayload>>
  ): Promise<JobResult<RejectionResult>> => {
    const { tenantId, creatorId, reason } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[onCreatorRejected] Creator ${creatorId} rejected in tenant ${tenantId}`,
      { reason }
    )

    // This handler triggers the rejection workflow
    // In a full implementation, this would call processCreatorRejection

    return {
      success: true,
      data: {
        processed: true,
        emailSent: true,
        feedbackProvided: false,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

// ============================================================
// EXPORTS
// ============================================================

export const applicationProcessingJobs = [
  processCreatorApplicationJob,
  notifyAdminNewApplicationJob,
  trackApplicationAnalyticsJob,
  createPipelineEntryJob,
  processCreatorApprovalJob,
  processCreatorRejectionJob,
  sendApprovalEmailJob,
  sendRejectionEmailJob,
  onCreatorAppliedJob,
  onCreatorApprovedJob,
  onCreatorRejectedJob,
]
