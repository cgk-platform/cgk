/**
 * Analytics Trigger.dev Tasks Index
 *
 * Re-exports all analytics-related Trigger.dev tasks:
 * - Attribution (11 tasks + 9 scheduled)
 * - Metrics (3 tasks + 3 scheduled)
 * - Ad Platforms (5 tasks + 2 scheduled)
 * - ML Training (1 task + 1 scheduled)
 *
 * @ai-pattern trigger-tasks
 */

export {
  // Attribution tasks
  processAttributionTask,
  attributionDailyMetricsTask,
  attributionExportSchedulerTask,
  attributionFairingBridgeTask,
  attributionOrderReconciliationTask,
  attributionOrderReconciliationManualTask,
  attributionRecalculateRecentTask,
  syncTikTokSpendDailyTask,
  attributionVTASyncTask,
  attributionProcessUnattributedTask,
  attributionWebhookQueueTask,
  // Scheduled tasks
  attributionDailyMetricsScheduledTask,
  attributionExportScheduledTask,
  attributionFairingBridgeScheduledTask,
  attributionOrderReconciliationScheduledTask,
  attributionRecalculateRecentScheduledTask,
  syncTikTokSpendScheduledTask,
  attributionVTASyncScheduledTask,
  attributionProcessUnattributedScheduledTask,
  attributionWebhookQueueScheduledTask,
  // Task collection
  attributionTasks,
} from './attribution'

export {
  // Metrics tasks
  aggregateDailyMetricsTask,
  hourlyMetricsRollupTask,
  weeklyMetricsSummaryTask,
  // Scheduled tasks
  aggregateDailyMetricsScheduledTask,
  hourlyMetricsRollupScheduledTask,
  weeklyMetricsSummaryScheduledTask,
  // Task collection
  metricsTasks,
} from './metrics'

export {
  // Ad platform tasks
  sendGA4PurchaseTask,
  sendMetaPurchaseTask,
  sendTikTokEventTask,
  syncGoogleAdsSpendTask,
  syncMetaAdsSpendTask,
  // Scheduled tasks
  syncGoogleAdsSpendScheduledTask,
  syncMetaAdsSpendScheduledTask,
  // Task collection
  adPlatformTasks,
} from './ad-platforms'

export {
  // ML training tasks
  attributionMLTrainingTask,
  // Scheduled tasks
  attributionMLTrainingScheduledTask,
  // Task collection
  mlTrainingTasks,
} from './ml-training'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { attributionTasks } from './attribution'
import { metricsTasks } from './metrics'
import { adPlatformTasks } from './ad-platforms'
import { mlTrainingTasks } from './ml-training'

/**
 * All analytics tasks combined
 */
export const allAnalyticsTasks = [
  ...attributionTasks,
  ...metricsTasks,
  ...adPlatformTasks,
  ...mlTrainingTasks,
]
