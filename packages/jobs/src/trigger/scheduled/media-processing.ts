/**
 * Media Processing Scheduled Tasks
 *
 * Trigger.dev task definitions for media processing:
 * - Creator file processing
 * - DAM ingestion
 * - Face detection
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  CreatorFileProcessingPayload,
  CreatorFileBatchProcessingPayload,
  DamIngestProjectPayload,
  DamBulkIngestPayload,
  DetectAssetFacesPayload,
  BatchDetectFacesPayload,
  ScanAllForFacesPayload,
} from '../../handlers/scheduled/media-processing'
import { createJobFromPayload, getActiveTenants } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const PROCESSING_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 60000,
}

const BATCH_RETRY = {
  maxAttempts: 2,
  factor: 2,
  minTimeoutInMs: 10000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// CREATOR FILE PROCESSING TASKS
// ============================================================

export const creatorFileProcessingTask = task({
  id: 'media-creator-file-processing',
  retry: PROCESSING_RETRY,
  run: async (payload: TenantEvent<CreatorFileProcessingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing creator file', { tenantId })

    const { creatorFileProcessingJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await creatorFileProcessingJob.handler(
      createJobFromPayload('creator', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Creator file processing failed')
    }

    return result.data
  },
})

export const creatorFileBatchProcessingTask = task({
  id: 'media-creator-file-batch-processing',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<CreatorFileBatchProcessingPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch processing creator files', { tenantId })

    const { creatorFileBatchProcessingJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await creatorFileBatchProcessingJob.handler(
      createJobFromPayload('creator', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Creator file batch processing failed')
    }

    return result.data
  },
})

// ============================================================
// DAM INGESTION TASKS
// ============================================================

export const damIngestProjectTask = task({
  id: 'media-dam-ingest-project',
  retry: PROCESSING_RETRY,
  run: async (payload: TenantEvent<DamIngestProjectPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Ingesting project to DAM', { tenantId })

    const { damIngestProjectJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await damIngestProjectJob.handler(
      createJobFromPayload('dam', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'DAM ingest project failed')
    }

    return result.data
  },
})

export const damBulkIngestTask = task({
  id: 'media-dam-bulk-ingest',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<DamBulkIngestPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Bulk ingesting to DAM', { tenantId })

    const { damBulkIngestJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await damBulkIngestJob.handler(
      createJobFromPayload('dam', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'DAM bulk ingest failed')
    }

    return result.data
  },
})

// ============================================================
// FACE DETECTION TASKS
// ============================================================

export const detectAssetFacesTask = task({
  id: 'media-detect-asset-faces',
  retry: PROCESSING_RETRY,
  run: async (payload: TenantEvent<DetectAssetFacesPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Detecting faces in asset', { tenantId })

    const { detectAssetFacesJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await detectAssetFacesJob.handler(
      createJobFromPayload('detect', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Face detection failed')
    }

    return result.data
  },
})

export const batchDetectFacesTask = task({
  id: 'media-batch-detect-faces',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<BatchDetectFacesPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch detecting faces', { tenantId })

    const { batchDetectFacesJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await batchDetectFacesJob.handler(
      createJobFromPayload('batch', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Batch face detection failed')
    }

    return result.data
  },
})

export const scanAllForFacesTask = task({
  id: 'media-scan-all-for-faces',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<ScanAllForFacesPayload>) => {
    const { tenantId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Scanning all assets for faces', { tenantId })

    const { scanAllForFacesJob } = await import('../../handlers/scheduled/media-processing.js')

    const result = await scanAllForFacesJob.handler(
      createJobFromPayload('scan', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Scan all for faces failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const damBulkIngestScheduledTask = schedules.task({
  id: 'media-dam-bulk-ingest-scheduled',
  cron: '0 4 * * *', // 4 AM daily
  run: async () => {
    logger.info('Running scheduled DAM bulk ingest')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await damBulkIngestTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

export const scanAllForFacesScheduledTask = schedules.task({
  id: 'media-scan-all-for-faces-scheduled',
  cron: '0 3 * * 0', // 3 AM every Sunday
  run: async () => {
    logger.info('Running scheduled face scan')
    const tenants = await getActiveTenants()
    for (const tenantId of tenants) {
      await scanAllForFacesTask.trigger({ tenantId })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const mediaProcessingTasks = [
  creatorFileProcessingTask,
  creatorFileBatchProcessingTask,
  damIngestProjectTask,
  damBulkIngestTask,
  detectAssetFacesTask,
  batchDetectFacesTask,
  scanAllForFacesTask,
  damBulkIngestScheduledTask,
  scanAllForFacesScheduledTask,
]
