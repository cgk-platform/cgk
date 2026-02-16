/**
 * Background Jobs for Creator Admin Operations
 *
 * These job definitions follow the @cgk-platform/jobs patterns and include tenantId
 * in all event payloads for proper tenant isolation.
 */

import { defineJob, type Job } from '@cgk-platform/jobs'
import { withTenant, sql } from '@cgk-platform/db'
import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

import type { SampleStatus } from './types'

// Job payload types
interface TenantJobPayload {
  tenantId: string
}

interface RetroactiveJobPayload extends TenantJobPayload {
  lookbackDays?: number
}

// SQL result row type for sample requests
interface SampleRequestRow {
  id: string
  tracking_carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  status: SampleStatus
}

// ============================================================================
// Commission Sync Job
// ============================================================================

/**
 * Syncs orders from the commerce provider and calculates commissions
 * for orders with creator discount codes.
 *
 * Runs hourly via cron.
 */
export const syncOrderCommissionsJob = defineJob({
  name: 'sync-order-commissions',
  handler: async (job: Job<TenantJobPayload>) => {
    const { tenantId } = job.payload

    if (!tenantId) {
      throw new Error('tenantId required in event payload')
    }

    await withTenant(tenantId, async () => {
      // Get all creators with referral codes
      const creatorsResult = await sql`
        SELECT id, referral_code, commission_rate_pct
        FROM creators
        WHERE status = 'active' AND referral_code IS NOT NULL
      `

      const codeToCreator = new Map<
        string,
        { id: string; rate: number }
      >()
      for (const row of creatorsResult.rows) {
        if (row.referral_code) {
          codeToCreator.set(row.referral_code.toLowerCase(), {
            id: row.id as string,
            rate: Number(row.commission_rate_pct),
          })
        }
      }

      // Find orders with discount codes that haven't been processed
      const ordersResult = await sql`
        SELECT
          id, order_number, order_placed_at, discount_codes, total_cents, currency
        FROM orders
        WHERE discount_codes IS NOT NULL
          AND discount_codes != '[]'
          AND id NOT IN (SELECT order_id FROM commissions)
          AND order_placed_at > NOW() - INTERVAL '90 days'
        ORDER BY order_placed_at DESC
        LIMIT 500
      `

      let synced = 0

      for (const order of ordersResult.rows) {
        const discountCodes = (order.discount_codes as string[]) || []

        for (const code of discountCodes) {
          const creator = codeToCreator.get(code.toLowerCase())
          if (creator) {
            // Calculate commission
            const netSalesCents = Number(order.total_cents)
            const commissionCents = Math.round(
              netSalesCents * (creator.rate / 100)
            )

            // Insert commission record
            await sql`
              INSERT INTO commissions (
                order_id, order_number, order_date, creator_id,
                promo_code, net_sales_cents, commission_percent,
                commission_cents, currency, status
              ) VALUES (
                ${order.id as string},
                ${order.order_number as string},
                ${order.order_placed_at as string},
                ${creator.id},
                ${code},
                ${netSalesCents},
                ${creator.rate},
                ${commissionCents},
                ${order.currency as string || 'USD'},
                'pending'
              )
              ON CONFLICT (order_id) DO NOTHING
            `

            synced++
            break // Only one commission per order
          }
        }
      }

      return { success: true, data: { synced } }
    })

    return { success: true }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 5000,
  },
})

// ============================================================================
// Onboarding Reminders Job
// ============================================================================

/**
 * Sends reminder emails to creators who are stuck in onboarding.
 *
 * Runs daily at 10 AM via cron.
 */
