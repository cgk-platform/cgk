/**
 * Attribution Trigger.dev Tasks
 *
 * Trigger.dev task definitions for attribution processing:
 * - Conversion attribution calculation
 * - Daily metrics aggregation
 * - Export scheduling
 * - Fairing survey bridge
 * - Order reconciliation
 * - VTA sync
 * - Unattributed processing
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type {
  ProcessAttributionPayload,
  AttributionDailyMetricsPayload,
  AttributionExportSchedulerPayload,
  AttributionFairingBridgePayload,
  AttributionOrderReconciliationPayload,
  AttributionRecalculateRecentPayload,
  SyncTikTokSpendPayload,
  AttributionVTASyncPayload,
  AttributionProcessUnattributedPayload,
  AttributionWebhookQueuePayload,
} from '../../handlers/analytics/types'
import { createJobFromPayload, getActiveTenants } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const ATTRIBUTION_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

const AGGREGATION_RETRY = {
  maxAttempts: 2,
  factor: 2,
  minTimeoutInMs: 30000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// ATTRIBUTION PROCESSING TASKS
// ============================================================

export const processAttributionTask = task({
  id: 'analytics-process-attribution',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: ProcessAttributionPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing attribution', { tenantId, orderId: payload.orderId })

    const { processAttributionJob } = await import('../../handlers/analytics/attribution.js')

    const result = await processAttributionJob.handler(
      createJobFromPayload('process-attribution', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process attribution failed')
    }

    return result.data
  },
})

export const attributionDailyMetricsTask = task({
  id: 'analytics-attribution-daily-metrics',
  retry: AGGREGATION_RETRY,
  run: async (payload: AttributionDailyMetricsPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Aggregating attribution daily metrics', { tenantId })

    const { attributionDailyMetricsJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionDailyMetricsJob.handler(
      createJobFromPayload('attribution-daily-metrics', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Attribution daily metrics failed')
    }

    return result.data
  },
})

export const attributionExportSchedulerTask = task({
  id: 'analytics-attribution-export-scheduler',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: AttributionExportSchedulerPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running attribution export scheduler', { tenantId })

    const { attributionExportSchedulerJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionExportSchedulerJob.handler(
      createJobFromPayload('attribution-export-scheduler', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Attribution export scheduler failed')
    }

    return result.data
  },
})

export const attributionFairingBridgeTask = task({
  id: 'analytics-attribution-fairing-bridge',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: AttributionFairingBridgePayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running Fairing bridge sync', { tenantId })

    const { attributionFairingBridgeJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionFairingBridgeJob.handler(
      createJobFromPayload('attribution-fairing-bridge', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Fairing bridge sync failed')
    }

    return result.data
  },
})

export const attributionOrderReconciliationTask = task({
  id: 'analytics-attribution-order-reconciliation',
  retry: AGGREGATION_RETRY,
  run: async (payload: AttributionOrderReconciliationPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running order reconciliation', { tenantId })

    const { attributionOrderReconciliationJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionOrderReconciliationJob.handler(
      createJobFromPayload('attribution-order-reconciliation', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Order reconciliation failed')
    }

    return result.data
  },
})

export const attributionOrderReconciliationManualTask = task({
  id: 'analytics-attribution-order-reconciliation-manual',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: AttributionOrderReconciliationPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running manual order reconciliation', { tenantId, orderId: payload.orderId })

    const { attributionOrderReconciliationManualJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionOrderReconciliationManualJob.handler(
      createJobFromPayload('attribution-order-reconciliation-manual', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Manual order reconciliation failed')
    }

    return result.data
  },
})

export const attributionRecalculateRecentTask = task({
  id: 'analytics-attribution-recalculate-recent',
  retry: AGGREGATION_RETRY,
  run: async (payload: AttributionRecalculateRecentPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Recalculating recent attribution', { tenantId })

    const { attributionRecalculateRecentJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionRecalculateRecentJob.handler(
      createJobFromPayload('attribution-recalculate-recent', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Recalculate recent failed')
    }

    return result.data
  },
})

export const syncTikTokSpendDailyTask = task({
  id: 'analytics-sync-tiktok-spend-daily',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: SyncTikTokSpendPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing TikTok spend', { tenantId })

    const { syncTikTokSpendDailyJob } = await import('../../handlers/analytics/attribution.js')

    const result = await syncTikTokSpendDailyJob.handler(
      createJobFromPayload('sync-tiktok-spend-daily', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Sync TikTok spend failed')
    }

    return result.data
  },
})

export const attributionVTASyncTask = task({
  id: 'analytics-attribution-vta-sync',
  retry: AGGREGATION_RETRY,
  run: async (payload: AttributionVTASyncPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running VTA sync', { tenantId })

    const { attributionVTASyncJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionVTASyncJob.handler(
      createJobFromPayload('attribution-vta-sync', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'VTA sync failed')
    }

    return result.data
  },
})

export const attributionProcessUnattributedTask = task({
  id: 'analytics-attribution-process-unattributed',
  retry: AGGREGATION_RETRY,
  run: async (payload: AttributionProcessUnattributedPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing unattributed orders', { tenantId })

    const { attributionProcessUnattributedJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionProcessUnattributedJob.handler(
      createJobFromPayload('attribution-process-unattributed', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process unattributed failed')
    }

    return result.data
  },
})

export const attributionWebhookQueueTask = task({
  id: 'analytics-attribution-webhook-queue',
  retry: ATTRIBUTION_RETRY,
  run: async (payload: AttributionWebhookQueuePayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing attribution webhook queue', { tenantId })

    const { attributionWebhookQueueJob } = await import('../../handlers/analytics/attribution.js')

    const result = await attributionWebhookQueueJob.handler(
      createJobFromPayload('attribution-webhook-queue', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Webhook queue processing failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const attributionDailyMetricsScheduledTask = schedules.task({
  id: 'analytics-attribution-daily-metrics-scheduled',
  cron: '10 2 * * *', // 2:10 AM daily
  run: async () => {
    logger.info('Running scheduled attribution daily metrics')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionDailyMetricsTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionExportScheduledTask = schedules.task({
  id: 'analytics-attribution-export-scheduled',
  cron: '*/15 * * * *', // Every 15 minutes
  run: async () => {
    logger.info('Running scheduled attribution export')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionExportSchedulerTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionFairingBridgeScheduledTask = schedules.task({
  id: 'analytics-attribution-fairing-bridge-scheduled',
  cron: '15 * * * *', // Every hour at :15
  run: async () => {
    logger.info('Running scheduled Fairing bridge sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionFairingBridgeTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionOrderReconciliationScheduledTask = schedules.task({
  id: 'analytics-attribution-order-reconciliation-scheduled',
  cron: '45 * * * *', // Every hour at :45
  run: async () => {
    logger.info('Running scheduled order reconciliation')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionOrderReconciliationTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionRecalculateRecentScheduledTask = schedules.task({
  id: 'analytics-attribution-recalculate-recent-scheduled',
  cron: '0 4 * * *', // 4 AM daily
  run: async () => {
    logger.info('Running scheduled recalculate recent')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionRecalculateRecentTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const syncTikTokSpendScheduledTask = schedules.task({
  id: 'analytics-sync-tiktok-spend-scheduled',
  cron: '0 3 * * *', // 3 AM daily
  run: async () => {
    logger.info('Running scheduled TikTok spend sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await syncTikTokSpendDailyTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionVTASyncScheduledTask = schedules.task({
  id: 'analytics-attribution-vta-sync-scheduled',
  cron: '30 2 * * *', // 2:30 AM daily
  run: async () => {
    logger.info('Running scheduled VTA sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionVTASyncTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionProcessUnattributedScheduledTask = schedules.task({
  id: 'analytics-attribution-process-unattributed-scheduled',
  cron: '30 * * * *', // Every hour at :30
  run: async () => {
    logger.info('Running scheduled process unattributed')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionProcessUnattributedTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const attributionWebhookQueueScheduledTask = schedules.task({
  id: 'analytics-attribution-webhook-queue-scheduled',
  cron: '*/5 * * * *', // Every 5 minutes
  run: async () => {
    logger.info('Running scheduled webhook queue processing')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await attributionWebhookQueueTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const attributionTasks = [
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
  attributionDailyMetricsScheduledTask,
  attributionExportScheduledTask,
  attributionFairingBridgeScheduledTask,
  attributionOrderReconciliationScheduledTask,
  attributionRecalculateRecentScheduledTask,
  syncTikTokSpendScheduledTask,
  attributionVTASyncScheduledTask,
  attributionProcessUnattributedScheduledTask,
  attributionWebhookQueueScheduledTask,
]
