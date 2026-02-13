/**
 * ML Training Trigger.dev Tasks
 *
 * Trigger.dev task definitions for ML training pipeline:
 * - Attribution model training
 * - 30-minute timeout with checkpointing support
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 * @ai-note Configured for 30 minute timeout (1800 seconds)
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { AttributionMLTrainingPayload } from '../../handlers/analytics/types'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const ML_TRAINING_RETRY = {
  maxAttempts: 2, // Limited retries for long-running job
  factor: 2,
  minTimeoutInMs: 60000, // 1 minute delay before retry
  maxTimeoutInMs: 300000,
}

// ============================================================
// ML TRAINING TASKS
// ============================================================

export const attributionMLTrainingTask = task({
  id: 'analytics-attribution-ml-training',
  retry: ML_TRAINING_RETRY,
  run: async (payload: AttributionMLTrainingPayload) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Starting attribution ML training', { tenantId })

    const { attributionMLTrainingJob } = await import('../../handlers/analytics/ml-training.js')

    const result = await attributionMLTrainingJob.handler(
      createJobFromPayload('attribution-ml-training', payload, { maxAttempts: 2 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Attribution ML training failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const attributionMLTrainingScheduledTask = schedules.task({
  id: 'analytics-attribution-ml-training-scheduled',
  cron: '0 4 * * *', // 4 AM daily
  run: async () => {
    logger.info('Running scheduled attribution ML training')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await attributionMLTrainingTask.trigger({ tenantId, trainingDays: 90 })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const mlTrainingTasks = [
  attributionMLTrainingTask,
  attributionMLTrainingScheduledTask,
]
