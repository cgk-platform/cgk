/**
 * @cgk/jobs - Background Job Infrastructure
 *
 * Vendor-agnostic background job processing for the CGK platform.
 *
 * Supported providers:
 * - Trigger.dev v4 (recommended)
 * - Inngest
 * - Local (development/testing)
 *
 * @ai-pattern background-jobs
 * @ai-critical All events require tenantId for tenant isolation
 *
 * @example
 * // Send a job
 * import { sendJob } from '@cgk/jobs'
 *
 * await sendJob('order.created', {
 *   tenantId: 'rawdog',  // REQUIRED
 *   orderId: 'order_123',
 *   totalAmount: 9999,
 *   currency: 'USD',
 * })
 *
 * @example
 * // Create a client with specific provider
 * import { createJobClient } from '@cgk/jobs'
 *
 * const client = createJobClient({
 *   provider: 'trigger.dev',
 *   triggerDev: {
 *     secretKey: process.env.TRIGGER_SECRET_KEY,
 *   },
 * })
 *
 * await client.send('order.created', { tenantId, orderId, totalAmount, currency })
 */

// ============================================================
// Provider & Client
// ============================================================

export type {
  JobProvider,
  ProviderConfig,
  JobContext,
  JobHandler,
  JobDefinitionConfig,
  ScheduledJobConfig,
  SendOptions,
  SendResult,
  BatchSendResult,
  WaitResult,
} from './provider'

export { validateTenantId, SCHEDULES } from './provider'

export {
  createJobClient,
  getJobClient,
  sendJob,
  sendJobs,
  resetJobClient,
  setJobClient,
  type JobClient,
  type JobClientConfig,
} from './client'

// ============================================================
// Events
// ============================================================

export type {
  TenantEvent,
  JobEvents,
  ScheduleDefinition,
  // Commerce
  OrderCreatedPayload,
  OrderFulfilledPayload,
  OrderCancelledPayload,
  CustomerCreatedPayload,
  CustomerUpdatedPayload,
  ProductSyncPayload,
  InventorySyncPayload,
  // Reviews
  ReviewSubmittedPayload,
  ReviewEmailQueuedPayload,
  ReviewEmailSentPayload,
  ReviewReminderPayload,
  SurveyResponsePayload,
  SurveyDigestPayload,
  SurveyLowNpsPayload,
  // Creators
  CreatorAppliedPayload,
  CreatorApprovedPayload,
  CreatorRejectedPayload,
  CreatorSetupCompletePayload,
  ProjectCreatedPayload,
  ProjectStatusChangedPayload,
  ProjectDeadlineApproachingPayload,
  CreatorEmailQueuedPayload,
  CreatorReminderPayload,
  CreatorFileUploadedPayload,
  CreatorSlackNotificationPayload,
  CreatorShipmentSyncPayload,
  CreatorApprovalRemindersPayload,
  CreatorWelcomeCallRemindersPayload,
  // Payouts
  PayoutRequestedPayload,
  PayoutProcessingPayload,
  PayoutCompletedPayload,
  PayoutFailedPayload,
  PaymentAvailablePayload,
  TreasuryTopupPayload,
  TreasuryApprovalPayload,
  TreasuryLowBalancePayload,
  ExpenseSyncPayload,
  CommissionMaturedPayload,
  // Attribution
  TouchpointRecordedPayload,
  ConversionAttributedPayload,
  AttributionRecalculatePayload,
  AttributionSyncPayload,
  AttributionExportPayload,
  // A/B Testing
  ABTestCreatedPayload,
  ABTestStartedPayload,
  ABTestEndedPayload,
  ABMetricsAggregatePayload,
  ABOptimizePayload,
  ABOrderReconcilePayload,
  // Video & DAM
  VideoUploadCompletedPayload,
  VideoTranscriptionStartedPayload,
  VideoTranscriptionCompletedPayload,
  VideoAIGeneratedPayload,
  DAMAssetUploadedPayload,
  DAMGDriveSyncPayload,
  DAMRightsExpiryPayload,
  DAMExportPayload,
  DAMFaceDetectionPayload,
  DAMBulkIngestPayload,
  // Subscriptions
  SubscriptionCreatedPayload,
  SubscriptionBillingPayload,
  SubscriptionCancelledPayload,
  SubscriptionRenewalPayload,
  // Notifications
  EmailSendPayload,
  SMSSendPayload,
  SlackNotifyPayload,
  PushNotificationPayload,
  // System
  HealthCheckPayload,
  AlertPayload,
  CleanupPayload,
  SyncRecoveryPayload,
  // Workflows
  WorkflowTriggeredPayload,
  WorkflowActionPayload,
  WorkflowScheduledActionPayload,
  WorkflowTimeElapsedPayload,
  WorkflowCleanupPayload,
  // Brand Context
  BrandDocumentProcessPayload,
  BrandEmbeddingsRefreshPayload,
  BrandContextCleanupPayload,
  // Google Feed
  GoogleFeedSyncPayload,
  GoogleFeedProductUpdatePayload,
  GoogleFeedImageOptimizePayload,
  // Webhooks
  WebhookRetryPayload,
  WebhookHealthCheckPayload,
  WebhookCleanupPayload,
} from './events'

