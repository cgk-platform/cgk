/**
 * @cgk-platform/jobs - Background Job Infrastructure
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
 * import { sendJob } from '@cgk-platform/jobs'
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
 * import { createJobClient } from '@cgk-platform/jobs'
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
  BrandContextCleanupPayload as BrandContextCleanupEventPayload,
  // Google Feed
  GoogleFeedSyncPayload,
  GoogleFeedProductUpdatePayload,
  GoogleFeedImageOptimizePayload,
  // Webhooks
  WebhookRetryPayload,
  WebhookHealthCheckPayload,
  WebhookCleanupPayload,
  // Recovery
  RecoveryEmailScheduledPayload,
  RecoveryEmailSentPayload,
  RecoveryCheckAbandonedPayload,
  RecoveryProcessQueuePayload,
  RecoveryExpireOldPayload,
  RecoveryCheckoutUpdatedPayload,
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

// Recovery Jobs
export {
  processRecoveryEmailJob,
  checkAbandonedCheckoutsJob,
  processRecoveryQueueJob,
  expireOldCheckoutsJob,
  recoveryJobs,
  RECOVERY_SCHEDULES,
} from './handlers/recovery'

// ============================================================
// Commerce Handler Exports (Phase 5B)
// ============================================================

// Commerce - All Jobs (recommended for bulk registration)
export {
  commerceJobs,
  COMMERCE_JOB_COUNT,
  COMMERCE_SCHEDULES,
} from './handlers/commerce'

// Commerce - Order Sync Jobs
export {
  syncOrderJob,
  syncOrderBatchJob,
  orderReconciliationJob,
  orderAttributionJob,
  orderCommissionJob,
  orderReviewEmailJob,
  handleOrderCreatedJob,
  handleOrderFulfilledJob,
  orderSyncJobs,
  ORDER_SYNC_SCHEDULES,
  type SyncOrderPayload,
  type SyncOrderBatchPayload,
  type OrderReconciliationPayload,
  type OrderAttributionPayload,
  type OrderCommissionPayload,
  type OrderReviewEmailPayload,
} from './handlers/commerce'

// Commerce - Review Email Jobs
export {
  processReviewEmailQueueJob,
  reviewEmailAwaitingDeliveryJob,
  retryFailedReviewEmailsJob,
  sendQueuedReviewEmailJob,
  scheduleFollowUpJob,
  handleReviewEmailQueuedJob,
  handleReviewEmailSentJob,
  reviewEmailStatsJob,
  reviewEmailJobs,
  REVIEW_EMAIL_SCHEDULES,
  type ProcessReviewEmailQueuePayload,
  type ReviewEmailAwaitingDeliveryPayload,
  type RetryFailedReviewEmailsPayload,
  type SendQueuedReviewEmailPayload,
  type ScheduleFollowUpPayload,
  type ReviewEmailStatsPayload,
} from './handlers/commerce'

// Commerce - A/B Testing Jobs
export {
  abHourlyMetricsAggregationJob,
  abNightlyReconciliationJob,
  abAggregateTestMetricsJob,
  abSyncRedisToPostgresJob,
  abDailyMetricsSummaryJob,
  abOptimizationSummaryJob,
  abOptimizationJob,
  abOptimizeTestJob,
  abOrderReconciliationJob,
  abOrderReconciliationManualJob,
  abTestSchedulerJob,
  handleABTestCreatedJob,
  handleABTestStartedJob,
  handleABTestEndedJob,
  abTestingJobs,
  AB_TESTING_SCHEDULES,
  type ABHourlyMetricsAggregationPayload,
  type ABNightlyReconciliationPayload,
  type ABSyncRedisToPostgresPayload,
  type ABDailyMetricsSummaryPayload,
  type ABOptimizationPayload,
  type ABOptimizeTestPayload,
  type ABOptimizationSummaryPayload,
  type ABOrderReconciliationPayload,
  type ABOrderReconciliationManualPayload,
  type ABTestSchedulerPayload,
  type ABAggregateTestMetricsPayload,
} from './handlers/commerce'

// Commerce - Product & Customer Sync Jobs
export {
  productSyncJob,
  productBatchSyncJob,
  handleProductSyncJob,
  customerSyncJob,
  customerBatchSyncJob,
  handleCustomerCreatedJob,
  handleCustomerUpdatedJob,
  inventoryUpdateJob,
  inventoryBatchSyncJob,
  handleInventorySyncJob,
  collectionSyncJob,
  collectionProductsSyncJob,
  productCustomerSyncJobs,
  PRODUCT_CUSTOMER_SCHEDULES,
  type ProductSyncFromShopifyPayload,
  type ProductBatchSyncPayload,
  type CustomerSyncFromShopifyPayload,
  type CustomerBatchSyncPayload,
  type InventoryUpdatePayload,
  type InventoryBatchSyncPayload,
  type CollectionSyncPayload,
  type CollectionProductsSyncPayload,
} from './handlers/commerce'

// ============================================================
// Analytics Handler Exports (Phase 5D)
// ============================================================

// Analytics - All Jobs (recommended for bulk registration)
export {
  analyticsJobs,
  ANALYTICS_JOB_COUNT,
  ANALYTICS_SCHEDULES,
} from './handlers/analytics'

// Analytics - Attribution Jobs
export {
  processAttributionJob,
  attributionDailyMetricsJob,
  attributionExportSchedulerJob,
  attributionFairingBridgeJob,
  attributionOrderReconciliationJob,
  attributionOrderReconciliationManualJob,
  attributionRecalculateRecentJob,
  syncTikTokSpendDailyJob,
  attributionVTASyncJob,
  attributionProcessUnattributedJob,
  attributionWebhookQueueJob,
  attributionJobs,
} from './handlers/analytics'

// Analytics - Metrics Aggregation Jobs
export {
  aggregateDailyMetricsJob,
  hourlyMetricsRollupJob,
  weeklyMetricsSummaryJob,
  metricsJobs,
} from './handlers/analytics'

// Analytics - Ad Platform Jobs
export {
  sendGA4PurchaseJob,
  sendMetaPurchaseJob,
  sendTikTokEventJob,
  syncGoogleAdsSpendJob,
  syncMetaAdsSpendJob,
  adPlatformJobs,
} from './handlers/analytics'

// Analytics - ML Training Jobs
export {
  attributionMLTrainingJob,
  mlTrainingJobs,
} from './handlers/analytics'

// Analytics Types
export type {
  // Attribution types
  AttributionModel,
  AttributionResult,
  Touchpoint,
  Conversion,
  // Attribution job payloads
  ProcessAttributionPayload,
  AttributionDailyMetricsPayload,
  AttributionExportSchedulerPayload,
  AttributionFairingBridgePayload,
  AttributionMLTrainingPayload,
  AttributionOrderReconciliationPayload,
  AttributionRecalculateRecentPayload,
  SyncTikTokSpendPayload,
  AttributionVTASyncPayload,
  AttributionProcessUnattributedPayload,
  AttributionWebhookQueuePayload,
  // Metrics job payloads
  AggregateDailyMetricsPayload,
  HourlyMetricsRollupPayload,
  WeeklyMetricsSummaryPayload,
  // Ad platform payloads
  SendGA4PurchasePayload,
  SendMetaPurchasePayload,
  SendTikTokEventPayload,
  SyncGoogleAdsSpendPayload,
  SyncMetaAdsSpendPayload,
} from './handlers/analytics'

// ============================================================
// Creator Handler Exports (Phase 5C)
// ============================================================

// Creator - All Jobs (recommended for bulk registration)
export {
  allCreatorJobs,
  CREATOR_JOB_COUNTS,
  ALL_CREATOR_SCHEDULES,
} from './handlers/creators'

// Creator - Payout Processing Jobs
export {
  onPaymentAvailableJob,
  onPayoutInitiatedJob,
  onPayoutCompleteJob,
  onPayoutFailedJob,
  monthlyPaymentSummaryJob,
  checkPaymentsBecomeAvailableJob,
  processInternationalPayoutJob,
  checkPendingInternationalPayoutsJob,
  processDomesticPayoutJob,
  checkPendingDomesticPayoutsJob,
  onTopupSucceededJob,
  dailyExpenseSyncJob,
  monthlyPLSnapshotJob,
  onCommissionMaturedJob,
  payoutProcessingJobs,
  PAYOUT_SCHEDULES,
  type PayoutInitiatedPayload,
  type MonthlyPaymentSummaryPayload,
  type CheckPaymentsAvailablePayload,
  type InternationalPayoutPayload,
  type DomesticPayoutPayload,
  type CheckPendingPayoutsPayload,
  type TopupSucceededPayload,
  type MonthlyPLSnapshotPayload,
} from './handlers/creators'

// Creator - Communication Jobs
export {
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
  checkApprovalRemindersJob as checkApprovalRemindersJobV2,
  creatorCommunicationJobs,
  COMMUNICATION_SCHEDULES,
  type ProcessCreatorEmailQueuePayload,
  type ScheduleWelcomeSequencePayload,
  type CancelPendingEmailsPayload,
  type RetryFailedEmailsPayload,
  type QueueCreatorEmailPayload,
  type QueueProjectEmailPayload,
  type QueuePaymentEmailPayload,
  type ProductDeliveryRemindersPayload,
  type DeadlineRemindersPayload,
  type NoResponseRemindersPayload,
  type AbandonedApplicationRemindersPayload,
  type SendCreatorReminderPayload,
  type ApprovalRemindersPayload,
} from './handlers/creators'

// Creator - Application Processing Jobs
export {
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
  applicationProcessingJobs,
  type ProcessApplicationPayload,
  type NotifyAdminNewApplicationPayload,
  type TrackApplicationAnalyticsPayload,
  type CreatePipelineEntryPayload,
  type ProcessApprovalPayload,
  type ProcessRejectionPayload,
  type SendApprovalEmailPayload,
  type SendRejectionEmailPayload,
} from './handlers/creators'

// Creator - Analytics Aggregation Jobs
export {
  aggregateCreatorDailyMetricsJob,
  generateWeeklyCreatorSummaryJob,
  generateMonthlyCreatorReportJob,
  analyticsAggregationJobs,
  ANALYTICS_AGGREGATION_SCHEDULES,
  type AggregateCreatorDailyMetricsPayload,
  type GenerateWeeklyCreatorSummaryPayload,
  type GenerateMonthlyCreatorReportPayload,
} from './handlers/creators'

// ============================================================
// Scheduled Job Handler Exports (Phase 5E)
// ============================================================

// All scheduled jobs combined
export {
  allScheduledJobs,
  SCHEDULED_JOB_COUNT,
  ALL_SCHEDULES,
} from './handlers/scheduled'

// Health Check Jobs
export {
  opsHealthCheckCriticalJob,
  opsHealthCheckFullJob,
  healthCheckJobs,
  HEALTH_CHECK_SCHEDULES,
  type HealthCheckCriticalPayload,
  type HealthCheckFullPayload,
  type ServiceHealthResult,
  type HealthCheckResult,
} from './handlers/scheduled'

// Digest Jobs
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
} from './handlers/scheduled'

// Alert Jobs
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
} from './handlers/scheduled'

// Subscription & Billing Jobs
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
} from './handlers/scheduled'

// Media Processing Jobs
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
} from './handlers/scheduled'

// Webhook Queue Jobs
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
} from './handlers/scheduled'

// SMS Queue Jobs
export {
  sendSmsJob,
  sendBulkSmsJob,
  retryDeadLetterSmsJob,
  smsQueueJobs,
  SMS_QUEUE_SCHEDULES,
  type SendSmsPayload,
  type SendBulkSmsPayload,
  type RetryDeadLetterSmsPayload,
} from './handlers/scheduled'

// Additional Scheduled Tasks (BRI, DAM, E-Sign, etc.)
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
} from './handlers/scheduled'
