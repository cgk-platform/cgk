/**
 * Webhook Queue Processing Jobs
 *
 * Processes pending webhooks and handles failures:
 * - Process queue every 5 minutes (100 pending max)
 * - Mark processed, increment retry on failure
 * - Clean up old processed webhooks
 *
 * @ai-pattern webhook-processing
 * @ai-critical Webhooks must be processed reliably with retries
 */

import { defineJob } from '../../define'
import type { TenantEvent } from '../../events'

// ============================================================
// WEBHOOK QUEUE PAYLOAD TYPES
// ============================================================

export interface ProcessWebhookQueuePayload {
  tenantId: string
  /** Maximum webhooks to process per run (default 100) */
  limit?: number
  /** Process only specific webhook types */
  webhookTypes?: string[]
}

export interface ProcessSingleWebhookPayload {
  tenantId: string
  webhookId: string
  webhookType: string
  payload: Record<string, unknown>
  targetUrl: string
  attempt: number
  maxAttempts: number
}

export interface WebhookQueueCleanupPayload {
  tenantId: string
  /** Delete webhooks older than X days (default 30) */
  olderThanDays?: number
  /** Only delete successfully processed webhooks */
  processedOnly?: boolean
}

export interface WebhookQueueHealthCheckPayload {
  tenantId: string
}

// ============================================================
// WEBHOOK QUEUE RESULT TYPES
// ============================================================

interface WebhookQueueStatus {
  pending: number
  processing: number
  failed: number
  succeeded: number
  oldestPending?: Date
}

interface WebhookProcessResult {
  webhookId: string
  success: boolean
  statusCode?: number
  responseTime?: number
  error?: string
  attempt: number
  nextRetryAt?: Date
}

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const WEBHOOK_RETRY_DELAYS = [
  60 * 1000, // 1 minute
  5 * 60 * 1000, // 5 minutes
  30 * 60 * 1000, // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
  24 * 60 * 60 * 1000, // 24 hours
]

const MAX_WEBHOOK_ATTEMPTS = 5

/**
 * Calculate next retry delay based on attempt number
 */
function getRetryDelay(attempt: number): number {
  const index = Math.min(attempt - 1, WEBHOOK_RETRY_DELAYS.length - 1)
  return WEBHOOK_RETRY_DELAYS[index]!
}

// ============================================================
// WEBHOOK QUEUE JOBS
// ============================================================

/**
 * Process webhook queue - every 5 minutes
 *
 * Fetches pending webhooks and processes them.
 * Marks successful ones as processed.
 * Increments retry count for failures.
 */
