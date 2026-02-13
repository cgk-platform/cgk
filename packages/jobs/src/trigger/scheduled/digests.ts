/**
 * Digest Scheduled Tasks
 *
 * Trigger.dev task definitions for digest notifications:
 * - Admin daily digest
 * - At-risk projects alerts
 * - Creator weekly digest
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  AdminDailyDigestPayload,
  AtRiskProjectsAlertPayload,
  CreatorWeeklyDigestPayload,
} from '../../handlers/scheduled/digests'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const DIGEST_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

// ============================================================
// ADMIN DAILY DIGEST TASK
// ============================================================

export const adminDailyDigestTask = task({
  id: 'digest-admin-daily',
  retry: DIGEST_RETRY,
  run: async (payload: TenantEvent<AdminDailyDigestPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating admin daily digest', { tenantId })

    const { adminDailyDigestJob } = await import('../../handlers/scheduled/digests.js')

    const result = await adminDailyDigestJob.handler(
      createJobFromPayload('admin', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Admin daily digest failed')
    }

    return result.data
  },
})

// ============================================================
// AT-RISK PROJECTS ALERT TASK
// ============================================================

export const atRiskProjectsAlertTask = task({
  id: 'digest-at-risk-projects',
  retry: DIGEST_RETRY,
  run: async (payload: TenantEvent<AtRiskProjectsAlertPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Checking at-risk projects', { tenantId })

    const { atRiskProjectsAlertJob } = await import('../../handlers/scheduled/digests.js')

    const result = await atRiskProjectsAlertJob.handler(
      createJobFromPayload('at', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'At-risk projects alert failed')
    }

    return result.data
  },
})

// ============================================================
// CREATOR WEEKLY DIGEST TASK
// ============================================================

export const creatorWeeklyDigestTask = task({
  id: 'digest-creator-weekly',
  retry: DIGEST_RETRY,
  run: async (payload: TenantEvent<CreatorWeeklyDigestPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Generating creator weekly digest', { tenantId })

    const { creatorWeeklyDigestJob } = await import('../../handlers/scheduled/digests.js')

    const result = await creatorWeeklyDigestJob.handler(
      createJobFromPayload('creator', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Creator weekly digest failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const adminDailyDigestScheduledTask = schedules.task({
  id: 'digest-admin-daily-scheduled',
  cron: '0 8 * * *', // 8 AM daily
  run: async () => {
    logger.info('Running scheduled admin daily digest')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await adminDailyDigestTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const atRiskProjectsScheduledTask = schedules.task({
  id: 'digest-at-risk-projects-scheduled',
  cron: '0 9 * * *', // 9 AM daily
  run: async () => {
    logger.info('Running scheduled at-risk projects check')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await atRiskProjectsAlertTask.trigger({ tenantId, alertTime: 'morning' })
    }
    return { triggered: tenants.length }
  },
})

export const creatorWeeklyDigestScheduledTask = schedules.task({
  id: 'digest-creator-weekly-scheduled',
  cron: '0 10 * * 1', // 10 AM every Monday
  run: async () => {
    logger.info('Running scheduled creator weekly digest')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await creatorWeeklyDigestTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const digestTasks = [
  adminDailyDigestTask,
  atRiskProjectsAlertTask,
  creatorWeeklyDigestTask,
  adminDailyDigestScheduledTask,
  atRiskProjectsScheduledTask,
  creatorWeeklyDigestScheduledTask,
]