export const sendOnboardingRemindersJob = defineJob({
  name: 'send-onboarding-reminders',
  handler: async (job: Job<TenantJobPayload>) => {
    const { tenantId } = job.payload

    if (!tenantId) {
      throw new Error('tenantId required in event payload')
    }

    await withTenant(tenantId, async () => {
      // Get onboarding config
      const configResult = await sql`
        SELECT steps FROM onboarding_config LIMIT 1
      `

      const configRow = configResult.rows[0]
      if (!configRow) {
        return { success: true, data: { sent: 0, reason: 'No config' } }
      }

      const steps = configRow.steps as Array<{
        id: string
        name: string
        reminderDays: number[]
      }>

      const stepMap = new Map(steps.map((s) => [s.id, s]))

      // Find creators needing reminders
      const needReminders = await sql`
        SELECT
          co.id, co.creator_id, co.step_id, co.reminder_count,
          co.created_at,
          c.email, c.first_name
        FROM creator_onboarding co
        JOIN creators c ON co.creator_id = c.id
        WHERE co.completed = false
          AND co.next_reminder_at <= NOW()
        ORDER BY co.created_at ASC
        LIMIT 100
      `

      let sent = 0

      for (const row of needReminders.rows) {
        const step = stepMap.get(row.step_id as string)
        if (!step) continue

        const daysSinceStart = Math.floor(
          (Date.now() - new Date(row.created_at as string).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        // Check if we should send a reminder based on reminderDays config
        const reminderDays = step.reminderDays || []
        const shouldRemind = reminderDays.some(
          (d: number) =>
            daysSinceStart >= d &&
            (row.reminder_count as number) <
              reminderDays.filter((rd: number) => rd <= daysSinceStart).length
        )

        if (shouldRemind) {
          // Send reminder email via tenant's Resend client
          const resend = await getTenantResendClient(tenantId)
          if (resend) {
            const senderConfig = await getTenantResendSenderConfig(tenantId)
            const fromEmail = senderConfig?.from || `noreply@${tenantId}.com`

            try {
              await resend.emails.send({
                from: fromEmail,
                to: row.email as string,
                replyTo: senderConfig?.replyTo,
                subject: `Reminder: Complete your onboarding - ${step.name}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hi ${row.first_name || 'there'},</h2>
                    <p>We noticed you haven't completed the <strong>${step.name}</strong> step in your onboarding process.</p>
                    <p>Don't forget to complete your setup so you can start collaborating with us!</p>
                    <p style="margin: 24px 0;">
                      <a href="${process.env.NEXT_PUBLIC_CREATOR_PORTAL_URL || 'https://creators.cgk.com'}/onboarding"
                         style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Continue Onboarding
                      </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                      If you have any questions, feel free to reply to this email.
                    </p>
                  </div>
                `,
              })
            } catch {
              // Log error but continue processing other reminders
              console.error(
                `Failed to send reminder email to ${row.email as string}`
              )
            }
          }

          // Update reminder tracking
          const nextReminderDay = reminderDays.find(
            (d: number) => d > daysSinceStart
          )
          if (nextReminderDay !== undefined) {
            await sql`
              UPDATE creator_onboarding
              SET
                reminder_count = reminder_count + 1,
                last_reminder_at = NOW(),
                next_reminder_at = created_at + INTERVAL '1 day' * ${nextReminderDay},
                updated_at = NOW()
              WHERE id = ${row.id as string}
            `
          } else {
            await sql`
              UPDATE creator_onboarding
              SET
                reminder_count = reminder_count + 1,
                last_reminder_at = NOW(),
                next_reminder_at = NULL,
                updated_at = NOW()
              WHERE id = ${row.id as string}
            `
          }

          sent++
        }
      }

      return { success: true, data: { sent } }
    })

    return { success: true }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 10000,
  },
})

// ============================================================================
// Sample Delivery Check Job
// ============================================================================

/**
 * Checks tracking status for shipped samples and updates delivery status.
 *
 * Runs every 4 hours via cron.
 */
export const checkSampleDeliveriesJob = defineJob({
  name: 'check-sample-deliveries',
  handler: async (job: Job<TenantJobPayload>) => {
    const { tenantId } = job.payload

    if (!tenantId) {
      throw new Error('tenantId required in event payload')
    }

    await withTenant(tenantId, async () => {
      // Get all shipped samples with tracking info
      const samplesResult = await sql`
        SELECT id, tracking_carrier, tracking_number, tracking_url
        FROM sample_requests
        WHERE status IN ('shipped', 'in_transit')
          AND tracking_number IS NOT NULL
        ORDER BY shipped_at ASC
        LIMIT 100
      `

      let updated = 0

      for (const sample of samplesResult.rows as SampleRequestRow[]) {
        // TODO: Integrate with carrier APIs (EasyPost, etc.) to check status
        // For now, we'll just mark samples as in_transit if they've been
        // shipped for more than 1 day

        const checkResult = await checkTrackingStatus(
          sample.tracking_carrier || '',
          sample.tracking_number || ''
        )

        if (checkResult.delivered) {
          await sql`
            UPDATE sample_requests
            SET
              status = 'delivered',
              delivered_at = NOW(),
              actual_delivery = NOW()::date,
              delivery_confirmed = true,
              delivery_confirmed_by = 'system',
              updated_at = NOW()
            WHERE id = ${sample.id}
          `
          updated++
        } else if (checkResult.inTransit && sample.status === 'shipped') {
          await sql`
            UPDATE sample_requests
            SET status = 'in_transit', updated_at = NOW()
            WHERE id = ${sample.id}
          `
          updated++
        }
      }

      return { success: true, data: { updated } }
    })

    return { success: true }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 5000,
  },
})

// Helper function to check tracking status
// In a real implementation, this would call carrier APIs
async function checkTrackingStatus(
  _carrier: string,
  _trackingNumber: string
): Promise<{ delivered: boolean; inTransit: boolean }> {
  // Placeholder - would integrate with EasyPost or carrier APIs
  return { delivered: false, inTransit: false }
}

// ============================================================================
// Retroactive Commission Application Job
// ============================================================================

/**
 * Applies commissions retroactively for orders that weren't processed
 * at the time of purchase.
 *
 * Can be triggered manually or on a schedule.
 */
export const applyRetroactiveCommissionsJob = defineJob({
  name: 'apply-retroactive-commissions',
  handler: async (job: Job<RetroactiveJobPayload>) => {
    const { tenantId, lookbackDays } = job.payload

    if (!tenantId) {
      throw new Error('tenantId required in event payload')
    }

    const days = lookbackDays || 90

    await withTenant(tenantId, async () => {
      // Get commission config
      const configResult = await sql`
        SELECT auto_retroactive, retroactive_lookback_days
        FROM commission_config
        LIMIT 1
      `

      const config = configResult.rows[0]
      const effectiveDays = config?.retroactive_lookback_days || days

      // Reuse the sync logic with lookback period
      const creatorsResult = await sql`
        SELECT id, referral_code, commission_rate_pct
        FROM creators
        WHERE referral_code IS NOT NULL
      `

      const codeToCreator = new Map<string, { id: string; rate: number }>()
      for (const row of creatorsResult.rows) {
        if (row.referral_code) {
          codeToCreator.set(row.referral_code.toLowerCase(), {
            id: row.id as string,
            rate: Number(row.commission_rate_pct),
          })
        }
      }

      // Find unprocessed orders
      const ordersResult = await sql`
        SELECT id, order_number, order_placed_at, discount_codes, total_cents, currency
        FROM orders
        WHERE discount_codes IS NOT NULL
          AND discount_codes != '[]'
          AND id NOT IN (SELECT order_id FROM commissions)
          AND order_placed_at > NOW() - INTERVAL '1 day' * ${effectiveDays}
        ORDER BY order_placed_at DESC
      `

      let applied = 0

      for (const order of ordersResult.rows) {
        const discountCodes = (order.discount_codes as string[]) || []

        for (const code of discountCodes) {
          const creator = codeToCreator.get(code.toLowerCase())
          if (creator) {
            const netSalesCents = Number(order.total_cents)
            const commissionCents = Math.round(
              netSalesCents * (creator.rate / 100)
            )

            await sql`
              INSERT INTO commissions (
                order_id, order_number, order_date, creator_id,
                promo_code, net_sales_cents, commission_percent,
                commission_cents, currency, status,
                metadata
              ) VALUES (
                ${order.id as string},
                ${order.order_number as string},
                ${order.order_placed_at as string},
                ${creator.id},
                ${code},
                ${netSalesCents},
                ${creator.rate},
                ${commissionCents},
                ${(order.currency as string) || 'USD'},
                'pending',
                ${JSON.stringify({ retroactive: true, appliedAt: new Date().toISOString() })}
              )
              ON CONFLICT (order_id) DO NOTHING
            `

            applied++
            break
          }
        }
      }

      return { success: true, data: { applied, lookbackDays: effectiveDays } }
    })

    return { success: true }
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 5000,
  },
})

// Export all jobs
export const creatorAdminOpsJobs = {
  syncOrderCommissions: syncOrderCommissionsJob,
  sendOnboardingReminders: sendOnboardingRemindersJob,
  checkSampleDeliveries: checkSampleDeliveriesJob,
  applyRetroactiveCommissions: applyRetroactiveCommissionsJob,
}
