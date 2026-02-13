/**
 * Metrics Trigger.dev Tasks
 *
 * Trigger.dev task definitions for metrics aggregation:
 * - Daily metrics aggregation
 * - Hourly metrics rollup
 * - Weekly metrics summary
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type {
  AggregateDailyMetricsPayload,
  HourlyMetricsRollupPayload,
  WeeklyMetricsSummaryPayload,
} from '../../handlers/analytics/types'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const METRICS_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 10000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// METRICS TASKS
// ============================================================

export const aggregateDailyMetricsTask = task({
  id: 'analytics-aggregate-daily-metrics',
  retry: METRICS_RETRY,
  run: async (payload: AggregateDailyMetricsPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Aggregating daily metrics', { tenantId })

    const { aggregateDailyMetricsJob } = await import('../../handlers/analytics/metrics.js')

    const result = await aggregateDailyMetricsJob.handler(
      createJobFromPayload('aggregate-daily-metrics', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Aggregate daily metrics failed')
    }

    return result.data
  },
})

export const hourlyMetricsRollupTask = task({
  id: 'analytics-hourly-metrics-rollup',
  retry: METRICS_RETRY,
  run: async (payload: HourlyMetricsRollupPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Rolling up hourly metrics', { tenantId })

    const { hourlyMetricsRollupJob } = await import('../../handlers/analytics/metrics.js')

    const result = await hourlyMetricsRollupJob.handler(
      createJobFromPayload('hourly-metrics-rollup', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Hourly metrics rollup failed')
    }

    return result.data
  },
})

export const weeklyMetricsSummaryTask = task({
  id: 'analytics-weekly-metrics-summary',
  retry: METRICS_RETRY,
  run: async (payload: WeeklyMetricsSummaryPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating weekly metrics summary', { tenantId })

    const { weeklyMetricsSummaryJob } = await import('../../handlers/analytics/metrics.js')

    const result = await weeklyMetricsSummaryJob.handler(
      createJobFromPayload('weekly-metrics-summary', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Weekly metrics summary failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const aggregateDailyMetricsScheduledTask = schedules.task({
  id: 'analytics-aggregate-daily-metrics-scheduled',
  cron: '0 2 * * *', // 2 AM daily
  run: async () => {
    logger.info('Running scheduled daily metrics aggregation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await aggregateDailyMetricsTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const hourlyMetricsRollupScheduledTask = schedules.task({
  id: 'analytics-hourly-metrics-rollup-scheduled',
  cron: '5 * * * *', // Every hour at :05
  run: async () => {
    logger.info('Running scheduled hourly metrics rollup')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await hourlyMetricsRollupTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const weeklyMetricsSummaryScheduledTask = schedules.task({
  id: 'analytics-weekly-metrics-summary-scheduled',
  cron: '0 8 * * 1', // Monday at 8 AM
  run: async () => {
    logger.info('Running scheduled weekly metrics summary')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await weeklyMetricsSummaryTask.trigger({ tenantId, includeTrends: true })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const metricsTasks = [
  aggregateDailyMetricsTask,
  hourlyMetricsRollupTask,
  weeklyMetricsSummaryTask,
  aggregateDailyMetricsScheduledTask,
  hourlyMetricsRollupScheduledTask,
  weeklyMetricsSummaryScheduledTask,
]
