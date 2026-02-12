/**
 * Job Event Type Definitions
 *
 * All background job events with TypeScript interfaces.
 * CRITICAL: Every event MUST include tenantId for tenant isolation.
 *
 * Categories:
 * - Commerce: Orders, customers, products, inventory
 * - Reviews: Survey responses, review emails
 * - Creators: Applications, projects, communications
 * - Payouts: Payments, expenses, treasury
 * - Attribution: Analytics, metrics, sync
 * - Video/DAM: Media processing, asset management
 * - Scheduled: Cron-based recurring tasks
 * - System: Health checks, alerts, cleanup
 *
 * @ai-pattern job-events
 * @ai-critical tenantId is REQUIRED in every event payload
 */

/**
 * Base type for all tenant-scoped events
 * MANDATORY: Every event must extend this type
 */
export type TenantEvent<T> = T & {
  /** Tenant identifier - REQUIRED for isolation */
  tenantId: string
}

/**
 * Schedule definition for cron jobs
 */
export interface ScheduleDefinition {
  /** Cron expression */
  cron: string
  /** Timezone (defaults to UTC) */
  timezone?: string
}

// ============================================================
// COMMERCE EVENTS
// ============================================================

export interface OrderCreatedPayload {
  orderId: string
  shopifyOrderId?: string
  customerId?: string
  totalAmount: number
  currency?: string
}

export interface OrderFulfilledPayload {
  orderId: string
  fulfillmentId: string
  trackingNumber?: string
  carrier?: string
}

export interface OrderCancelledPayload {
  orderId: string
  reason?: string
  refundAmount?: number
}

export interface CustomerCreatedPayload {
  customerId: string
  email: string
  shopifyCustomerId?: string
}

export interface CustomerUpdatedPayload {
  customerId: string
  changes: Record<string, unknown>
}

export interface ProductSyncPayload {
  productId?: string
  fullSync?: boolean
}

export interface InventorySyncPayload {
  productId?: string
  variantId?: string
  locationId?: string
}

// ============================================================
// REVIEW EVENTS
// ============================================================

export interface ReviewSubmittedPayload {
  reviewId: string
  orderId?: string
  customerId?: string
  rating: number
}

export interface ReviewEmailQueuedPayload {
  reviewEmailId: string
  orderId: string
  customerId: string
  templateId: string
  scheduledFor?: Date
}

export interface ReviewEmailSentPayload {
  reviewEmailId: string
  messageId?: string
}

export interface ReviewReminderPayload {
  orderId: string
  reminderNumber: number
}

export interface SurveyResponsePayload {
  responseId: string
  surveyId: string
  customerId?: string
  orderId?: string
}

export interface SurveyDigestPayload {
  frequency: 'daily' | 'weekly'
}

export interface SurveyLowNpsPayload {
  responseId: string
  surveyId: string
  npsScore: number
  customerId?: string
}

// ============================================================
// CREATOR EVENTS
// ============================================================

export interface CreatorAppliedPayload {
  creatorId: string
  applicationId: string
  email: string
}

export interface CreatorApprovedPayload {
  creatorId: string
  approvedBy?: string
}

export interface CreatorRejectedPayload {
  creatorId: string
  reason?: string
}

export interface CreatorSetupCompletePayload {
  creatorId: string
}

export interface ProjectCreatedPayload {
  projectId: string
  creatorId: string
  type: string
}

export interface ProjectStatusChangedPayload {
  projectId: string
  oldStatus: string
  newStatus: string
}

export interface ProjectDeadlineApproachingPayload {
  projectId: string
  daysRemaining: number
}

export interface CreatorEmailQueuedPayload {
  emailId: string
  creatorId: string
  templateId: string
  priority?: 'high' | 'normal' | 'low'
}

export interface CreatorReminderPayload {
  creatorId: string
  projectId?: string
  reminderType: 'delivery' | 'deadline' | 'noResponse' | 'abandoned'
}

export interface CreatorFileUploadedPayload {
  fileId: string
  creatorId: string
  projectId: string
  fileType: 'video' | 'image' | 'document'
  fileSize: number
}

export interface CreatorSlackNotificationPayload {
  notificationType:
    | 'application_received'
    | 'application_approved'
    | 'welcome_call_booked'
    | 'escalation'
    | 'product_shipped'
    | 'product_received'
    | 'contract_sent'
    | 'contract_signed'
    | 'content_submitted'
    | 'content_revisions_requested'
  creatorId: string
  creatorName: string
  creatorEmail: string
  metadata?: Record<string, unknown>
}

