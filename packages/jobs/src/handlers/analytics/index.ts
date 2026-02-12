/**
 * Analytics Job Handlers
 *
 * Background jobs for analytics processing including:
 * - Attribution calculation and processing
 * - Metrics aggregation (daily, hourly, weekly)
 * - Ad platform integrations (GA4, Meta CAPI, TikTok)
 * - ML model training pipeline
 *
 * CRITICAL: All handlers require tenantId for tenant isolation.
 *
 * @ai-pattern analytics-jobs
 * @ai-critical tenantId is REQUIRED in every event payload
 */

// ============================================================
// ATTRIBUTION JOBS
// ============================================================

export {
  // Job definitions
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
  // Job collection
  attributionJobs,
} from './attribution'

// ============================================================
// METRICS AGGREGATION JOBS
// ============================================================

export {
  // Job definitions
  aggregateDailyMetricsJob,
  hourlyMetricsRollupJob,
  weeklyMetricsSummaryJob,
  // Job collection
  metricsJobs,
} from './metrics'

// ============================================================
// AD PLATFORM JOBS
// ============================================================

export {
  // Job definitions
  sendGA4PurchaseJob,
  sendMetaPurchaseJob,
  sendTikTokEventJob,
  syncGoogleAdsSpendJob,
  syncMetaAdsSpendJob,
  // Job collection
  adPlatformJobs,
} from './ad-platforms'

// ============================================================
// ML TRAINING JOBS
// ============================================================

export {
  // Job definitions
  attributionMLTrainingJob,
  // Job collection
  mlTrainingJobs,
} from './ml-training'

// ============================================================
// TYPES
// ============================================================

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
} from './types'

export { ANALYTICS_SCHEDULES } from './types'

// ============================================================
// ALL ANALYTICS JOBS
// ============================================================

import { attributionJobs } from './attribution'
import { metricsJobs } from './metrics'
import { adPlatformJobs } from './ad-platforms'
import { mlTrainingJobs } from './ml-training'

/**
 * All analytics jobs combined for registration
 */
export const analyticsJobs = [
  ...attributionJobs,
  ...metricsJobs,
  ...adPlatformJobs,
  ...mlTrainingJobs,
]

/**
 * Analytics job count
 */
export const ANALYTICS_JOB_COUNT = analyticsJobs.length