export const processWebhookQueueJob = defineJob<TenantEvent<ProcessWebhookQueuePayload>>({
  name: 'webhook/process-queue',
  handler: async (job) => {
    const { tenantId, limit = 100, webhookTypes } = job.payload

    console.log(`[Webhook] Processing queue for tenant ${tenantId} (limit: ${limit})`)

    // Query pending webhooks
    // Would use: SELECT * FROM webhook_queue
    //            WHERE status = 'pending'
    //            AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    //            AND tenant_id = tenantId
    //            ORDER BY created_at ASC
    //            LIMIT limit
    const pendingWebhooks: Array<{
      id: string
      type: string
      payload: Record<string, unknown>
      targetUrl: string
      attempt: number
      maxAttempts: number
    }> = []

    // Filter by webhook types if specified
    const webhooksToProcess = webhookTypes
      ? pendingWebhooks.filter((w) => webhookTypes.includes(w.type))
      : pendingWebhooks

    const results: WebhookProcessResult[] = []
    let succeeded = 0
    let failed = 0

    for (const webhook of webhooksToProcess) {
      const result = await processWebhook({
        tenantId,
        webhookId: webhook.id,
        webhookType: webhook.type,
        payload: webhook.payload,
        targetUrl: webhook.targetUrl,
        attempt: webhook.attempt + 1,
        maxAttempts: webhook.maxAttempts || MAX_WEBHOOK_ATTEMPTS,
      })

      results.push(result)

      if (result.success) {
        succeeded++
        // Mark as processed
        // Would update: UPDATE webhook_queue
        //               SET status = 'processed', processed_at = NOW()
        //               WHERE id = webhook.id
      } else {
        failed++

        if (result.attempt >= (webhook.maxAttempts || MAX_WEBHOOK_ATTEMPTS)) {
          // Mark as permanently failed
          console.warn(`[Webhook] ${webhook.id} exceeded max attempts, marking as failed`)
          // Would update: UPDATE webhook_queue
          //               SET status = 'failed', failed_at = NOW()
          //               WHERE id = webhook.id
        } else {
          // Schedule retry
          const retryDelay = getRetryDelay(result.attempt)
          const nextRetryAt = new Date(Date.now() + retryDelay)
          console.log(`[Webhook] ${webhook.id} failed, scheduling retry at ${nextRetryAt}`)
          // Would update: UPDATE webhook_queue
          //               SET attempt = attempt + 1, scheduled_at = nextRetryAt
          //               WHERE id = webhook.id
        }
      }
    }

    console.log(
      `[Webhook] Queue processing complete: ${succeeded} succeeded, ${failed} failed out of ${webhooksToProcess.length}`
    )

    return {
      success: true,
      data: {
        tenantId,
        processed: webhooksToProcess.length,
        succeeded,
        failed,
        processedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

/**
 * Process a single webhook
 *
 * Delivers a webhook payload to the target URL.
 * Handles retries with exponential backoff.
 */
export const processSingleWebhookJob = defineJob<TenantEvent<ProcessSingleWebhookPayload>>({
  name: 'webhook/process-single',
  handler: async (job) => {
    const { tenantId, webhookId, webhookType, payload, targetUrl, attempt, maxAttempts } = job.payload

    const result = await processWebhook({
      tenantId,
      webhookId,
      webhookType,
      payload,
      targetUrl,
      attempt,
      maxAttempts,
    })

    // Update webhook status based on result
    if (result.success) {
      console.log(`[Webhook] ${webhookId} delivered successfully`)
    } else if (result.attempt >= maxAttempts) {
      console.error(`[Webhook] ${webhookId} permanently failed after ${maxAttempts} attempts`)
    } else {
      console.warn(`[Webhook] ${webhookId} failed, will retry (attempt ${result.attempt}/${maxAttempts})`)
    }

    return { success: result.success, data: result }
  },
  retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 0 },
})

/**
 * Cleanup old webhooks
 *
 * Removes old processed/failed webhooks to prevent
 * database bloat.
 */
export const webhookQueueCleanupJob = defineJob<TenantEvent<WebhookQueueCleanupPayload>>({
  name: 'webhook/queue-cleanup',
  handler: async (job) => {
    const { tenantId, olderThanDays = 30, processedOnly = true } = job.payload

    console.log(
      `[Webhook] Cleaning up webhooks older than ${olderThanDays} days (processedOnly: ${processedOnly})`
    )

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // Build delete query
    // Would use: DELETE FROM webhook_queue
    //            WHERE tenant_id = tenantId
    //            AND created_at < cutoffDate
    //            AND (processedOnly ? status IN ('processed', 'failed') : true)

    const deletedCount = 0 // Would be affected row count

    console.log(`[Webhook] Cleaned up ${deletedCount} old webhooks`)

    return {
      success: true,
      data: {
        tenantId,
        deletedCount,
        cutoffDate,
        cleanedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 60000 },
})

/**
 * Webhook queue health check
 *
 * Monitors webhook queue health:
 * - Pending count
 * - Failed count
 * - Processing latency
 * - Oldest pending webhook
 */
export const webhookQueueHealthCheckJob = defineJob<TenantEvent<WebhookQueueHealthCheckPayload>>({
  name: 'webhook/queue-health-check',
  handler: async (job) => {
    const { tenantId } = job.payload

    console.log(`[Webhook] Running queue health check for tenant ${tenantId}`)

    // Query queue statistics
    // Would use aggregation queries on webhook_queue table
    const status: WebhookQueueStatus = {
      pending: 0,
      processing: 0,
      failed: 0,
      succeeded: 0,
      oldestPending: undefined,
    }

    // Alert thresholds
    const ALERT_THRESHOLDS = {
      pendingWarning: 100,
      pendingCritical: 500,
      failedWarning: 10,
      failedCritical: 50,
      oldestPendingHours: 1,
    }

    // Check for alert conditions
    if (status.pending >= ALERT_THRESHOLDS.pendingCritical) {
      console.error(`[Webhook] CRITICAL: ${status.pending} pending webhooks`)
      // Would trigger criticalAlert job
    } else if (status.pending >= ALERT_THRESHOLDS.pendingWarning) {
      console.warn(`[Webhook] WARNING: ${status.pending} pending webhooks`)
      // Would trigger systemErrorAlert job
    }

    if (status.failed >= ALERT_THRESHOLDS.failedCritical) {
      console.error(`[Webhook] CRITICAL: ${status.failed} failed webhooks`)
      // Would trigger criticalAlert job
    }

    // Check oldest pending webhook age
    if (status.oldestPending) {
      const ageHours = (Date.now() - status.oldestPending.getTime()) / (1000 * 60 * 60)
      if (ageHours > ALERT_THRESHOLDS.oldestPendingHours) {
        console.warn(`[Webhook] Oldest pending webhook is ${ageHours.toFixed(1)} hours old`)
        // Would trigger alert
      }
    }

    return {
      success: true,
      data: {
        tenantId,
        status,
        checkedAt: new Date(),
      },
    }
  },
  retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 0 },
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

interface WebhookDeliveryInput {
  tenantId: string
  webhookId: string
  webhookType: string
  payload: Record<string, unknown>
  targetUrl: string
  attempt: number
  maxAttempts: number
}

/**
 * Deliver a webhook to its target URL
 */
async function processWebhook(input: WebhookDeliveryInput): Promise<WebhookProcessResult> {
  const { tenantId: _tenantId, webhookId, webhookType, payload: _payload, targetUrl, attempt, maxAttempts } = input
  const startTime = Date.now()

  console.log(`[Webhook] Delivering ${webhookId} (${webhookType}) to ${targetUrl} (attempt ${attempt})`)

  try {
    // Implementation would:
    // 1. Sign the webhook payload (HMAC)
    // 2. Send HTTP POST to target URL
    // 3. Include standard headers (X-Webhook-ID, X-Webhook-Signature, etc.)
    // 4. Parse response

    // Simulate HTTP request
    const response = {
      ok: true,
      status: 200,
    }

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        webhookId,
        success: true,
        statusCode: response.status,
        responseTime,
        attempt,
      }
    } else {
      return {
        webhookId,
        success: false,
        statusCode: response.status,
        responseTime,
        error: `HTTP ${response.status}`,
        attempt,
        nextRetryAt: attempt < maxAttempts ? new Date(Date.now() + getRetryDelay(attempt)) : undefined,
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      webhookId,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      attempt,
      nextRetryAt: attempt < maxAttempts ? new Date(Date.now() + getRetryDelay(attempt)) : undefined,
    }
  }
}

// ============================================================
// SCHEDULES
// ============================================================

export const WEBHOOK_QUEUE_SCHEDULES = {
  /** Process queue every 5 minutes */
  processQueue: { cron: '*/5 * * * *' },
  /** Health check every 15 minutes */
  healthCheck: { cron: '*/15 * * * *' },
  /** Cleanup daily at 3 AM */
  cleanup: { cron: '0 3 * * *' },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const webhookQueueJobs = [
  processWebhookQueueJob,
  processSingleWebhookJob,
  webhookQueueCleanupJob,
  webhookQueueHealthCheckJob,
]
