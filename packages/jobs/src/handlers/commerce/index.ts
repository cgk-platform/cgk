/**
 * Commerce Job Handlers
 *
 * This module exports all commerce-related background job handlers
 * for the CGK platform. These handlers cover:
 *
 * - Order synchronization and processing
 * - Review email queue management
 * - A/B testing metrics and optimization
 * - Product and customer sync from Shopify
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All handlers require tenantId in payload
 */

// ---------------------------------------------------------------------------
// Order Sync Jobs
// ---------------------------------------------------------------------------

export {
  // Main sync jobs
  syncOrderJob,
  syncOrderBatchJob,
  orderReconciliationJob,
  // Processing jobs
  orderAttributionJob,
  orderCommissionJob,
  orderReviewEmailJob,
  // Event handlers
  handleOrderCreatedJob,
  handleOrderFulfilledJob,
  // Collection
  orderSyncJobs,
  // Schedules
  ORDER_SYNC_SCHEDULES,
  // Types
  type SyncOrderPayload,
  type SyncOrderBatchPayload,
  type OrderReconciliationPayload,
  type OrderAttributionPayload,
  type OrderCommissionPayload,
  type OrderReviewEmailPayload,
} from './order-sync'

// ---------------------------------------------------------------------------
// Review Email Jobs
// ---------------------------------------------------------------------------

export {
  // Queue processing jobs
  processReviewEmailQueueJob,
  reviewEmailAwaitingDeliveryJob,
  retryFailedReviewEmailsJob,
  // Send jobs
  sendQueuedReviewEmailJob,
  scheduleFollowUpJob,
  // Event handlers
  handleReviewEmailQueuedJob,
  handleReviewEmailSentJob,
  handleReviewModeratedJob,
  // Stats
  reviewEmailStatsJob,
  // Collection
  reviewEmailJobs,
  // Schedules
  REVIEW_EMAIL_SCHEDULES,
  // Types
  type ProcessReviewEmailQueuePayload,
  type ReviewEmailAwaitingDeliveryPayload,
  type RetryFailedReviewEmailsPayload,
  type SendQueuedReviewEmailPayload,
  type ScheduleFollowUpPayload,
  type ReviewEmailStatsPayload,
} from './review-email'

// ---------------------------------------------------------------------------
// A/B Testing Jobs
// ---------------------------------------------------------------------------

export {
  // Metrics aggregation jobs
  abHourlyMetricsAggregationJob,
  abNightlyReconciliationJob,
  abAggregateTestMetricsJob,
  abSyncRedisToPostgresJob,
  // Summary jobs
  abDailyMetricsSummaryJob,
  abOptimizationSummaryJob,
  // Optimization jobs
  abOptimizationJob,
  abOptimizeTestJob,
  // Reconciliation jobs
  abOrderReconciliationJob,
  abOrderReconciliationManualJob,
  // Scheduler
  abTestSchedulerJob,
  // Event handlers
  handleABTestCreatedJob,
  handleABTestStartedJob,
  handleABTestEndedJob,
  // Collection
  abTestingJobs,
  // Schedules
  AB_TESTING_SCHEDULES,
  // Types
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
} from './ab-testing'

// ---------------------------------------------------------------------------
// Product & Customer Sync Jobs
// ---------------------------------------------------------------------------

export {
  // Product sync jobs
  productSyncJob,
  productBatchSyncJob,
  handleProductSyncJob,
  // Customer sync jobs
  customerSyncJob,
  customerBatchSyncJob,
  handleCustomerCreatedJob,
  handleCustomerUpdatedJob,
  // Inventory jobs
  inventoryUpdateJob,
  inventoryBatchSyncJob,
  handleInventorySyncJob,
  // Collection sync jobs
  collectionSyncJob,
  collectionProductsSyncJob,
  // Collection
  productCustomerSyncJobs,
  // Schedules
  PRODUCT_CUSTOMER_SCHEDULES,
  // Types
  type ProductSyncFromShopifyPayload,
  type ProductBatchSyncPayload,
  type CustomerSyncFromShopifyPayload,
  type CustomerBatchSyncPayload,
  type InventoryUpdatePayload,
  type InventoryBatchSyncPayload,
  type CollectionSyncPayload,
  type CollectionProductsSyncPayload,
} from './product-customer-sync'

// ---------------------------------------------------------------------------
// Combined Commerce Jobs
// ---------------------------------------------------------------------------

import { orderSyncJobs } from './order-sync'
import { reviewEmailJobs } from './review-email'
import { abTestingJobs } from './ab-testing'
import { productCustomerSyncJobs } from './product-customer-sync'

/**
 * All commerce job handlers
 *
 * Use this array to register all commerce jobs at once.
 */
export const commerceJobs = [
  ...orderSyncJobs,
  ...reviewEmailJobs,
  ...abTestingJobs,
  ...productCustomerSyncJobs,
]

/**
 * Total count of commerce jobs
 */
export const COMMERCE_JOB_COUNT = commerceJobs.length

// ---------------------------------------------------------------------------
// Combined Schedules
// ---------------------------------------------------------------------------

import { ORDER_SYNC_SCHEDULES } from './order-sync'
import { REVIEW_EMAIL_SCHEDULES } from './review-email'
import { AB_TESTING_SCHEDULES } from './ab-testing'
import { PRODUCT_CUSTOMER_SCHEDULES } from './product-customer-sync'

/**
 * All commerce job schedules
 */
export const COMMERCE_SCHEDULES = {
  orderSync: ORDER_SYNC_SCHEDULES,
  reviewEmail: REVIEW_EMAIL_SCHEDULES,
  abTesting: AB_TESTING_SCHEDULES,
  productCustomer: PRODUCT_CUSTOMER_SCHEDULES,
} as const
