/**
 * Recovery Job Handlers
 *
 * Background jobs for abandoned checkout recovery:
 * - Process recovery email queue
 * - Check for new abandoned checkouts
 * - Expire old checkouts
 * - Schedule recovery emails
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All handlers require tenantId
 */

import { defineJob } from '../define'
import type {
  RecoveryEmailScheduledPayload,
  RecoveryCheckAbandonedPayload,
  RecoveryProcessQueuePayload,
  RecoveryExpireOldPayload,
  TenantEvent,
} from '../events'

/**
 * Process a scheduled recovery email
 *
 * This job sends a single recovery email that was scheduled
 */
export const processRecoveryEmailJob = defineJob({
  name: 'recovery.processEmail',
  handler: async (ctx) => {
    const { emailId, checkoutId, sequenceNumber } =
      ctx.payload as TenantEvent<RecoveryEmailScheduledPayload>

    console.log(`[Recovery] Processing email ${emailId} for checkout ${checkoutId} (sequence ${sequenceNumber})`)

    // Implementation would:
    // 1. Get the recovery email record
    // 2. Get the abandoned checkout details
    // 3. Get the recovery settings for template/incentive
    // 4. Render the email using tenant templates
    // 5. Send via email provider
    // 6. Update email status to 'sent'
    // 7. Update checkout recovery_email_count

    return {
      success: true,
      emailId,
      checkoutId,
      sequenceNumber,
    }
  },
})

/**
 * Check for new abandoned checkouts
 *
 * Runs on a schedule to detect checkouts that have passed
 * the abandonment timeout and schedules their first recovery email
 */
export const checkAbandonedCheckoutsJob = defineJob({
  name: 'recovery.checkAbandoned',
  handler: async (ctx) => {
    const { tenantId } = ctx.payload as TenantEvent<RecoveryCheckAbandonedPayload>

    console.log(`[Recovery] Checking for abandoned checkouts in tenant ${tenantId}`)

    // Implementation would:
    // 1. Get tenant recovery settings (timeout, enabled)
    // 2. Query checkouts that are abandoned (past timeout, no recovery emails yet)
    // 3. For each checkout:
    //    - Schedule the first recovery email based on sequence_1_delay_hours
    //    - Mark checkout as 'processing'

    return {
      success: true,
      tenantId,
      processed: 0,
    }
  },
})

/**
 * Process the recovery email queue
 *
 * Runs frequently to send emails that are scheduled for now
 */
export const processRecoveryQueueJob = defineJob({
  name: 'recovery.processQueue',
  handler: async (ctx) => {
    const { tenantId, limit = 100 } = ctx.payload as TenantEvent<RecoveryProcessQueuePayload>

    console.log(`[Recovery] Processing recovery queue for tenant ${tenantId}`)

    // Implementation would:
    // 1. Get scheduled emails where scheduled_at <= now
    // 2. For each email:
    //    - Verify checkout is still abandoned
    //    - Send the email via email provider
    //    - Update email status
    //    - Schedule next email in sequence if applicable

    return {
      success: true,
      tenantId,
      processed: 0,
      limit,
    }
  },
})

/**
 * Expire old abandoned checkouts
 *
 * Runs daily to mark old checkouts as expired
 */
export const expireOldCheckoutsJob = defineJob({
  name: 'recovery.expireOld',
  handler: async (ctx) => {
    const { tenantId, daysOld = 30 } = ctx.payload as TenantEvent<RecoveryExpireOldPayload>

    console.log(`[Recovery] Expiring checkouts older than ${daysOld} days for tenant ${tenantId}`)

    // Implementation would:
    // 1. Query abandoned checkouts older than daysOld
    // 2. Update their status to 'expired'
    // 3. Cancel any pending recovery emails

    return {
      success: true,
      tenantId,
      expired: 0,
      daysOld,
    }
  },
})

/**
 * Recovery job schedules
 */
export const RECOVERY_SCHEDULES = {
  // Check for new abandoned checkouts every 5 minutes
  checkAbandoned: { cron: '*/5 * * * *' },
  // Process recovery email queue every 5 minutes
  processQueue: { cron: '*/5 * * * *' },
  // Expire old checkouts daily at 2 AM
  expireOld: { cron: '0 2 * * *' },
} as const

/**
 * All recovery jobs
 */
export const recoveryJobs = [
  processRecoveryEmailJob,
  checkAbandonedCheckoutsJob,
  processRecoveryQueueJob,
  expireOldCheckoutsJob,
]
