/**
 * Commerce A/B Testing Tasks
 *
 * Trigger.dev task definitions for A/B test management:
 * - Hourly metrics aggregation
 * - Nightly reconciliation
 * - Redis to Postgres sync
 * - Multi-armed bandit optimization
 * - Thompson sampling updates
 * - Order reconciliation
 * - Test scheduling and transitions
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent, ABTestCreatedPayload, ABTestStartedPayload, ABTestEndedPayload } from '../../events'
import type {
  ABHourlyMetricsAggregationPayload,
  ABNightlyReconciliationPayload,
  ABSyncRedisToPostgresPayload,
  ABDailyMetricsSummaryPayload,
  ABOptimizationPayload,
  ABOptimizeTestPayload,
  ABOptimizationSummaryPayload,
  ABOrderReconciliationPayload,
  ABOrderReconciliationManualPayload,
  ABTestSchedulerPayload,
  ABAggregateTestMetricsPayload,
} from '../../handlers/commerce/ab-testing'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const METRICS_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 30000,
}

const RECONCILIATION_RETRY = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 120000,
}

const OPTIMIZATION_RETRY = {
  maxAttempts: 3,
  factor: 1,
  minTimeoutInMs: 3000,
  maxTimeoutInMs: 3000,
}

// ============================================================
// HOURLY METRICS AGGREGATION TASK
// ============================================================

export const abHourlyMetricsAggregationTask = task({
  id: 'ab-hourly-metrics-aggregation',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABHourlyMetricsAggregationPayload>) => {
    const { tenantId, testId, hour } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Aggregating hourly metrics', { tenantId, testId: testId || 'all', hour })

    const { abHourlyMetricsAggregationJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abHourlyMetricsAggregationJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Hourly metrics aggregation failed')
    }

    return result.data
  },
})

// ============================================================
// NIGHTLY RECONCILIATION TASK
// ============================================================

export const abNightlyReconciliationTask = task({
  id: 'ab-nightly-reconciliation',
  retry: RECONCILIATION_RETRY,
  run: async (payload: TenantEvent<ABNightlyReconciliationPayload>) => {
    const { tenantId, reconciliationDate, fullReconciliation = false } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running nightly reconciliation', { tenantId, reconciliationDate, fullReconciliation })

    const { abNightlyReconciliationJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abNightlyReconciliationJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Nightly reconciliation failed')
    }

    return result.data
  },
})

// ============================================================
// AGGREGATE TEST METRICS TASK
// ============================================================

export const abAggregateTestMetricsTask = task({
  id: 'ab-aggregate-test-metrics',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABAggregateTestMetricsPayload>) => {
    const { tenantId, testId, period } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!testId) {
      throw new Error('testId is required')
    }

    logger.info('Manual metrics aggregation', { tenantId, testId, period })

    const { abAggregateTestMetricsJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abAggregateTestMetricsJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Aggregate test metrics failed')
    }

    return result.data
  },
})

// ============================================================
// SYNC REDIS TO POSTGRES TASK
// ============================================================

export const abSyncRedisToPostgresTask = task({
  id: 'ab-sync-redis-to-postgres',
  retry: RECONCILIATION_RETRY,
  run: async (payload: TenantEvent<ABSyncRedisToPostgresPayload>) => {
    const { tenantId, testIds, forceSync = false } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing Redis to Postgres', { tenantId, testIds: testIds || 'all', forceSync })

    const { abSyncRedisToPostgresJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abSyncRedisToPostgresJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Sync Redis to Postgres failed')
    }

    return result.data
  },
})

// ============================================================
// DAILY METRICS SUMMARY TASK
// ============================================================

export const abDailyMetricsSummaryTask = task({
  id: 'ab-daily-metrics-summary',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABDailyMetricsSummaryPayload>) => {
    const { tenantId, sendToSlack = true, recipientEmail } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating daily summary', { tenantId, sendToSlack, recipientEmail })

    const { abDailyMetricsSummaryJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abDailyMetricsSummaryJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Daily metrics summary failed')
    }

    return result.data
  },
})

// ============================================================
// OPTIMIZATION TASK
// ============================================================

export const abOptimizationTask = task({
  id: 'ab-optimization',
  retry: OPTIMIZATION_RETRY,
  run: async (payload: TenantEvent<ABOptimizationPayload>) => {
    const { tenantId, testId, algorithm = 'thompson', epsilon = 0.1 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running optimization', { tenantId, testId: testId || 'all', algorithm, epsilon })

    const { abOptimizationJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abOptimizationJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Optimization failed')
    }

    return result.data
  },
})

// ============================================================
// OPTIMIZE TEST TASK
// ============================================================

export const abOptimizeTestTask = task({
  id: 'ab-optimize-test',
  retry: OPTIMIZATION_RETRY,
  run: async (payload: TenantEvent<ABOptimizeTestPayload>) => {
    const { tenantId, testId, algorithm, currentVariantWeights } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!testId) {
      throw new Error('testId is required')
    }

    logger.info('Optimizing test', { tenantId, testId, algorithm, currentVariantWeights })

    const { abOptimizeTestJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abOptimizeTestJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Optimize test failed')
    }

    return result.data
  },
})

// ============================================================
// OPTIMIZATION SUMMARY TASK
// ============================================================

export const abOptimizationSummaryTask = task({
  id: 'ab-optimization-summary',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABOptimizationSummaryPayload>) => {
    const { tenantId, includeRecommendations = true } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating optimization summary', { tenantId, includeRecommendations })

    const { abOptimizationSummaryJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abOptimizationSummaryJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Optimization summary failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER RECONCILIATION TASK
// ============================================================

export const abOrderReconciliationTask = task({
  id: 'ab-order-reconciliation',
  retry: RECONCILIATION_RETRY,
  run: async (payload: TenantEvent<ABOrderReconciliationPayload>) => {
    const { tenantId, startTime, endTime, testId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Reconciling orders', { tenantId, startTime, endTime, testId: testId || 'all' })

    const { abOrderReconciliationJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abOrderReconciliationJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Order reconciliation failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER RECONCILIATION MANUAL TASK
// ============================================================

export const abOrderReconciliationManualTask = task({
  id: 'ab-order-reconciliation-manual',
  retry: RECONCILIATION_RETRY,
  run: async (payload: TenantEvent<ABOrderReconciliationManualPayload>) => {
    const { tenantId, orderId, testId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!orderId) {
      throw new Error('orderId is required')
    }

    logger.info('Manual order reconciliation', { tenantId, orderId, testId })

    const { abOrderReconciliationManualJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abOrderReconciliationManualJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Manual order reconciliation failed')
    }

    return result.data
  },
})

// ============================================================
// TEST SCHEDULER TASK
// ============================================================

export const abTestSchedulerTask = task({
  id: 'ab-test-scheduler',
  retry: OPTIMIZATION_RETRY,
  run: async (payload: TenantEvent<ABTestSchedulerPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running test scheduler', { tenantId })

    const { abTestSchedulerJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await abTestSchedulerJob.handler(
      createJobFromPayload('ab', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Test scheduler failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE TEST CREATED TASK
// ============================================================

export const handleABTestCreatedTask = task({
  id: 'ab-handle-test-created',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABTestCreatedPayload>) => {
    const { tenantId, testId, name, variants } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling test created', { tenantId, testId, name, variants })

    const { handleABTestCreatedJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await handleABTestCreatedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle test created failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE TEST STARTED TASK
// ============================================================

export const handleABTestStartedTask = task({
  id: 'ab-handle-test-started',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABTestStartedPayload>) => {
    const { tenantId, testId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling test started', { tenantId, testId })

    const { handleABTestStartedJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await handleABTestStartedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle test started failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE TEST ENDED TASK
// ============================================================

export const handleABTestEndedTask = task({
  id: 'ab-handle-test-ended',
  retry: METRICS_RETRY,
  run: async (payload: TenantEvent<ABTestEndedPayload>) => {
    const { tenantId, testId, winningVariant } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling test ended', { tenantId, testId, winningVariant })

    const { handleABTestEndedJob } = await import('../../handlers/commerce/ab-testing.js')

    const result = await handleABTestEndedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle test ended failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const abHourlyAggregationScheduledTask = schedules.task({
  id: 'ab-hourly-aggregation-scheduled',
  cron: '15 * * * *',
  run: async () => {
    logger.info('Running scheduled hourly aggregation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abHourlyMetricsAggregationTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abOrderReconciliationScheduledTask = schedules.task({
  id: 'ab-order-reconciliation-scheduled',
  cron: '15 * * * *',
  run: async () => {
    logger.info('Running scheduled order reconciliation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abOrderReconciliationTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abOptimizationScheduledTask = schedules.task({
  id: 'ab-optimization-scheduled',
  cron: '*/15 * * * *',
  run: async () => {
    logger.info('Running scheduled optimization')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abOptimizationTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abTestSchedulerScheduledTask = schedules.task({
  id: 'ab-test-scheduler-scheduled',
  cron: '*/5 * * * *',
  run: async () => {
    logger.info('Running scheduled test scheduler')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abTestSchedulerTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abRedisSyncScheduledTask = schedules.task({
  id: 'ab-redis-sync-scheduled',
  cron: '0 */6 * * *',
  run: async () => {
    logger.info('Running scheduled Redis sync')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abSyncRedisToPostgresTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abNightlyReconciliationScheduledTask = schedules.task({
  id: 'ab-nightly-reconciliation-scheduled',
  cron: '0 2 * * *',
  run: async () => {
    logger.info('Running scheduled nightly reconciliation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abNightlyReconciliationTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abDailySummaryScheduledTask = schedules.task({
  id: 'ab-daily-summary-scheduled',
  cron: '0 8 * * *',
  run: async () => {
    logger.info('Running scheduled daily summary')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abDailyMetricsSummaryTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abOptimizationSummaryScheduledTask = schedules.task({
  id: 'ab-optimization-summary-scheduled',
  cron: '0 9 * * *',
  run: async () => {
    logger.info('Running scheduled optimization summary')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await abOptimizationSummaryTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const abTestingTasks = [
  abHourlyMetricsAggregationTask,
  abNightlyReconciliationTask,
  abAggregateTestMetricsTask,
  abSyncRedisToPostgresTask,
  abDailyMetricsSummaryTask,
  abOptimizationTask,
  abOptimizeTestTask,
  abOptimizationSummaryTask,
  abOrderReconciliationTask,
  abOrderReconciliationManualTask,
  abTestSchedulerTask,
  handleABTestCreatedTask,
  handleABTestStartedTask,
  handleABTestEndedTask,
  abHourlyAggregationScheduledTask,
  abOrderReconciliationScheduledTask,
  abOptimizationScheduledTask,
  abTestSchedulerScheduledTask,
  abRedisSyncScheduledTask,
  abNightlyReconciliationScheduledTask,
  abDailySummaryScheduledTask,
  abOptimizationSummaryScheduledTask,
]
