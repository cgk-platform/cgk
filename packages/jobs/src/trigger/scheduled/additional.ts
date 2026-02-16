/**
 * Additional Scheduled Tasks
 *
 * Trigger.dev task definitions for miscellaneous scheduled jobs:
 * - BRI tasks (Gmail, Slack, Meetings)
 * - DAM tasks (Rights expiry, Mux backfill)
 * - E-sign tasks
 * - Escalation tasks
 * - Gift card tasks
 * - Commission tasks
 * - Onboarding tasks
 * - Project automation
 * - Integration syncs
 * - Compliance tasks
 * - Agent tasks
 * - Brand context tasks
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  BriGmailSyncPayload,
  BriSlackSyncPayload,
  BriMeetingSyncPayload,
  BriDataProcessPayload,
  DamRightsExpiryCheckPayload,
  DamMuxBackfillPayload,
  EsignReminderPayload,
  EsignExpiryCheckPayload,
  EscalationCheckPayload,
  GiftCardEmailPayload,
  GiftCardExpiryNotifyPayload,
  CommissionMaturationCheckPayload,
  OnboardingCheckPayload,
  ProjectAutomationPayload,
  ScheduledReportPayload,
  StripeTokenRefreshPayload,
  KlaviyoSyncPayload,
  GoogleDriveSyncPayload,
  W9ReminderPayload,
  AgentMemoryDecayPayload,
  AgentContextPrunePayload,
  BrandContextRefreshPayload,
  BrandContextCleanupPayload,
  BrandStalenessCheckPayload,
  BrandUrlSyncPayload,
} from '../../handlers/scheduled/additional-tasks'
import { createJobFromPayload, getActiveTenants } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const STANDARD_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

const SYNC_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 30000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// BRI TASKS
// ============================================================

export const briGmailSyncTask = task({
  id: 'bri-gmail-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<BriGmailSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing Gmail', { tenantId })
    const { briGmailSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await briGmailSyncJob.handler(createJobFromPayload('bri-gmail-sync', payload))
    if (!result.success) throw new Error(result.error?.message || 'Gmail sync failed')
    return result.data
  },
})

export const briSlackSyncTask = task({
  id: 'bri-slack-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<BriSlackSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing Slack', { tenantId })
    const { briSlackSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await briSlackSyncJob.handler(createJobFromPayload('bri-slack-sync', payload))
    if (!result.success) throw new Error(result.error?.message || 'Slack sync failed')
    return result.data
  },
})

export const briMeetingSyncTask = task({
  id: 'bri-meeting-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<BriMeetingSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing meetings', { tenantId })
    const { briMeetingSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await briMeetingSyncJob.handler(createJobFromPayload('bri-meeting-sync', payload))
    if (!result.success) throw new Error(result.error?.message || 'Meeting sync failed')
    return result.data
  },
})

export const briDataProcessTask = task({
  id: 'bri-data-process',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<BriDataProcessPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Processing BRI data', { tenantId })
    const { briDataProcessJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await briDataProcessJob.handler(createJobFromPayload('bri-data-process', payload))
    if (!result.success) throw new Error(result.error?.message || 'BRI data process failed')
    return result.data
  },
})

// ============================================================
// DAM TASKS
// ============================================================

export const damRightsExpiryCheckTask = task({
  id: 'dam-rights-expiry-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<DamRightsExpiryCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking rights expiry', { tenantId })
    const { damRightsExpiryCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await damRightsExpiryCheckJob.handler(createJobFromPayload('dam-rights-expiry-check', payload))
    if (!result.success) throw new Error(result.error?.message || 'Rights expiry check failed')
    return result.data
  },
})

export const damMuxBackfillTask = task({
  id: 'dam-mux-backfill',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<DamMuxBackfillPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Backfilling Mux', { tenantId })
    const { damMuxBackfillJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await damMuxBackfillJob.handler(createJobFromPayload('dam-mux-backfill', payload))
    if (!result.success) throw new Error(result.error?.message || 'Mux backfill failed')
    return result.data
  },
})

// ============================================================
// E-SIGN TASKS
// ============================================================

export const esignReminderTask = task({
  id: 'esign-reminder',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<EsignReminderPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Sending e-sign reminders', { tenantId })
    const { esignReminderJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await esignReminderJob.handler(createJobFromPayload('esign-reminder', payload))
    if (!result.success) throw new Error(result.error?.message || 'E-sign reminder failed')
    return result.data
  },
})

export const esignExpiryCheckTask = task({
  id: 'esign-expiry-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<EsignExpiryCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking e-sign expiry', { tenantId })
    const { esignExpiryCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await esignExpiryCheckJob.handler(createJobFromPayload('esign-expiry-check', payload))
    if (!result.success) throw new Error(result.error?.message || 'E-sign expiry check failed')
    return result.data
  },
})

// ============================================================
// ESCALATION TASKS
// ============================================================

export const escalationCheckTask = task({
  id: 'escalation-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<EscalationCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking escalations', { tenantId })
    const { escalationCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await escalationCheckJob.handler(createJobFromPayload('escalation', payload))
    if (!result.success) throw new Error(result.error?.message || 'Escalation check failed')
    return result.data
  },
})

// ============================================================
// GIFT CARD TASKS
// ============================================================

export const giftCardEmailTask = task({
  id: 'giftcard-email',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<GiftCardEmailPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Sending gift card email', { tenantId })
    const { giftCardEmailJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await giftCardEmailJob.handler(createJobFromPayload('giftcard-email', payload))
    if (!result.success) throw new Error(result.error?.message || 'Gift card email failed')
    return result.data
  },
})

export const giftCardExpiryNotifyTask = task({
  id: 'giftcard-expiry-notify',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<GiftCardExpiryNotifyPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Notifying gift card expiry', { tenantId })
    const { giftCardExpiryNotifyJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await giftCardExpiryNotifyJob.handler(createJobFromPayload('giftcard-expiry', payload))
    if (!result.success) throw new Error(result.error?.message || 'Gift card expiry notify failed')
    return result.data
  },
})

// ============================================================
// COMMISSION TASKS
// ============================================================

export const commissionMaturationCheckTask = task({
  id: 'commission-maturation-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<CommissionMaturationCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking commission maturation', { tenantId })
    const { commissionMaturationCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await commissionMaturationCheckJob.handler(createJobFromPayload('commission', payload))
    if (!result.success) throw new Error(result.error?.message || 'Commission maturation check failed')
    return result.data
  },
})

// ============================================================
// ONBOARDING TASKS
// ============================================================

export const onboardingCheckTask = task({
  id: 'onboarding-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<OnboardingCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking onboarding', { tenantId })
    const { onboardingCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await onboardingCheckJob.handler(createJobFromPayload('onboarding', payload))
    if (!result.success) throw new Error(result.error?.message || 'Onboarding check failed')
    return result.data
  },
})

// ============================================================
// PROJECT AUTOMATION TASKS
// ============================================================

export const projectAutomationTask = task({
  id: 'project-automation',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<ProjectAutomationPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Running project automation', { tenantId })
    const { projectAutomationJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await projectAutomationJob.handler(createJobFromPayload('project-automation', payload))
    if (!result.success) throw new Error(result.error?.message || 'Project automation failed')
    return result.data
  },
})

// ============================================================
// REPORT TASKS
// ============================================================

export const scheduledReportTask = task({
  id: 'scheduled-report',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<ScheduledReportPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Generating scheduled report', { tenantId })
    const { scheduledReportJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await scheduledReportJob.handler(createJobFromPayload('report', payload))
    if (!result.success) throw new Error(result.error?.message || 'Scheduled report failed')
    return result.data
  },
})

// ============================================================
// INTEGRATION TASKS
// ============================================================

export const stripeTokenRefreshTask = task({
  id: 'stripe-token-refresh',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<StripeTokenRefreshPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Refreshing Stripe tokens', { tenantId })
    const { stripeTokenRefreshJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await stripeTokenRefreshJob.handler(createJobFromPayload('stripe-token-refresh', payload))
    if (!result.success) throw new Error(result.error?.message || 'Stripe token refresh failed')
    return result.data
  },
})

export const klaviyoSyncTask = task({
  id: 'klaviyo-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<KlaviyoSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing Klaviyo', { tenantId })
    const { klaviyoSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await klaviyoSyncJob.handler(createJobFromPayload('klaviyo', payload))
    if (!result.success) throw new Error(result.error?.message || 'Klaviyo sync failed')
    return result.data
  },
})

export const googleDriveSyncTask = task({
  id: 'gdrive-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<GoogleDriveSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing Google Drive', { tenantId })
    const { googleDriveSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await googleDriveSyncJob.handler(createJobFromPayload('gdrive', payload))
    if (!result.success) throw new Error(result.error?.message || 'Google Drive sync failed')
    return result.data
  },
})

// ============================================================
// COMPLIANCE TASKS
// ============================================================

export const w9ReminderTask = task({
  id: 'compliance-w9-reminder',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<W9ReminderPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Sending W9 reminders', { tenantId })
    const { w9ReminderJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await w9ReminderJob.handler(createJobFromPayload('w9-reminder', payload))
    if (!result.success) throw new Error(result.error?.message || 'W9 reminder failed')
    return result.data
  },
})

// ============================================================
// AGENT TASKS
// ============================================================

export const agentMemoryDecayTask = task({
  id: 'agent-memory-decay',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<AgentMemoryDecayPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Decaying agent memory', { tenantId })
    const { agentMemoryDecayJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await agentMemoryDecayJob.handler(createJobFromPayload('agent-memory-decay', payload))
    if (!result.success) throw new Error(result.error?.message || 'Agent memory decay failed')
    return result.data
  },
})

export const agentContextPruneTask = task({
  id: 'agent-context-prune',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<AgentContextPrunePayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Pruning agent context', { tenantId })
    const { agentContextPruneJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await agentContextPruneJob.handler(createJobFromPayload('agent-context-prune', payload))
    if (!result.success) throw new Error(result.error?.message || 'Agent context prune failed')
    return result.data
  },
})

// ============================================================
// BRAND CONTEXT TASKS
// ============================================================

export const brandContextRefreshTask = task({
  id: 'brand-context-refresh',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<BrandContextRefreshPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Refreshing brand context', { tenantId })
    const { brandContextRefreshJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await brandContextRefreshJob.handler(createJobFromPayload('brand-context-refresh', payload))
    if (!result.success) throw new Error(result.error?.message || 'Brand context refresh failed')
    return result.data
  },
})

export const brandContextCleanupTask = task({
  id: 'brand-context-cleanup',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<BrandContextCleanupPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Cleaning up brand context', { tenantId })
    const { brandContextCleanupJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await brandContextCleanupJob.handler(createJobFromPayload('brand-context-cleanup', payload))
    if (!result.success) throw new Error(result.error?.message || 'Brand context cleanup failed')
    return result.data
  },
})

export const brandStalenessCheckTask = task({
  id: 'brand-staleness-check',
  retry: STANDARD_RETRY,
  run: async (payload: TenantEvent<BrandStalenessCheckPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Checking brand staleness', { tenantId })
    const { brandStalenessCheckJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await brandStalenessCheckJob.handler(createJobFromPayload('brand-staleness-check', payload))
    if (!result.success) throw new Error(result.error?.message || 'Brand staleness check failed')
    return result.data
  },
})

export const brandUrlSyncTask = task({
  id: 'brand-url-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<BrandUrlSyncPayload>) => {
    const { tenantId } = payload
    if (!tenantId) throw new Error('tenantId is required')
    logger.info('Syncing brand URLs', { tenantId })
    const { brandUrlSyncJob } = await import('../../handlers/scheduled/additional-tasks.js')
    const result = await brandUrlSyncJob.handler(createJobFromPayload('brand-url-sync', payload))
    if (!result.success) throw new Error(result.error?.message || 'Brand URL sync failed')
    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const briGmailSyncScheduledTask = schedules.task({
  id: 'bri-gmail-sync-scheduled',
  cron: '*/30 * * * *',
  run: async () => {
    logger.info('Running scheduled Gmail sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await briGmailSyncTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const briSlackSyncScheduledTask = schedules.task({
  id: 'bri-slack-sync-scheduled',
  cron: '*/30 * * * *',
  run: async () => {
    logger.info('Running scheduled Slack sync')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await briSlackSyncTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const damRightsExpiryScheduledTask = schedules.task({
  id: 'dam-rights-expiry-scheduled',
  cron: '0 8 * * *',
  run: async () => {
    logger.info('Running scheduled rights expiry check')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await damRightsExpiryCheckTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const escalationCheckScheduledTask = schedules.task({
  id: 'escalation-check-scheduled',
  cron: '0 */2 * * *',
  run: async () => {
    logger.info('Running scheduled escalation check')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await escalationCheckTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const commissionMaturationScheduledTask = schedules.task({
  id: 'commission-maturation-scheduled',
  cron: '0 6 * * *',
  run: async () => {
    logger.info('Running scheduled commission maturation check')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await commissionMaturationCheckTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const onboardingCheckScheduledTask = schedules.task({
  id: 'onboarding-check-scheduled',
  cron: '0 10,16 * * *',
  run: async () => {
    logger.info('Running scheduled onboarding check')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await onboardingCheckTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const agentMemoryDecayScheduledTask = schedules.task({
  id: 'agent-memory-decay-scheduled',
  cron: '0 5 * * *',
  run: async () => {
    logger.info('Running scheduled agent memory decay')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await agentMemoryDecayTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

export const brandContextCleanupScheduledTask = schedules.task({
  id: 'brand-context-cleanup-scheduled',
  cron: '0 */6 * * *',
  run: async () => {
    logger.info('Running scheduled brand context cleanup')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) { await brandContextCleanupTask.trigger({ tenantId }) }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const additionalTasks = [
  briGmailSyncTask,
  briSlackSyncTask,
  briMeetingSyncTask,
  briDataProcessTask,
  damRightsExpiryCheckTask,
  damMuxBackfillTask,
  esignReminderTask,
  esignExpiryCheckTask,
  escalationCheckTask,
  giftCardEmailTask,
  giftCardExpiryNotifyTask,
  commissionMaturationCheckTask,
  onboardingCheckTask,
  projectAutomationTask,
  scheduledReportTask,
  stripeTokenRefreshTask,
  klaviyoSyncTask,
  googleDriveSyncTask,
  w9ReminderTask,
  agentMemoryDecayTask,
  agentContextPruneTask,
  brandContextRefreshTask,
  brandContextCleanupTask,
  brandStalenessCheckTask,
  brandUrlSyncTask,
  briGmailSyncScheduledTask,
  briSlackSyncScheduledTask,
  damRightsExpiryScheduledTask,
  escalationCheckScheduledTask,
  commissionMaturationScheduledTask,
  onboardingCheckScheduledTask,
  agentMemoryDecayScheduledTask,
  brandContextCleanupScheduledTask,
]
