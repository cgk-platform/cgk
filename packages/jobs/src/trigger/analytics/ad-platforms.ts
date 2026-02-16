/**
 * Ad Platform Trigger.dev Tasks
 *
 * Trigger.dev task definitions for ad platform integrations:
 * - GA4 purchase events
 * - Meta CAPI events
 * - TikTok Events API
 * - Google Ads spend sync
 * - Meta Ads spend sync
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type {
  SendGA4PurchasePayload,
  SendMetaPurchasePayload,
  SendTikTokEventPayload,
  SyncGoogleAdsSpendPayload,
  SyncMetaAdsSpendPayload,
} from '../../handlers/analytics/types'
import { createJobFromPayload, getActiveTenants } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const EVENT_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 30000,
}

const SPEND_SYNC_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 10000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// AD PLATFORM EVENT TASKS
// ============================================================

export const sendGA4PurchaseTask = task({
  id: 'analytics-send-ga4-purchase',
  retry: EVENT_RETRY,
  run: async (payload: SendGA4PurchasePayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending GA4 purchase event', { tenantId, orderId: payload.orderId })

    const { sendGA4PurchaseJob } = await import('../../handlers/analytics/ad-platforms.js')

    const result = await sendGA4PurchaseJob.handler(
      createJobFromPayload('send-ga4-purchase', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send GA4 purchase failed')
    }

    return result.data
  },
})

export const sendMetaPurchaseTask = task({
  id: 'analytics-send-meta-purchase',
  retry: EVENT_RETRY,
  run: async (payload: SendMetaPurchasePayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending Meta CAPI purchase event', { tenantId, orderId: payload.orderId })

    const { sendMetaPurchaseJob } = await import('../../handlers/analytics/ad-platforms.js')

    const result = await sendMetaPurchaseJob.handler(
      createJobFromPayload('send-meta-purchase', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send Meta purchase failed')
    }

    return result.data
  },
})

export const sendTikTokEventTask = task({
  id: 'analytics-send-tiktok-event',
  retry: EVENT_RETRY,
  run: async (payload: SendTikTokEventPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending TikTok event', { tenantId, orderId: payload.orderId, eventType: payload.eventType })

    const { sendTikTokEventJob } = await import('../../handlers/analytics/ad-platforms.js')

    const result = await sendTikTokEventJob.handler(
      createJobFromPayload('send-tiktok-event', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send TikTok event failed')
    }

    return result.data
  },
})

// ============================================================
// AD SPEND SYNC TASKS
// ============================================================

export const syncGoogleAdsSpendTask = task({
  id: 'analytics-sync-google-ads-spend',
  retry: SPEND_SYNC_RETRY,
  run: async (payload: SyncGoogleAdsSpendPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing Google Ads spend', { tenantId })

    const { syncGoogleAdsSpendJob } = await import('../../handlers/analytics/ad-platforms.js')

    const result = await syncGoogleAdsSpendJob.handler(
      createJobFromPayload('sync-google-ads-spend', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Sync Google Ads spend failed')
    }

    return result.data
  },
})

export const syncMetaAdsSpendTask = task({
  id: 'analytics-sync-meta-ads-spend',
  retry: SPEND_SYNC_RETRY,
  run: async (payload: SyncMetaAdsSpendPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing Meta Ads spend', { tenantId })

    const { syncMetaAdsSpendJob } = await import('../../handlers/analytics/ad-platforms.js')

    const result = await syncMetaAdsSpendJob.handler(
      createJobFromPayload('sync-meta-ads-spend', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Sync Meta Ads spend failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const syncGoogleAdsSpendScheduledTask = schedules.task({
  id: 'analytics-sync-google-ads-spend-scheduled',
  cron: '0 5 * * *', // 5 AM daily
  run: async () => {
    logger.info('Running scheduled Google Ads spend sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await syncGoogleAdsSpendTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const syncMetaAdsSpendScheduledTask = schedules.task({
  id: 'analytics-sync-meta-ads-spend-scheduled',
  cron: '0 5 * * *', // 5 AM daily
  run: async () => {
    logger.info('Running scheduled Meta Ads spend sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await syncMetaAdsSpendTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const adPlatformTasks = [
  sendGA4PurchaseTask,
  sendMetaPurchaseTask,
  sendTikTokEventTask,
  syncGoogleAdsSpendTask,
  syncMetaAdsSpendTask,
  syncGoogleAdsSpendScheduledTask,
  syncMetaAdsSpendScheduledTask,
]