export interface CreatorShipmentSyncPayload {
  shipmentId?: string
  fullSync?: boolean
}

export interface CreatorApprovalRemindersPayload {
  // Empty - cron job that processes all tenants
}

export interface CreatorWelcomeCallRemindersPayload {
  // Empty - cron job that processes all tenants
}

// ============================================================
// PAYOUT EVENTS
// ============================================================

export interface PayoutRequestedPayload {
  payoutId: string
  creatorId: string
  amount: number
  currency: string
  payoutType: 'domestic' | 'international'
}

export interface PayoutProcessingPayload {
  payoutId: string
  transferId?: string
}

export interface PayoutCompletedPayload {
  payoutId: string
  completedAt: Date
  transactionId?: string
}

export interface PayoutFailedPayload {
  payoutId: string
  reason: string
  retryable: boolean
}

export interface PaymentAvailablePayload {
  creatorId: string
  amount: number
  currency: string
}

export interface TreasuryTopupPayload {
  topupId: string
  amount: number
  currency: string
}

export interface TreasuryApprovalPayload {
  requestId: string
}

export interface TreasuryLowBalancePayload {
  balance: number
  threshold: number
  currency: string
}

export interface ExpenseSyncPayload {
  payoutId?: string
  startDate?: Date
  endDate?: Date
}

export interface CommissionMaturedPayload {
  commissionId: string
  orderId: string
  creatorId: string
  amount: number
}

// ============================================================
// ATTRIBUTION EVENTS
// ============================================================

export interface TouchpointRecordedPayload {
  touchpointId: string
  sessionId: string
  source: string
  medium?: string
  campaign?: string
}

export interface ConversionAttributedPayload {
  orderId: string
  attributionModel: string
  touchpoints: number
}

export interface AttributionRecalculatePayload {
  orderId?: string
  startDate?: Date
  endDate?: Date
  recalculateDays?: number
}

export interface AttributionSyncPayload {
  platform: 'tiktok' | 'meta' | 'google' | 'klaviyo' | 'fairing'
  startDate?: Date
  endDate?: Date
}

export interface AttributionExportPayload {
  exportId: string
  format: 'csv' | 'json'
  filters?: Record<string, unknown>
}

// ============================================================
// A/B TESTING EVENTS
// ============================================================

export interface ABTestCreatedPayload {
  testId: string
  name: string
  variants: number
}

export interface ABTestStartedPayload {
  testId: string
}

export interface ABTestEndedPayload {
  testId: string
  winningVariant?: string
}

export interface ABMetricsAggregatePayload {
  testId?: string
  period: 'hourly' | 'daily' | 'full'
}

export interface ABOptimizePayload {
  testId?: string
  algorithm?: 'mab' | 'thompson'
}

export interface ABOrderReconcilePayload {
  orderId?: string
  startDate?: Date
}

// ============================================================
// VIDEO & DAM EVENTS
// ============================================================

export interface VideoUploadCompletedPayload {
  videoId: string
  projectId: string
  creatorId: string
  duration?: number
  size: number
}

export interface VideoTranscriptionStartedPayload {
  videoId: string
  language?: string
}

export interface VideoTranscriptionCompletedPayload {
  videoId: string
  transcriptUrl?: string
}

export interface VideoAIGeneratedPayload {
  videoId: string
  generationType: 'thumbnail' | 'summary' | 'clips'
}

export interface DAMAssetUploadedPayload {
  assetId: string
  projectId?: string
  assetType: 'image' | 'video' | 'document'
  size: number
}

export interface DAMGDriveSyncPayload {
  folderId?: string
  fullSync?: boolean
}

export interface DAMRightsExpiryPayload {
  assetId?: string
  daysToExpiry?: number
}

export interface DAMExportPayload {
  exportId: string
  assetIds: string[]
  format?: string
}

export interface DAMFaceDetectionPayload {
  assetId: string
}

export interface DAMBulkIngestPayload {
  projectIds?: string[]
  limit?: number
}

// ============================================================
// SUBSCRIPTION EVENTS
// ============================================================

export interface SubscriptionCreatedPayload {
  subscriptionId: string
  customerId: string
  planId: string
}

