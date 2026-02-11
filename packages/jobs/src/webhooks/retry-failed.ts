/**
 * Failed Webhook Retry Job
 *
 * Periodically retries failed webhook events.
 *
 * NOTE: This job requires the @cgk/shopify/webhooks module to be built and available.
 * Currently stubbed to allow build to pass.
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'

/**
 * Configuration for retry job
 */
interface RetryJobConfig {
  maxRetries: number
  hoursAgo: number
  batchSize: number
}

const DEFAULT_CONFIG: RetryJobConfig = {
  maxRetries: 3,
  hoursAgo: 24,
  batchSize: 50,
}

/**
 * Retry failed webhooks job
 *
 * Runs every 5 minutes and retries failed webhook events
 * that have not exceeded the maximum retry count
 */
export const retryFailedWebhooksJob = defineJob<{ tenantId: string; config?: Partial<RetryJobConfig> }>({
  name: 'webhooks/retry-failed',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, config = {} } = job.payload
    const { maxRetries, hoursAgo, batchSize } = { ...DEFAULT_CONFIG, ...config }

    // @cgk/shopify/webhooks module needs to be built first
    console.log(`[webhooks/retry-failed] tenantId=${tenantId} maxRetries=${maxRetries} hoursAgo=${hoursAgo} batchSize=${batchSize}`)

    return {
      success: false,
      error: {
        message: '@cgk/shopify/webhooks module must be built before this job can run',
        retryable: false,
      },
      data: {
        processed: 0,
        success: 0,
        failed: 0,
      },
    }
  },
  retry: {
    maxAttempts: 1, // Don't retry the retry job itself
  },
})

/**
 * Scheduled job configuration for cron
 *
 * @example
 * ```ts
 * // In your cron setup
 * scheduleJob('webhooks/retry-failed', '* /5 * * * *', {
 *   tenantId: 'all', // Process all tenants
 * })
 * ```
 */
export const RETRY_SCHEDULE = '*/5 * * * *' // Every 5 minutes
