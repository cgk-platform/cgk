/**
 * Creator Applications Trigger.dev Tasks
 *
 * Trigger.dev task definitions for creator application processing:
 * - Application received workflow
 * - Approval/rejection handling
 * - Admin notifications
 * - Analytics tracking
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  ProcessApplicationPayload,
  NotifyAdminNewApplicationPayload,
  TrackApplicationAnalyticsPayload,
  CreatePipelineEntryPayload,
  ProcessApprovalPayload,
  ProcessRejectionPayload,
  SendApprovalEmailPayload,
  SendRejectionEmailPayload,
} from '../../handlers/creators/application-processing'
import type {
  CreatorAppliedPayload,
  CreatorApprovedPayload,
  CreatorRejectedPayload,
} from '../../events'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const APPLICATION_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

// ============================================================
// APPLICATION PROCESSING TASKS
// ============================================================

export const processCreatorApplicationTask = task({
  id: 'creator-process-application',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<ProcessApplicationPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator application', { tenantId })

    const { processCreatorApplicationJob } = await import('../../handlers/creators/application-processing.js')

    const result = await processCreatorApplicationJob.handler(
      createJobFromPayload('process', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process application failed')
    }

    return result.data
  },
})

export const notifyAdminNewApplicationTask = task({
  id: 'creator-notify-admin-new-application',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<NotifyAdminNewApplicationPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Notifying admin of new application', { tenantId })

    const { notifyAdminNewApplicationJob } = await import('../../handlers/creators/application-processing.js')

    const result = await notifyAdminNewApplicationJob.handler(
      createJobFromPayload('notify', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Notify admin failed')
    }

    return result.data
  },
})

export const trackApplicationAnalyticsTask = task({
  id: 'creator-track-application-analytics',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<TrackApplicationAnalyticsPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Tracking application analytics', { tenantId })

    const { trackApplicationAnalyticsJob } = await import('../../handlers/creators/application-processing.js')

    const result = await trackApplicationAnalyticsJob.handler(
      createJobFromPayload('track', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Track analytics failed')
    }

    return result.data
  },
})

export const createPipelineEntryTask = task({
  id: 'creator-create-pipeline-entry',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<CreatePipelineEntryPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Creating pipeline entry', { tenantId })

    const { createPipelineEntryJob } = await import('../../handlers/creators/application-processing.js')

    const result = await createPipelineEntryJob.handler(
      createJobFromPayload('create', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Create pipeline entry failed')
    }

    return result.data
  },
})

// ============================================================
// APPROVAL/REJECTION TASKS
// ============================================================

export const processCreatorApprovalTask = task({
  id: 'creator-process-approval',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<ProcessApprovalPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator approval', { tenantId })

    const { processCreatorApprovalJob } = await import('../../handlers/creators/application-processing.js')

    const result = await processCreatorApprovalJob.handler(
      createJobFromPayload('process', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process approval failed')
    }

    return result.data
  },
})

export const processCreatorRejectionTask = task({
  id: 'creator-process-rejection',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<ProcessRejectionPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator rejection', { tenantId })

    const { processCreatorRejectionJob } = await import('../../handlers/creators/application-processing.js')

    const result = await processCreatorRejectionJob.handler(
      createJobFromPayload('process', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Process rejection failed')
    }

    return result.data
  },
})

export const sendApprovalEmailTask = task({
  id: 'creator-send-approval-email',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<SendApprovalEmailPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending approval email', { tenantId })

    const { sendApprovalEmailJob } = await import('../../handlers/creators/application-processing.js')

    const result = await sendApprovalEmailJob.handler(
      createJobFromPayload('send', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send approval email failed')
    }

    return result.data
  },
})

export const sendRejectionEmailTask = task({
  id: 'creator-send-rejection-email',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<SendRejectionEmailPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Sending rejection email', { tenantId })

    const { sendRejectionEmailJob } = await import('../../handlers/creators/application-processing.js')

    const result = await sendRejectionEmailJob.handler(
      createJobFromPayload('send', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Send rejection email failed')
    }

    return result.data
  },
})

// ============================================================
// EVENT HANDLER TASKS
// ============================================================

export const onCreatorAppliedTask = task({
  id: 'creator-on-applied',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<CreatorAppliedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling creator applied event', { tenantId })

    const { onCreatorAppliedJob } = await import('../../handlers/creators/application-processing.js')

    const result = await onCreatorAppliedJob.handler(
      createJobFromPayload('on', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'On creator applied failed')
    }

    return result.data
  },
})

export const onCreatorApprovedTask = task({
  id: 'creator-on-approved',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<CreatorApprovedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling creator approved event', { tenantId })

    const { onCreatorApprovedJob } = await import('../../handlers/creators/application-processing.js')

    const result = await onCreatorApprovedJob.handler(
      createJobFromPayload('on', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'On creator approved failed')
    }

    return result.data
  },
})

export const onCreatorRejectedTask = task({
  id: 'creator-on-rejected',
  retry: APPLICATION_RETRY,
  run: async (payload: TenantEvent<CreatorRejectedPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling creator rejected event', { tenantId })

    const { onCreatorRejectedJob } = await import('../../handlers/creators/application-processing.js')

    const result = await onCreatorRejectedJob.handler(
      createJobFromPayload('on', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'On creator rejected failed')
    }

    return result.data
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const applicationTasks = [
  processCreatorApplicationTask,
  notifyAdminNewApplicationTask,
  trackApplicationAnalyticsTask,
  createPipelineEntryTask,
  processCreatorApprovalTask,
  processCreatorRejectionTask,
  sendApprovalEmailTask,
  sendRejectionEmailTask,
  onCreatorAppliedTask,
  onCreatorApprovedTask,
  onCreatorRejectedTask,
]
