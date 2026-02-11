/**
 * Webhook Health Check Job
 *
 * Periodically checks webhook registrations and re-registers missing webhooks.
 *
 * NOTE: This job requires the @cgk/shopify/webhooks module to be built and available.
 * Currently stubbed to allow build to pass.
 */

import { defineJob } from '../define'
import type { JobResult } from '../types'

/**
 * Health check job result
 */
interface HealthCheckResult {
  tenantsChecked: number
  webhooksReRegistered: number
  errors: Array<{ tenantId: string; shop: string; error: string }>
}

/**
 * Webhook health check job
 *
 * Runs every hour to:
 * 1. Verify webhook registrations are active with Shopify
 * 2. Re-register any missing webhooks
 * 3. Clean up orphaned registrations
 */
export const webhookHealthCheckJob = defineJob<{ tenantIds?: string[] }>({
  name: 'webhooks/health-check',
  handler: async (job): Promise<JobResult<HealthCheckResult>> => {
    const { tenantIds } = job.payload

    // @cgk/shopify/webhooks module needs to be built first
    console.log(`[webhooks/health-check] tenantIds=${tenantIds?.join(',') || 'all'}`)

    return {
      success: false,
      error: {
        message: '@cgk/shopify/webhooks module must be built before this job can run',
        retryable: false,
      },
      data: {
        tenantsChecked: 0,
        webhooksReRegistered: 0,
        errors: [],
      },
    }
  },
  retry: {
    maxAttempts: 2,
    backoff: 'exponential',
    initialDelay: 30000,
  },
})

/**
 * Cleanup old webhook events job
 */
export const cleanupOldWebhookEventsJob = defineJob<{
  tenantIds?: string[]
  retentionDays?: number
}>({
  name: 'webhooks/cleanup-old-events',
  handler: async (job): Promise<JobResult<{ deleted: number }>> => {
    const { tenantIds, retentionDays = 30 } = job.payload

    // @cgk/shopify/webhooks module needs to be built first
    console.log(`[webhooks/cleanup-old-events] tenantIds=${tenantIds?.join(',') || 'all'} retentionDays=${retentionDays}`)

    return {
      success: false,
      error: {
        message: '@cgk/shopify/webhooks module must be built before this job can run',
        retryable: false,
      },
      data: { deleted: 0 },
    }
  },
  retry: {
    maxAttempts: 1,
  },
})

/**
 * Schedule configurations
 */
export const HEALTH_CHECK_SCHEDULE = '0 * * * *' // Every hour
export const CLEANUP_SCHEDULE = '0 4 * * *' // Daily at 4 AM
