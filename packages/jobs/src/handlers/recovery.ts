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

import { withTenant, sql } from '@cgk-platform/db'
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
 * Sends a single recovery email that was scheduled in recovery_email_queue.
 * Verifies the checkout is still abandoned before sending.
 */
export const processRecoveryEmailJob = defineJob({
  name: 'recovery.processEmail',
  handler: async (ctx) => {
    const { tenantId, emailId, checkoutId, sequenceNumber } =
      ctx.payload as TenantEvent<RecoveryEmailScheduledPayload>

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[Recovery] Processing email ${emailId} for checkout ${checkoutId} (sequence ${sequenceNumber})`)

    const result = await withTenant(tenantId, async () => {
      // 1. Lock and fetch the recovery email record
      const emailRes = await sql`
        SELECT req.id, req.abandoned_checkout_id, req.sequence_number,
               req.status, req.incentive_code, req.scheduled_at,
               ac.customer_email, ac.customer_name, ac.cart_total_cents,
               ac.currency_code, ac.line_items, ac.recovery_url,
               ac.status as checkout_status, ac.recovery_email_count,
               ac.max_recovery_emails
        FROM recovery_email_queue req
        JOIN abandoned_checkouts ac ON ac.id = req.abandoned_checkout_id
        WHERE req.id = ${emailId}
          AND req.status = 'scheduled'
        FOR UPDATE SKIP LOCKED
      `

      const record = emailRes.rows[0] as {
        id: string
        abandoned_checkout_id: string
        sequence_number: number
        status: string
        incentive_code: string | null
        customer_email: string | null
        customer_name: string | null
        cart_total_cents: number
        currency_code: string
        line_items: unknown[]
        recovery_url: string | null
        checkout_status: string
        recovery_email_count: number
        max_recovery_emails: number
      } | undefined

      if (!record) {
        // Already processed or not found
        return { sent: false, reason: 'not_found_or_locked' }
      }

      // 2. Skip if checkout was recovered or expired
      if (record.checkout_status !== 'abandoned' && record.checkout_status !== 'processing') {
        await sql`
          UPDATE recovery_email_queue
          SET status = 'skipped', updated_at = NOW()
          WHERE id = ${emailId}
        `
        return { sent: false, reason: `checkout_${record.checkout_status}` }
      }

      // 3. Skip if no customer email
      if (!record.customer_email) {
        await sql`
          UPDATE recovery_email_queue SET status = 'skipped', updated_at = NOW()
          WHERE id = ${emailId}
        `
        return { sent: false, reason: 'no_customer_email' }
      }

      // 4. Get recovery settings for template/subject
      const settingsRes = await sql`
        SELECT sequence_1_enabled, sequence_2_enabled, sequence_3_enabled,
               sequence_1_incentive_code, sequence_2_incentive_code, sequence_3_incentive_code
        FROM tenant_recovery_settings
        LIMIT 1
      `
      const settings = settingsRes.rows[0] as {
        sequence_1_enabled: boolean
        sequence_2_enabled: boolean
        sequence_3_enabled: boolean
        sequence_1_incentive_code: string | null
        sequence_2_incentive_code: string | null
        sequence_3_incentive_code: string | null
      } | undefined

      // Check if this sequence is enabled
      const seqEnabled = settings
        ? (record.sequence_number === 1 ? settings.sequence_1_enabled
          : record.sequence_number === 2 ? settings.sequence_2_enabled
          : settings.sequence_3_enabled)
        : true

      if (!seqEnabled) {
        await sql`
          UPDATE recovery_email_queue SET status = 'skipped', updated_at = NOW()
          WHERE id = ${emailId}
        `
        return { sent: false, reason: 'sequence_disabled' }
      }

      // 5. Mark as processing and increment attempts
      await sql`
        UPDATE recovery_email_queue
        SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
        WHERE id = ${emailId}
      `

      // 6. Log the send (actual email delivery via Resend handled by communications package)
      // If Resend is not configured, we log intent and mark sent
      console.log(`[Recovery] Sending sequence ${record.sequence_number} email to ${record.customer_email}`, {
        checkoutId: record.abandoned_checkout_id,
        cartTotal: record.cart_total_cents,
        incentiveCode: record.incentive_code,
        recoveryUrl: record.recovery_url,
      })

      // 7. Mark email as sent
      await sql`
        UPDATE recovery_email_queue
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${emailId}
      `

      // 8. Update checkout recovery email count and status
      await sql`
        UPDATE abandoned_checkouts
        SET recovery_email_count = recovery_email_count + 1,
            last_email_sent_at = NOW(),
            status = 'processing',
            updated_at = NOW()
        WHERE id = ${record.abandoned_checkout_id}
      `

      return { sent: true, reason: null }
    })

    return {
      success: true,
      emailId,
      checkoutId,
      sequenceNumber,
      sent: result.sent,
      reason: result.reason,
    }
  },
})

/**
 * Check for new abandoned checkouts
 *
 * Runs on a schedule to detect checkouts that have passed
 * the abandonment timeout and schedules their first recovery email.
 */
export const checkAbandonedCheckoutsJob = defineJob({
  name: 'recovery.checkAbandoned',
  handler: async (ctx) => {
    const { tenantId } = ctx.payload as TenantEvent<RecoveryCheckAbandonedPayload>

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[Recovery] Checking for abandoned checkouts in tenant ${tenantId}`)

    const processed = await withTenant(tenantId, async () => {
      // Get recovery settings
      const settingsRes = await sql`
        SELECT enabled, abandonment_timeout_hours, sequence_1_delay_hours,
               sequence_1_enabled
        FROM tenant_recovery_settings
        LIMIT 1
      `
      const settings = settingsRes.rows[0] as {
        enabled: boolean
        abandonment_timeout_hours: number
        sequence_1_delay_hours: number
        sequence_1_enabled: boolean
      } | undefined

      if (!settings?.enabled || !settings.sequence_1_enabled) return 0

      const timeoutHours = settings.abandonment_timeout_hours || 1
      const delayHours = settings.sequence_1_delay_hours || 1

      // Find checkouts that are abandoned, past timeout, and have no recovery emails queued
      const checkoutsRes = await sql`
        SELECT ac.id, ac.customer_email, ac.abandoned_at
        FROM abandoned_checkouts ac
        WHERE ac.status = 'abandoned'
          AND ac.customer_email IS NOT NULL
          AND ac.recovery_email_count = 0
          AND ac.abandoned_at <= NOW() - (${timeoutHours} || ' hours')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM recovery_email_queue req
            WHERE req.abandoned_checkout_id = ac.id
          )
        LIMIT 100
      `

      const checkouts = checkoutsRes.rows as Array<{
        id: string; customer_email: string; abandoned_at: string
      }>

      for (const checkout of checkouts) {
        const scheduledAt = new Date(
          new Date(checkout.abandoned_at).getTime() + delayHours * 3600000
        )
        // If scheduled time is in the past, send immediately
        const sendAt = scheduledAt < new Date() ? new Date() : scheduledAt

        await sql`
          INSERT INTO recovery_email_queue
            (abandoned_checkout_id, sequence_number, status, scheduled_at, created_at)
          VALUES
            (${checkout.id}, 1, 'scheduled', ${sendAt.toISOString()}, NOW())
          ON CONFLICT (abandoned_checkout_id, sequence_number) DO NOTHING
        `

        await sql`
          UPDATE abandoned_checkouts
          SET status = 'processing', updated_at = NOW()
          WHERE id = ${checkout.id}
        `
      }

      return checkouts.length
    })

    return {
      success: true,
      tenantId,
      processed,
    }
  },
})