export interface SubscriptionBillingPayload {
  subscriptionId?: string
  billingDate?: Date
}

export interface SubscriptionCancelledPayload {
  subscriptionId: string
  reason?: string
  effectiveDate?: Date
}

export interface SubscriptionRenewalPayload {
  subscriptionId: string
  nextBillingDate: Date
}

// ============================================================
// NOTIFICATION EVENTS
// ============================================================

export interface EmailSendPayload {
  to: string
  templateId: string
  data: Record<string, unknown>
  priority?: 'high' | 'normal' | 'low'
}

export interface SMSSendPayload {
  to: string
  message: string
  templateId?: string
}

export interface SlackNotifyPayload {
  channel: string
  message: string
  blocks?: unknown[]
}

export interface PushNotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

// ============================================================
// SYSTEM EVENTS
// ============================================================

export interface HealthCheckPayload {
  checkType: 'full' | 'critical'
}

export interface AlertPayload {
  severity: 'critical' | 'error' | 'warning' | 'info'
  title: string
  message: string
  metadata?: Record<string, unknown>
}

export interface CleanupPayload {
  target: 'logs' | 'sessions' | 'cache' | 'temp'
  olderThanDays?: number
}

export interface SyncRecoveryPayload {
  syncType: string
  lastSuccessAt?: Date
}

// ============================================================
// WORKFLOW EVENTS
// ============================================================

export interface WorkflowTriggeredPayload {
  workflowId: string
  triggerId: string
  entityType: string
  entityId: string
}

export interface WorkflowActionPayload {
  executionId: string
  actionId: string
  actionType: string
}

export interface WorkflowScheduledActionPayload {
  batchSize?: number
}

export interface WorkflowTimeElapsedPayload {
  entityType?: string
}

export interface WorkflowCleanupPayload {
  retentionDays?: number
}

// ============================================================
// BRAND CONTEXT EVENTS
// ============================================================

export interface BrandDocumentProcessPayload {
  documentId: string
  documentType: 'pdf' | 'url' | 'text'
}

export interface BrandEmbeddingsRefreshPayload {
  documentId?: string
  chunkLimit?: number
}

export interface BrandContextCleanupPayload {
  maxAgeHours?: number
}

// ============================================================
// GOOGLE FEED EVENTS
// ============================================================

export interface GoogleFeedSyncPayload {
  fullSync?: boolean
  triggeredBy?: 'schedule' | 'manual' | 'webhook'
}

export interface GoogleFeedProductUpdatePayload {
  productId: string
  variantId?: string
  action: 'update' | 'delete'
}

export interface GoogleFeedImageOptimizePayload {
  productId: string
  imageUrl: string
  options?: {
    removeBackground?: boolean
    targetWidth?: number
    targetHeight?: number
    format?: 'jpeg' | 'png' | 'webp'
    quality?: number
  }
}

// ============================================================
// WEBHOOK EVENTS
// ============================================================

export interface WebhookRetryPayload {
  webhookEventId: string
  attempt: number
}

export interface WebhookHealthCheckPayload {
  endpointId?: string
}

export interface WebhookCleanupPayload {
  olderThanDays?: number
}

// ============================================================
// FULL EVENT MAP
// ============================================================

/**
 * Complete map of all job events
 * Used for type-safe event sending and handling
 */
export interface JobEvents {
  // Commerce
  'order.created': TenantEvent<OrderCreatedPayload>
  'order.fulfilled': TenantEvent<OrderFulfilledPayload>
  'order.cancelled': TenantEvent<OrderCancelledPayload>
  'customer.created': TenantEvent<CustomerCreatedPayload>
  'customer.updated': TenantEvent<CustomerUpdatedPayload>
  'product.sync': TenantEvent<ProductSyncPayload>
  'inventory.sync': TenantEvent<InventorySyncPayload>

  // Reviews
  'review.submitted': TenantEvent<ReviewSubmittedPayload>
  'review.email.queued': TenantEvent<ReviewEmailQueuedPayload>
  'review.email.sent': TenantEvent<ReviewEmailSentPayload>
  'review.reminder': TenantEvent<ReviewReminderPayload>
  'survey.response': TenantEvent<SurveyResponsePayload>
  'survey.digest': TenantEvent<SurveyDigestPayload>
  'survey.lowNps': TenantEvent<SurveyLowNpsPayload>

