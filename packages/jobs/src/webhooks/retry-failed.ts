/**
 * Failed Webhook Retry Job
 *
 * Periodically retries failed webhook events.
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'
import { withTenant, sql } from '@cgk-platform/db'

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

    console.log(`[webhooks/retry-failed] tenantId=${tenantId} maxRetries=${maxRetries} hoursAgo=${hoursAgo} batchSize=${batchSize}`)

    const result = await withTenant(tenantId, async () => {
      // Query failed webhook events eligible for retry
      const failedEvents = await sql`
        SELECT id, topic, payload, retry_count
        FROM webhook_events
        WHERE status = 'failed'
          AND retry_count < ${maxRetries}
          AND created_at > NOW() - INTERVAL '1 hour' * ${hoursAgo}
        ORDER BY created_at ASC
        LIMIT ${batchSize}
      `

      let successCount = 0
      let failCount = 0

      for (const row of failedEvents.rows) {
        try {
          // Reset status to pending so the next scheduled processing picks it up
          await sql`
            UPDATE webhook_events
            SET status = 'pending',
                error_message = NULL
            WHERE id = ${row.id}
          `
          successCount++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[webhooks/retry-failed] Failed to reset event ${row.id}: ${msg}`)
          failCount++
        }
      }

      return {
        total: failedEvents.rows.length,
        reset: successCount,
        failed: failCount,
      }
    })

    console.log(`[webhooks/retry-failed] Processed: ${result.total} events, reset: ${result.reset}, failed: ${result.failed}`)

    return {
      success: true,
      data: {
        processed: result.total,
        success: result.reset,
        failed: result.failed,
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
