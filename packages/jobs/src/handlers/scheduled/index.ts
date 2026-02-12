/**
 * Scheduled Job Handlers Index
 *
 * Exports all scheduled job handlers for Phase 5E.
 *
 * Categories:
 * - System Monitoring (health checks)
 * - Digests & Notifications
 * - Alerts & Automation
 * - Subscriptions & Billing
 * - Video & Media Processing
 * - Webhook Queue Processing
 * - SMS Queue
 * - Additional Tasks (BRI, DAM, e-sign, etc.)
 *
 * @ai-pattern scheduled-jobs
 * @ai-critical All jobs require tenantId for isolation
 */

// ============================================================
// HEALTH CHECKS
// ============================================================

export {
  opsHealthCheckCriticalJob,
  opsHealthCheckFullJob,
  healthCheckJobs,
  HEALTH_CHECK_SCHEDULES,
  type HealthCheckCriticalPayload,
  type HealthCheckFullPayload,
  type ServiceHealthResult,
  type HealthCheckResult,
} from './health-checks'

// ============================================================
// DIGESTS
// ============================================================

export {
  adminDailyDigestJob,
  atRiskProjectsAlertJob,
  creatorWeeklyDigestJob,
  digestJobs,
  DIGEST_SCHEDULES,
  type AdminDailyDigestPayload,
  type AtRiskProjectsAlertPayload,
  type CreatorWeeklyDigestPayload,
  type DigestMetrics,
  type AtRiskProject,
} from './digests'

// ============================================================
// ALERTS
// ============================================================

export {
  criticalAlertJob,
  systemErrorAlertJob,
  highValueSubmissionAlertJob,
  creatorComplaintAlertJob,
  securityAlertJob,
  apiFailureAlertJob,
  unusualActivityAlertJob,
  milestoneAlertJob,
  alertJobs,
  type CriticalAlertPayload,
  type SystemErrorAlertPayload,
  type HighValueSubmissionAlertPayload,
  type CreatorComplaintAlertPayload,
  type SecurityAlertPayload,
  type ApiFailureAlertPayload,
  type UnusualActivityAlertPayload,
  type MilestoneAlertPayload,
} from './alerts'

// ============================================================
// SUBSCRIPTIONS & BILLING
// ============================================================

export {
  subscriptionDailyBillingJob,
  subscriptionProcessBillingJob,
  subscriptionBatchBillingJob,
  subscriptionRetryFailedJob,
  subscriptionCatchupBillingJob,
  subscriptionShadowValidationJob,
  subscriptionAnalyticsSnapshotJob,
  subscriptionUpcomingReminderJob,
  subscriptionJobs,
  SUBSCRIPTION_SCHEDULES,
  type SubscriptionDailyBillingPayload,
  type SubscriptionProcessBillingPayload,
  type SubscriptionBatchBillingPayload,
  type SubscriptionRetryFailedPayload,
  type SubscriptionCatchupBillingPayload,
  type SubscriptionShadowValidationPayload,
  type SubscriptionAnalyticsSnapshotPayload,
  type SubscriptionUpcomingReminderPayload,
} from './subscriptions'

// ============================================================
// MEDIA PROCESSING
// ============================================================

export {
  creatorFileProcessingJob,
  creatorFileBatchProcessingJob,
  damIngestProjectJob,
  damBulkIngestJob,
  detectAssetFacesJob,
  batchDetectFacesJob,
  scanAllForFacesJob,
  mediaProcessingJobs,
  MEDIA_PROCESSING_SCHEDULES,
  type CreatorFileProcessingPayload,
  type CreatorFileBatchProcessingPayload,
  type DamIngestProjectPayload,
  type DamBulkIngestPayload,
  type DetectAssetFacesPayload,
  type BatchDetectFacesPayload,
  type ScanAllForFacesPayload,
} from './media-processing'

// ============================================================
// WEBHOOK QUEUE
// ============================================================

export {
  processWebhookQueueJob,
  processSingleWebhookJob,
  webhookQueueCleanupJob,
  webhookQueueHealthCheckJob,
  webhookQueueJobs,
  WEBHOOK_QUEUE_SCHEDULES,
  type ProcessWebhookQueuePayload,
  type ProcessSingleWebhookPayload,
  type WebhookQueueCleanupPayload,
  type WebhookQueueHealthCheckPayload,
} from './webhook-queue'

// ============================================================
// SMS QUEUE
// ============================================================

export {
  sendSmsJob,
  sendBulkSmsJob,
  retryDeadLetterSmsJob,
  smsQueueJobs,
  SMS_QUEUE_SCHEDULES,
  type SendSmsPayload,
  type SendBulkSmsPayload,
  type RetryDeadLetterSmsPayload,
} from './sms-queue'