  // Creators
  'creator.applied': TenantEvent<CreatorAppliedPayload>
  'creator.approved': TenantEvent<CreatorApprovedPayload>
  'creator.rejected': TenantEvent<CreatorRejectedPayload>
  'creator.setupComplete': TenantEvent<CreatorSetupCompletePayload>
  'creator.email.queued': TenantEvent<CreatorEmailQueuedPayload>
  'creator.reminder': TenantEvent<CreatorReminderPayload>
  'creator.file.uploaded': TenantEvent<CreatorFileUploadedPayload>
  'creator.slackNotification': TenantEvent<CreatorSlackNotificationPayload>
  'creator.shipmentSync': TenantEvent<CreatorShipmentSyncPayload>
  'creator.approvalReminders': TenantEvent<CreatorApprovalRemindersPayload>
  'creator.welcomeCallReminders': TenantEvent<CreatorWelcomeCallRemindersPayload>
  'project.created': TenantEvent<ProjectCreatedPayload>
  'project.statusChanged': TenantEvent<ProjectStatusChangedPayload>
  'project.deadlineApproaching': TenantEvent<ProjectDeadlineApproachingPayload>

  // Payouts
  'payout.requested': TenantEvent<PayoutRequestedPayload>
  'payout.processing': TenantEvent<PayoutProcessingPayload>
  'payout.completed': TenantEvent<PayoutCompletedPayload>
  'payout.failed': TenantEvent<PayoutFailedPayload>
  'payment.available': TenantEvent<PaymentAvailablePayload>
  'treasury.topup': TenantEvent<TreasuryTopupPayload>
  'treasury.approval': TenantEvent<TreasuryApprovalPayload>
  'treasury.lowBalance': TenantEvent<TreasuryLowBalancePayload>
  'expense.sync': TenantEvent<ExpenseSyncPayload>
  'commission.matured': TenantEvent<CommissionMaturedPayload>

  // Attribution
  'touchpoint.recorded': TenantEvent<TouchpointRecordedPayload>
  'conversion.attributed': TenantEvent<ConversionAttributedPayload>
  'attribution.recalculate': TenantEvent<AttributionRecalculatePayload>
  'attribution.sync': TenantEvent<AttributionSyncPayload>
  'attribution.export': TenantEvent<AttributionExportPayload>

  // A/B Testing
  'ab.testCreated': TenantEvent<ABTestCreatedPayload>
  'ab.testStarted': TenantEvent<ABTestStartedPayload>
  'ab.testEnded': TenantEvent<ABTestEndedPayload>
  'ab.metricsAggregate': TenantEvent<ABMetricsAggregatePayload>
  'ab.optimize': TenantEvent<ABOptimizePayload>
  'ab.orderReconcile': TenantEvent<ABOrderReconcilePayload>

  // Video & DAM
  'video.uploadCompleted': TenantEvent<VideoUploadCompletedPayload>
  'video.transcriptionStarted': TenantEvent<VideoTranscriptionStartedPayload>
  'video.transcriptionCompleted': TenantEvent<VideoTranscriptionCompletedPayload>
  'video.aiGenerated': TenantEvent<VideoAIGeneratedPayload>
  'dam.assetUploaded': TenantEvent<DAMAssetUploadedPayload>
  'dam.gdriveSync': TenantEvent<DAMGDriveSyncPayload>
  'dam.rightsExpiry': TenantEvent<DAMRightsExpiryPayload>
  'dam.export': TenantEvent<DAMExportPayload>
  'dam.faceDetection': TenantEvent<DAMFaceDetectionPayload>
  'dam.bulkIngest': TenantEvent<DAMBulkIngestPayload>

  // Subscriptions
  'subscription.created': TenantEvent<SubscriptionCreatedPayload>
  'subscription.billing': TenantEvent<SubscriptionBillingPayload>
  'subscription.cancelled': TenantEvent<SubscriptionCancelledPayload>
  'subscription.renewal': TenantEvent<SubscriptionRenewalPayload>

  // Notifications
  'email.send': TenantEvent<EmailSendPayload>
  'sms.send': TenantEvent<SMSSendPayload>
  'slack.notify': TenantEvent<SlackNotifyPayload>
  'push.notification': TenantEvent<PushNotificationPayload>

  // System
  'system.healthCheck': TenantEvent<HealthCheckPayload>
  'system.alert': TenantEvent<AlertPayload>
  'system.cleanup': TenantEvent<CleanupPayload>
  'system.syncRecovery': TenantEvent<SyncRecoveryPayload>

