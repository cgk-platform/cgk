/**
 * Creator Communications Trigger.dev Tasks
 *
 * Trigger.dev task definitions for creator communications:
 * - Email queue processing
 * - Welcome email sequences
 * - Reminder systems
 * - Email cancellation and retry
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  ProcessCreatorEmailQueuePayload,
  ScheduleWelcomeSequencePayload,
  CancelPendingEmailsPayload,
  RetryFailedEmailsPayload,
  QueueCreatorEmailPayload,
  QueueProjectEmailPayload,
  QueuePaymentEmailPayload,
  ProductDeliveryRemindersPayload,
  DeadlineRemindersPayload,
  NoResponseRemindersPayload,
  AbandonedApplicationRemindersPayload,
  SendCreatorReminderPayload,
  ApprovalRemindersPayload,
} from '../../handlers/creators/communications'
import type { CreatorSetupCompletePayload } from '../../events'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const EMAIL_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

const REMINDER_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 10000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// EMAIL QUEUE TASKS
// ============================================================

export const processCreatorEmailQueueTask = task({
  id: 'creator-process-email-queue',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<ProcessCreatorEmailQueuePayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator email queue', { tenantId })

    const { processCreatorEmailQueueJob } = await import('../../handlers/creators/communications.js')

    const result = await processCreatorEmailQueueJob.handler(
      createJobFromPayload('process', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process email queue failed')
    }

    return result.data
  },
})

export const scheduleCreatorWelcomeSequenceTask = task({
  id: 'creator-schedule-welcome-sequence',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<ScheduleWelcomeSequencePayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Scheduling creator welcome sequence', { tenantId })

    const { scheduleCreatorWelcomeSequenceJob } = await import('../../handlers/creators/communications.js')

    const result = await scheduleCreatorWelcomeSequenceJob.handler(
      createJobFromPayload('schedule', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Schedule welcome sequence failed')
    }

    return result.data
  },
})

export const cancelCreatorPendingEmailsTask = task({
  id: 'creator-cancel-pending-emails',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<CancelPendingEmailsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Cancelling creator pending emails', { tenantId })

    const { cancelCreatorPendingEmailsJob } = await import('../../handlers/creators/communications.js')

    const result = await cancelCreatorPendingEmailsJob.handler(
      createJobFromPayload('cancel', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Cancel pending emails failed')
    }

    return result.data
  },
})

export const retryFailedCreatorEmailsTask = task({
  id: 'creator-retry-failed-emails',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<RetryFailedEmailsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Retrying failed creator emails', { tenantId })

    const { retryFailedCreatorEmailsJob } = await import('../../handlers/creators/communications.js')

    const result = await retryFailedCreatorEmailsJob.handler(
      createJobFromPayload('retry', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Retry failed emails failed')
    }

    return result.data
  },
})

// ============================================================
// QUEUE EMAIL TASKS
// ============================================================

export const queueCreatorEmailTask = task({
  id: 'creator-queue-email',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<QueueCreatorEmailPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Queuing creator email', { tenantId })

    const { queueCreatorEmailJob } = await import('../../handlers/creators/communications.js')

    const result = await queueCreatorEmailJob.handler(
      createJobFromPayload('queue', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Queue creator email failed')
    }

    return result.data
  },
})

export const queueProjectEmailTask = task({
  id: 'creator-queue-project-email',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<QueueProjectEmailPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Queuing project email', { tenantId })

    const { queueProjectEmailJob } = await import('../../handlers/creators/communications.js')

    const result = await queueProjectEmailJob.handler(
      createJobFromPayload('queue', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Queue project email failed')
    }

    return result.data
  },
})

export const queuePaymentEmailTask = task({
  id: 'creator-queue-payment-email',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<QueuePaymentEmailPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Queuing payment email', { tenantId })

    const { queuePaymentEmailJob } = await import('../../handlers/creators/communications.js')

    const result = await queuePaymentEmailJob.handler(
      createJobFromPayload('queue', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Queue payment email failed')
    }

    return result.data
  },
})

// ============================================================
// SETUP COMPLETE TASK
// ============================================================

export const onCreatorSetupCompleteTask = task({
  id: 'creator-on-setup-complete',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<CreatorSetupCompletePayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator setup complete', { tenantId })

    const { onCreatorSetupCompleteJob } = await import('../../handlers/creators/communications.js')

    const result = await onCreatorSetupCompleteJob.handler(
      createJobFromPayload('setup', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Creator setup complete failed')
    }

    return result.data
  },
})

// ============================================================
// REMINDER TASKS
// ============================================================

export const creatorProductDeliveryRemindersTask = task({
  id: 'creator-product-delivery-reminders',
  retry: REMINDER_RETRY,
  run: async (payload: TenantEvent<ProductDeliveryRemindersPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing product delivery reminders', { tenantId })

    const { creatorProductDeliveryRemindersJob } = await import('../../handlers/creators/communications.js')

    const result = await creatorProductDeliveryRemindersJob.handler(
      createJobFromPayload('product', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Product delivery reminders failed')
    }

    return result.data
  },
})

export const creatorDeadlineRemindersTask = task({
  id: 'creator-deadline-reminders',
  retry: REMINDER_RETRY,
  run: async (payload: TenantEvent<DeadlineRemindersPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing deadline reminders', { tenantId })

    const { creatorDeadlineRemindersJob } = await import('../../handlers/creators/communications.js')

    const result = await creatorDeadlineRemindersJob.handler(
      createJobFromPayload('deadline', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Deadline reminders failed')
    }

    return result.data
  },
})

export const creatorNoResponseRemindersTask = task({
  id: 'creator-no-response-reminders',
  retry: REMINDER_RETRY,
  run: async (payload: TenantEvent<NoResponseRemindersPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing no response reminders', { tenantId })

    const { creatorNoResponseRemindersJob } = await import('../../handlers/creators/communications.js')

    const result = await creatorNoResponseRemindersJob.handler(
      createJobFromPayload('no', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'No response reminders failed')
    }

    return result.data
  },
})

export const creatorAbandonedApplicationRemindersTask = task({
  id: 'creator-abandoned-application-reminders',
  retry: REMINDER_RETRY,
  run: async (payload: TenantEvent<AbandonedApplicationRemindersPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing abandoned application reminders', { tenantId })

    const { creatorAbandonedApplicationRemindersJob } = await import('../../handlers/creators/communications.js')

    const result = await creatorAbandonedApplicationRemindersJob.handler(
      createJobFromPayload('abandoned', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Abandoned application reminders failed')
    }

    return result.data
  },
})

export const sendCreatorReminderTask = task({
  id: 'creator-send-reminder',
  retry: EMAIL_RETRY,
  run: async (payload: TenantEvent<SendCreatorReminderPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending creator reminder', { tenantId })

    const { sendCreatorReminderJob } = await import('../../handlers/creators/communications.js')

    const result = await sendCreatorReminderJob.handler(
      createJobFromPayload('send', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send creator reminder failed')
    }

    return result.data
  },
})

export const checkApprovalRemindersTask = task({
  id: 'creator-check-approval-reminders',
  retry: REMINDER_RETRY,
  run: async (payload: TenantEvent<ApprovalRemindersPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Checking approval reminders', { tenantId })

    const { checkApprovalRemindersJob } = await import('../../handlers/creators/communications.js')

    const result = await checkApprovalRemindersJob.handler(
      createJobFromPayload('check', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Check approval reminders failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const processEmailQueueScheduledTask = schedules.task({
  id: 'creator-process-email-queue-scheduled',
  cron: '*/5 * * * *', // Every 5 minutes
  run: async () => {
    logger.info('Running scheduled email queue processing')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await processCreatorEmailQueueTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const approvalRemindersScheduledTask = schedules.task({
  id: 'creator-approval-reminders-scheduled',
  cron: '0 9 * * *', // Daily at 9 AM UTC
  run: async () => {
    logger.info('Running scheduled approval reminders')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await checkApprovalRemindersTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const productDeliveryRemindersScheduledTask = schedules.task({
  id: 'creator-product-delivery-reminders-scheduled',
  cron: '0 10 * * *', // Daily at 10 AM UTC
  run: async () => {
    logger.info('Running scheduled product delivery reminders')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await creatorProductDeliveryRemindersTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const deadlineRemindersScheduledTask = schedules.task({
  id: 'creator-deadline-reminders-scheduled',
  cron: '0 9 * * *', // Daily at 9 AM UTC
  run: async () => {
    logger.info('Running scheduled deadline reminders')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await creatorDeadlineRemindersTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const noResponseRemindersScheduledTask = schedules.task({
  id: 'creator-no-response-reminders-scheduled',
  cron: '0 14 * * *', // Daily at 2 PM UTC
  run: async () => {
    logger.info('Running scheduled no response reminders')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await creatorNoResponseRemindersTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const abandonedApplicationRemindersScheduledTask = schedules.task({
  id: 'creator-abandoned-application-reminders-scheduled',
  cron: '15 * * * *', // Every hour at :15
  run: async () => {
    logger.info('Running scheduled abandoned application reminders')
    const tenants = ['system']
    // Run all check types
    const checkTypes = ['1h_sms', '24h_email', '48h_final'] as const
    for (const tenantId of tenants) {
      for (const checkType of checkTypes) {
        await creatorAbandonedApplicationRemindersTask.trigger({ tenantId, checkType })
      }
    }
    return { triggered: tenants.length * checkTypes.length }
  },
})

export const retryFailedEmailsScheduledTask = schedules.task({
  id: 'creator-retry-failed-emails-scheduled',
  cron: '30 * * * *', // Every hour at :30
  run: async () => {
    logger.info('Running scheduled retry failed emails')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await retryFailedCreatorEmailsTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const communicationsTasks = [
  processCreatorEmailQueueTask,
  scheduleCreatorWelcomeSequenceTask,
  cancelCreatorPendingEmailsTask,
  retryFailedCreatorEmailsTask,
  queueCreatorEmailTask,
  queueProjectEmailTask,
  queuePaymentEmailTask,
  onCreatorSetupCompleteTask,
  creatorProductDeliveryRemindersTask,
  creatorDeadlineRemindersTask,
  creatorNoResponseRemindersTask,
  creatorAbandonedApplicationRemindersTask,
  sendCreatorReminderTask,
  checkApprovalRemindersTask,
  processEmailQueueScheduledTask,
  approvalRemindersScheduledTask,
  productDeliveryRemindersScheduledTask,
  deadlineRemindersScheduledTask,
  noResponseRemindersScheduledTask,
  abandonedApplicationRemindersScheduledTask,
  retryFailedEmailsScheduledTask,
]