// ============================================================
// ADDITIONAL TASKS
// ============================================================

export {
  // BRI Jobs
  briGmailSyncJob,
  briSlackSyncJob,
  briMeetingSyncJob,
  briDataProcessJob,
  briJobs,
  // DAM Jobs
  damRightsExpiryCheckJob,
  damMuxBackfillJob,
  damJobs,
  // E-Sign Jobs
  esignReminderJob,
  esignExpiryCheckJob,
  esignJobs,
  // Escalation Jobs
  escalationCheckJob,
  escalationJobs,
  // Gift Card Jobs
  giftCardEmailJob,
  giftCardExpiryNotifyJob,
  giftCardJobs,
  // Commission Jobs
  commissionMaturationCheckJob,
  commissionJobs,
  // Onboarding Jobs
  onboardingCheckJob,
  onboardingJobs,
  // Project Jobs
  projectAutomationJob,
  projectJobs,
  // Report Jobs
  scheduledReportJob,
  reportJobs,
  // Integration Jobs
  stripeTokenRefreshJob,
  klaviyoSyncJob,
  googleDriveSyncJob,
  integrationJobs,
  // Compliance Jobs
  w9ReminderJob,
  complianceJobs,
  // Agent Jobs
  agentMemoryDecayJob,
  agentContextPruneJob,
  agentJobs,
  // Brand Context Jobs
  brandContextRefreshJob,
  brandContextCleanupJob,
  brandStalenessCheckJob,
  brandUrlSyncJob,
  brandContextJobs,
  // All additional jobs
  additionalJobs,
  ADDITIONAL_TASK_SCHEDULES,
  // Types
  type BriGmailSyncPayload,
  type BriSlackSyncPayload,
  type BriMeetingSyncPayload,
  type BriDataProcessPayload,
  type DamRightsExpiryCheckPayload,
  type DamMuxBackfillPayload,
  type EsignReminderPayload,
  type EsignExpiryCheckPayload,
  type EscalationCheckPayload,
  type GiftCardEmailPayload,
  type GiftCardExpiryNotifyPayload,
  type CommissionMaturationCheckPayload,
  type OnboardingCheckPayload,
  type ProjectAutomationPayload,
  type ScheduledReportPayload,
  type StripeTokenRefreshPayload,
  type KlaviyoSyncPayload,
  type GoogleDriveSyncPayload,
  type W9ReminderPayload,
  type AgentMemoryDecayPayload,
  type AgentContextPrunePayload,
  type BrandContextRefreshPayload,
  type BrandContextCleanupPayload,
  type BrandStalenessCheckPayload,
  type BrandUrlSyncPayload,
} from './additional-tasks'

// ============================================================
// ALL SCHEDULED JOBS
// ============================================================

import { healthCheckJobs } from './health-checks'
import { digestJobs } from './digests'
import { alertJobs } from './alerts'
import { subscriptionJobs } from './subscriptions'
import { mediaProcessingJobs } from './media-processing'
import { webhookQueueJobs } from './webhook-queue'
import { smsQueueJobs } from './sms-queue'
import { additionalJobs } from './additional-tasks'

/**
 * All scheduled jobs combined
 */
export const allScheduledJobs = [
  ...healthCheckJobs,
  ...digestJobs,
  ...alertJobs,
  ...subscriptionJobs,
  ...mediaProcessingJobs,
  ...webhookQueueJobs,
  ...smsQueueJobs,
  ...additionalJobs,
]

/**
 * Total count of scheduled jobs
 */
export const SCHEDULED_JOB_COUNT = allScheduledJobs.length

// ============================================================
// ALL SCHEDULES
// ============================================================

import { HEALTH_CHECK_SCHEDULES } from './health-checks'
import { DIGEST_SCHEDULES } from './digests'
import { SUBSCRIPTION_SCHEDULES } from './subscriptions'
import { MEDIA_PROCESSING_SCHEDULES } from './media-processing'
import { WEBHOOK_QUEUE_SCHEDULES } from './webhook-queue'
import { SMS_QUEUE_SCHEDULES } from './sms-queue'
import { ADDITIONAL_TASK_SCHEDULES } from './additional-tasks'

/**
 * All cron schedules combined
 */
export const ALL_SCHEDULES = {
  ...HEALTH_CHECK_SCHEDULES,
  ...DIGEST_SCHEDULES,
  ...SUBSCRIPTION_SCHEDULES,
  ...MEDIA_PROCESSING_SCHEDULES,
  ...WEBHOOK_QUEUE_SCHEDULES,
  ...SMS_QUEUE_SCHEDULES,
  ...ADDITIONAL_TASK_SCHEDULES,
} as const