  // Workflows
  'workflow.triggered': TenantEvent<WorkflowTriggeredPayload>
  'workflow.action': TenantEvent<WorkflowActionPayload>
  'workflow.scheduledAction': TenantEvent<WorkflowScheduledActionPayload>
  'workflow.timeElapsed': TenantEvent<WorkflowTimeElapsedPayload>
  'workflow.cleanup': TenantEvent<WorkflowCleanupPayload>

  // Brand Context
  'brandContext.processDocument': TenantEvent<BrandDocumentProcessPayload>
  'brandContext.refreshEmbeddings': TenantEvent<BrandEmbeddingsRefreshPayload>
  'brandContext.cleanup': TenantEvent<BrandContextCleanupPayload>

  // Google Feed
  'googleFeed.sync': TenantEvent<GoogleFeedSyncPayload>
  'googleFeed.productUpdate': TenantEvent<GoogleFeedProductUpdatePayload>
  'googleFeed.imageOptimize': TenantEvent<GoogleFeedImageOptimizePayload>

  // Webhooks
  'webhook.retry': TenantEvent<WebhookRetryPayload>
  'webhook.healthCheck': TenantEvent<WebhookHealthCheckPayload>
  'webhook.cleanup': TenantEvent<WebhookCleanupPayload>
}

/**
 * Event categories for organization and filtering
 */
export const EVENT_CATEGORIES = {
  commerce: [
    'order.created',
    'order.fulfilled',
    'order.cancelled',
    'customer.created',
    'customer.updated',
    'product.sync',
    'inventory.sync',
  ],
  reviews: [
    'review.submitted',
    'review.email.queued',
    'review.email.sent',
    'review.reminder',
    'survey.response',
    'survey.digest',
    'survey.lowNps',
  ],
  creators: [
    'creator.applied',
    'creator.approved',
    'creator.rejected',
    'creator.setupComplete',
    'creator.email.queued',
    'creator.reminder',
    'creator.file.uploaded',
    'creator.slackNotification',
    'creator.shipmentSync',
    'creator.approvalReminders',
    'creator.welcomeCallReminders',
    'project.created',
    'project.statusChanged',
    'project.deadlineApproaching',
  ],
  payouts: [
    'payout.requested',
    'payout.processing',
    'payout.completed',
    'payout.failed',
    'payment.available',
    'treasury.topup',
    'treasury.approval',
    'treasury.lowBalance',
    'expense.sync',
    'commission.matured',
  ],
  attribution: [
    'touchpoint.recorded',
    'conversion.attributed',
    'attribution.recalculate',
    'attribution.sync',
    'attribution.export',
  ],
  abTesting: [
    'ab.testCreated',
    'ab.testStarted',
    'ab.testEnded',
    'ab.metricsAggregate',
    'ab.optimize',
    'ab.orderReconcile',
  ],
  media: [
    'video.uploadCompleted',
    'video.transcriptionStarted',
    'video.transcriptionCompleted',
    'video.aiGenerated',
    'dam.assetUploaded',
    'dam.gdriveSync',
    'dam.rightsExpiry',
    'dam.export',
    'dam.faceDetection',
    'dam.bulkIngest',
  ],
  subscriptions: [
    'subscription.created',
    'subscription.billing',
    'subscription.cancelled',
    'subscription.renewal',
  ],
  notifications: ['email.send', 'sms.send', 'slack.notify', 'push.notification'],
  system: [
    'system.healthCheck',
    'system.alert',
    'system.cleanup',
    'system.syncRecovery',
  ],
  workflows: [
    'workflow.triggered',
    'workflow.action',
    'workflow.scheduledAction',
    'workflow.timeElapsed',
    'workflow.cleanup',
  ],
  brandContext: [
    'brandContext.processDocument',
    'brandContext.refreshEmbeddings',
    'brandContext.cleanup',
  ],
  googleFeed: [
    'googleFeed.sync',
    'googleFeed.productUpdate',
    'googleFeed.imageOptimize',
  ],
  webhooks: ['webhook.retry', 'webhook.healthCheck', 'webhook.cleanup'],
} as const

/**
 * Total event count for documentation
 */
export const TOTAL_EVENT_COUNT = Object.values(EVENT_CATEGORIES).flat().length