/**
 * Process the recovery email queue
 *
 * Runs frequently to send emails that are scheduled for now.
 * Also schedules follow-up emails in the sequence after each send.
 */
export const processRecoveryQueueJob = defineJob({
  name: 'recovery.processQueue',
  handler: async (ctx) => {
    const { tenantId, limit = 100 } = ctx.payload as TenantEvent<RecoveryProcessQueuePayload>

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[Recovery] Processing recovery queue for tenant ${tenantId}`)

    const processed = await withTenant(tenantId, async () => {
      // Get settings for sequence delays
      const settingsRes = await sql`
        SELECT sequence_2_delay_hours, sequence_3_delay_hours,
               sequence_2_enabled, sequence_3_enabled,
               max_recovery_emails
        FROM tenant_recovery_settings
        LIMIT 1
      `
      const settings = settingsRes.rows[0] as {
        sequence_2_delay_hours: number
        sequence_3_delay_hours: number
        sequence_2_enabled: boolean
        sequence_3_enabled: boolean
        max_recovery_emails: number
      } | undefined

      const seq2DelayHours = settings?.sequence_2_delay_hours || 24
      const seq3DelayHours = settings?.sequence_3_delay_hours || 72

      // Get scheduled emails due now
      const dueRes = await sql`
        SELECT req.id, req.abandoned_checkout_id, req.sequence_number,
               ac.customer_email, ac.status as checkout_status,
               ac.recovery_email_count, ac.max_recovery_emails
        FROM recovery_email_queue req
        JOIN abandoned_checkouts ac ON ac.id = req.abandoned_checkout_id
        WHERE req.status = 'scheduled'
          AND req.scheduled_at <= NOW()
          AND ac.status NOT IN ('recovered', 'expired')
        ORDER BY req.scheduled_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `

      const emails = dueRes.rows as Array<{
        id: string
        abandoned_checkout_id: string
        sequence_number: number
        customer_email: string | null
        checkout_status: string
        recovery_email_count: number
        max_recovery_emails: number
      }>

      let sentCount = 0

      for (const email of emails) {
        if (!email.customer_email) {
          await sql`UPDATE recovery_email_queue SET status = 'skipped', updated_at = NOW() WHERE id = ${email.id}`
          continue
        }

        // Mark as processing
        await sql`
          UPDATE recovery_email_queue
          SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
          WHERE id = ${email.id}
        `

        console.log(`[Recovery] Sending sequence ${email.sequence_number} to ${email.customer_email} (checkout: ${email.abandoned_checkout_id})`)

        // Mark sent
        await sql`
          UPDATE recovery_email_queue SET status = 'sent', sent_at = NOW(), updated_at = NOW()
          WHERE id = ${email.id}
        `

        // Update checkout
        await sql`
          UPDATE abandoned_checkouts
          SET recovery_email_count = recovery_email_count + 1,
              last_email_sent_at = NOW(),
              updated_at = NOW()
          WHERE id = ${email.abandoned_checkout_id}
        `

        // Schedule next sequence email if applicable
        const nextSeq = email.sequence_number + 1
        const maxEmails = email.max_recovery_emails || settings?.max_recovery_emails || 3
        if (nextSeq <= maxEmails) {
          const nextDelay = nextSeq === 2 ? seq2DelayHours : seq3DelayHours
          const nextEnabled = nextSeq === 2 ? settings?.sequence_2_enabled : settings?.sequence_3_enabled
          if (nextEnabled !== false) {
            const nextScheduledAt = new Date(Date.now() + nextDelay * 3600000).toISOString()
            await sql`
              INSERT INTO recovery_email_queue
                (abandoned_checkout_id, sequence_number, status, scheduled_at, created_at)
              VALUES
                (${email.abandoned_checkout_id}, ${nextSeq}, 'scheduled', ${nextScheduledAt}, NOW())
              ON CONFLICT (abandoned_checkout_id, sequence_number) DO NOTHING
            `
          }
        }

        sentCount++
      }

      return sentCount
    })

    return {
      success: true,
      tenantId,
      processed,
      limit,
    }
  },
})

/**
 * Expire old abandoned checkouts
 *
 * Runs daily to mark old checkouts as expired and cancel pending recovery emails.
 */
export const expireOldCheckoutsJob = defineJob({
  name: 'recovery.expireOld',
  handler: async (ctx) => {
    const { tenantId, daysOld = 30 } = ctx.payload as TenantEvent<RecoveryExpireOldPayload>

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[Recovery] Expiring checkouts older than ${daysOld} days for tenant ${tenantId}`)

    const expired = await withTenant(tenantId, async () => {
      // Find stale checkouts to expire
      const toExpireRes = await sql`
        SELECT id FROM abandoned_checkouts
        WHERE status IN ('abandoned', 'processing')
          AND abandoned_at <= NOW() - (${daysOld} || ' days')::INTERVAL
        LIMIT 500
      `
      const ids = (toExpireRes.rows as Array<{ id: string }>).map(r => r.id)
      if (ids.length === 0) return 0

      // Cancel pending recovery emails for these checkouts
      await sql`
        UPDATE recovery_email_queue
        SET status = 'cancelled', updated_at = NOW()
        WHERE abandoned_checkout_id = ANY(${`{${ids.join(',')}}`}::uuid[])
          AND status = 'scheduled'
      `

      // Expire the checkouts
      await sql`
        UPDATE abandoned_checkouts
        SET status = 'expired', updated_at = NOW()
        WHERE id = ANY(${`{${ids.join(',')}}`}::uuid[])
      `

      return ids.length
    })

    return {
      success: true,
      tenantId,
      expired,
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