export { EVENT_CATEGORIES, TOTAL_EVENT_COUNT } from './events'

// ============================================================
// Middleware
// ============================================================

export {
  withTenantContext,
  withLogging,
  withTiming,
  withErrorClassification,
  withIdempotency,
  withTimeout,
  withRateLimit,
  composeMiddleware,
  classifyError,
  createRateLimiter,
  createJobHandler,
  type Middleware,
  type ErrorClassification,
  type ClassifiedError,
} from './middleware'

// ============================================================
// Providers
// ============================================================

export {
  createLocalProvider,
  createTriggerDevProvider,
  createInngestProvider,
  defineTriggerTask,
  defineInngestFunction,
} from './providers'

// ============================================================
// Legacy Exports (for backward compatibility)
// ============================================================

// Job definition (legacy)
export { defineJob, type JobDefinition } from './define'
export type { JobHandler as LegacyJobHandler } from './define'

// Job queue (legacy)
export { createJobQueue, type JobQueue, type JobQueueConfig } from './queue'

// Job execution (legacy)
export { processJobs, type JobProcessor, type ProcessorConfig } from './processor'

// Job types (legacy)
export type {
  Job,
  JobStatus,
  JobResult,
  JobError,
  JobOptions,
  RetryConfig,
} from './types'

export { DEFAULT_RETRY_CONFIG } from './types'

// Utilities
export { createJobId, parseJobId, calculateRetryDelay } from './utils'

// ============================================================
// Existing Handler Exports
// ============================================================

// Google Feed Jobs
export {
  googleFeedSyncJob,
  googleFeedProductUpdateJob,
  googleFeedImageOptimizeJob,
  googleFeedScheduledSyncJob,
  type GoogleFeedSyncPayload as LegacyGoogleFeedSyncPayload,
  type GoogleFeedProductUpdatePayload as LegacyGoogleFeedProductUpdatePayload,
  type GoogleFeedImageOptimizePayload as LegacyGoogleFeedImageOptimizePayload,
} from './handlers/google-feed-sync'

// Webhook Jobs
export {
  retryFailedWebhooksJob,
  webhookHealthCheckJob,
  cleanupOldWebhookEventsJob,
  RETRY_SCHEDULE,
  HEALTH_CHECK_SCHEDULE,
  CLEANUP_SCHEDULE,
} from './webhooks'

// Treasury Jobs
export {
  treasurySendApprovalEmailJob,
  treasuryAutoSendApprovedJob,
  treasurySyncTopupStatusesJob,
  treasuryLowBalanceAlertJob,
  TREASURY_SCHEDULES,
  type TreasurySendApprovalEmailPayload,
  type TreasuryAutoSendApprovedPayload,
  type TreasurySyncTopupStatusesPayload,
  type TreasuryLowBalanceAlertPayload,
} from './handlers/treasury'

// Survey Slack Jobs
export {
  surveySlackNotificationJob,
  surveyLowNpsAlertJob,
  surveySlackDigestJob,
  SURVEY_SCHEDULES,
  type SurveySlackNotificationPayload,
  type SurveySlackDigestPayload,
  type SurveyLowNpsAlertPayload,
} from './handlers/survey-slack'

// Survey Processing Jobs
export {
  processSurveyResponseJob,
  syncAttributionJob,
  type ProcessSurveyResponsePayload,
  type SyncAttributionPayload,
} from './handlers/survey-process'

// Workflow Jobs
export {
  processScheduledActionsJob,
  checkTimeElapsedTriggersJob,
  cleanupExecutionLogsJob,
  processSnoozedThreadsJob,
  workflowJobs,
  type ProcessScheduledActionsPayload,
  type CheckTimeElapsedTriggersPayload,
  type CleanupExecutionLogsPayload,
  type ProcessSnoozedThreadsPayload,
} from './handlers/workflow'

// Voice/AI Agent Jobs
export {
  generateCallSummariesJob,
  cleanupOldRecordingsJob,
  syncRetellAgentsJob,
  processVoiceUsageJob,
  voiceJobs,
} from './handlers/voice'

// Video Transcription Jobs
export {
  videoTranscriptionJob,
  aiContentGenerationJob,
  transcriptionSyncJob,
  TRANSCRIPTION_SCHEDULES,
  type VideoTranscriptionPayload,
  type AIContentGenerationPayload,
  type TranscriptionSyncPayload,
} from './handlers/video-transcription'

// Creator Lifecycle Jobs
export {
  checkApprovalRemindersJob,
  checkWelcomeCallRemindersJob,
  sendCreatorSlackNotificationJob,
  syncCreatorShipmentsJob,
  creatorLifecycleJobs,
  CREATOR_LIFECYCLE_SCHEDULES,
} from './handlers/creator-lifecycle'
