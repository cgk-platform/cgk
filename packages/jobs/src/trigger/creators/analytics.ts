/**
 * Creator Analytics Trigger.dev Tasks
 *
 * Trigger.dev task definitions for creator analytics:
 * - Daily metrics aggregation
 * - Weekly creator summary
 * - Monthly creator report
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  AggregateCreatorDailyMetricsPayload,
  GenerateWeeklyCreatorSummaryPayload,
  GenerateMonthlyCreatorReportPayload,
} from '../../handlers/creators/analytics-aggregation'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const ANALYTICS_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 30000,
  maxTimeoutInMs: 180000,
}

// ============================================================
// ANALYTICS TASKS
// ============================================================

export const aggregateCreatorDailyMetricsTask = task({
  id: 'creator-aggregate-daily-metrics',
  retry: ANALYTICS_RETRY,
  run: async (payload: TenantEvent<AggregateCreatorDailyMetricsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Aggregating creator daily metrics', { tenantId })

    const { aggregateCreatorDailyMetricsJob } = await import('../../handlers/creators/analytics-aggregation.js')

    const result = await aggregateCreatorDailyMetricsJob.handler(
      createJobFromPayload('aggregate', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Aggregate daily metrics failed')
    }

    return result.data
  },
})

export const generateWeeklyCreatorSummaryTask = task({
  id: 'creator-generate-weekly-summary',
  retry: ANALYTICS_RETRY,
  run: async (payload: TenantEvent<GenerateWeeklyCreatorSummaryPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating weekly creator summary', { tenantId })

    const { generateWeeklyCreatorSummaryJob } = await import('../../handlers/creators/analytics-aggregation.js')

    const result = await generateWeeklyCreatorSummaryJob.handler(
      createJobFromPayload('generate', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Generate weekly summary failed')
    }

    return result.data
  },
})

export const generateMonthlyCreatorReportTask = task({
  id: 'creator-generate-monthly-report',
  retry: ANALYTICS_RETRY,
  run: async (payload: TenantEvent<GenerateMonthlyCreatorReportPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating monthly creator report', { tenantId })

    const { generateMonthlyCreatorReportJob } = await import('../../handlers/creators/analytics-aggregation.js')

    const result = await generateMonthlyCreatorReportJob.handler(
      createJobFromPayload('generate', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Generate monthly report failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const aggregateDailyMetricsScheduledTask = schedules.task({
  id: 'creator-aggregate-daily-metrics-scheduled',
  cron: '0 3 * * *', // Daily at 3 AM UTC
  run: async () => {
    logger.info('Running scheduled daily metrics aggregation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await aggregateCreatorDailyMetricsTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const generateWeeklySummaryScheduledTask = schedules.task({
  id: 'creator-generate-weekly-summary-scheduled',
  cron: '0 6 * * 0', // Sunday at 6 AM UTC
  run: async () => {
    logger.info('Running scheduled weekly summary generation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await generateWeeklyCreatorSummaryTask.trigger({ tenantId, notifyAdmins: true })
    }
    return { triggered: tenants.length }
  },
})

export const generateMonthlyReportScheduledTask = schedules.task({
  id: 'creator-generate-monthly-report-scheduled',
  cron: '0 4 1 * *', // 1st of month at 4 AM UTC
  run: async () => {
    logger.info('Running scheduled monthly report generation')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await generateMonthlyCreatorReportTask.trigger({
        tenantId,
        generatePdf: true,
        emailAdmins: true,
      })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const creatorAnalyticsTasks = [
  aggregateCreatorDailyMetricsTask,
  generateWeeklyCreatorSummaryTask,
  generateMonthlyCreatorReportTask,
  aggregateDailyMetricsScheduledTask,
  generateWeeklySummaryScheduledTask,
  generateMonthlyReportScheduledTask,
]
