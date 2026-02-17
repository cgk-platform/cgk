/**
 * Treasury background jobs
 *
 * Handles automated treasury operations:
 * - Sending approval emails
 * - Auto-send approved payouts
 * - Syncing top-up statuses
 * - Low balance alerts
 *
 * Uses existing @cgk-platform/payments and @cgk-platform/communications packages.
 */

import { sql, withTenant } from '@cgk-platform/db'

import { defineJob } from '../define'
import type { JobResult } from '../types'

// Job Payload Types
export interface TreasurySendApprovalEmailPayload {
  tenantId: string
  requestId: string
}

export interface TreasuryProcessInboundEmailPayload {
  tenantId: string
  requestId: string
  communicationId: string
}

export interface TreasuryAutoSendApprovedPayload {
  tenantId: string
  requestId?: string // Optional: process specific request, or batch if not provided
}

export interface TreasurySyncTopupStatusesPayload {
  tenantId: string
  topupId?: string // Optional: sync specific topup, or all pending if not provided
}

export interface TreasuryLowBalanceAlertPayload {
  tenantId: string
}

/**
 * Send approval email to treasurer for a draw request
 */
export const treasurySendApprovalEmailJob = defineJob<TreasurySendApprovalEmailPayload>({
  name: 'treasury/send-approval-email',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, requestId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    if (!requestId) {
      return { success: false, error: { message: 'requestId required', retryable: false } }
    }

    try {
      const { getTenantResendClient } = await import('@cgk-platform/integrations')

      // Get the draw request details
      const request = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            dr.*,
            u.name as requester_name,
            u.email as requester_email
          FROM draw_requests dr
          LEFT JOIN public.users u ON u.id = dr.requester_id
          WHERE dr.id = ${requestId}
        `
        return result.rows[0] as Record<string, unknown> | undefined
      })

      if (!request) {
        return { success: false, error: { message: 'Draw request not found', retryable: false } }
      }

      // Get treasurer info
      const treasurer = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT u.name, u.email
          FROM public.users u
          JOIN user_roles ur ON ur.user_id = u.id
          WHERE ur.tenant_id = (SELECT id FROM public.organizations WHERE slug = current_schema()::text)
            AND ur.role = 'treasurer'
          LIMIT 1
        `
        return result.rows[0] as { name: string; email: string } | undefined
      })

      if (!treasurer?.email) {
        console.log(`[treasury/send-approval-email] No treasurer configured for tenant ${tenantId}`)
        return { success: false, error: { message: 'No treasurer configured', retryable: false } }
      }

      // Get Resend client
      const resend = await getTenantResendClient(tenantId)
      if (!resend) {
        console.log(`[treasury/send-approval-email] Resend not configured for tenant ${tenantId}`)
        return { success: false, error: { message: 'Resend not configured', retryable: false } }
      }

      // Send approval email
      const amount = (request.amount as number) / 100 // Convert cents to dollars
      const currency = (request.currency as string) || 'USD'

      await resend.emails.send({
        from: 'Treasury <treasury@notifications.example.com>',
        to: treasurer.email,
        subject: `Approval Required: ${currency} ${amount.toFixed(2)} Draw Request`,
        html: `
          <h2>Draw Request Requires Your Approval</h2>
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
          <p><strong>Requested By:</strong> ${request.requester_name || 'Unknown'}</p>
          <p><strong>Reason:</strong> ${request.reason || 'No reason provided'}</p>
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p>Please log in to approve or reject this request.</p>
        `,
      })

      // Update request status to pending_approval
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE draw_requests
          SET status = 'pending_approval', approval_email_sent_at = NOW()
          WHERE id = ${requestId}
        `
      })

      console.log(`[treasury/send-approval-email] Sent approval email for request ${requestId} to ${treasurer.email}`)

      return {
        success: true,
        data: { sentTo: treasurer.email },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[treasury/send-approval-email] Error for request ${requestId}:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Process auto-send for approved draw requests
 */
export const treasuryAutoSendApprovedJob = defineJob<TreasuryAutoSendApprovedPayload>({
  name: 'treasury/auto-send-approved',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, requestId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const { getTenantStripeClient } = await import('@cgk-platform/integrations')

      // Get Stripe client
      const stripe = await getTenantStripeClient(tenantId)
      if (!stripe) {
        console.log(`[treasury/auto-send-approved] Stripe not configured for tenant ${tenantId}`)
        return { success: false, error: { message: 'Stripe not configured', retryable: false } }
      }

      // Get approved requests to process
      const requests = await withTenant(tenantId, async () => {
        if (requestId) {
          const result = await sql`
            SELECT * FROM draw_requests
            WHERE id = ${requestId} AND status = 'approved'
          `
          return result.rows
        } else {
          const result = await sql`
            SELECT * FROM draw_requests
            WHERE status = 'approved'
              AND auto_send = true
              AND processed_at IS NULL
            ORDER BY approved_at ASC
            LIMIT 10
          `
          return result.rows
        }
      })

      if (requests.length === 0) {
        return { success: true, data: { processed: 0 } }
      }

      let processed = 0
      let failed = 0

      for (const request of requests) {
        try {
          const amount = request.amount as number
          const destinationAccountId = request.destination_account_id as string

          if (!destinationAccountId) {
            await markRequestFailed(tenantId, request.id as string, 'No destination account')
            failed++
            continue
          }

          // Create transfer via Stripe
          const transfer = await stripe.transfers.create({
            amount,
            currency: (request.currency as string) || 'usd',
            destination: destinationAccountId,
            metadata: {
              draw_request_id: request.id as string,
              tenant_id: tenantId,
            },
          })

          // Update request as processed
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE draw_requests
              SET
                status = 'completed',
                processed_at = NOW(),
                stripe_transfer_id = ${transfer.id}
              WHERE id = ${request.id}
            `
          })

          processed++
        } catch (reqError) {
          const errorMessage = reqError instanceof Error ? reqError.message : 'Unknown error'
          await markRequestFailed(tenantId, request.id as string, errorMessage)
          failed++
          console.error(`[treasury/auto-send-approved] Failed to process request ${request.id}:`, errorMessage)
        }
      }

      console.log(`[treasury/auto-send-approved] tenantId=${tenantId} processed=${processed} failed=${failed}`)

      return {
        success: true,
        data: { processed, failed },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[treasury/auto-send-approved] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

async function markRequestFailed(tenantId: string, requestId: string, reason: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE draw_requests
      SET status = 'failed', error_message = ${reason}, processed_at = NOW()
      WHERE id = ${requestId}
    `
  })
}

/**
 * Sync Stripe topup statuses
 */
export const treasurySyncTopupStatusesJob = defineJob<TreasurySyncTopupStatusesPayload>({
  name: 'treasury/sync-topup-statuses',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, topupId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const { getTenantStripeClient } = await import('@cgk-platform/integrations')

      // Get Stripe client
      const stripe = await getTenantStripeClient(tenantId)
      if (!stripe) {
        console.log(`[treasury/sync-topup-statuses] Stripe not configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'Stripe not configured' } }
      }

      // Get pending topups
      const topups = await withTenant(tenantId, async () => {
        if (topupId) {
          const result = await sql`
            SELECT * FROM stripe_topups
            WHERE id = ${topupId}
          `
          return result.rows
        } else {
          const result = await sql`
            SELECT * FROM stripe_topups
            WHERE status IN ('pending', 'created')
            ORDER BY created_at ASC
            LIMIT 50
          `
          return result.rows
        }
      })

      if (topups.length === 0) {
        return { success: true, data: { synced: 0 } }
      }

      let synced = 0

      for (const topup of topups) {
        try {
          const stripeTopupId = topup.stripe_topup_id as string
          if (!stripeTopupId) continue

          // Get current status from Stripe
          const stripeTopup = await stripe.topups.retrieve(stripeTopupId)

          // Update local record if status changed
          if (stripeTopup.status !== topup.status) {
            await withTenant(tenantId, async () => {
              await sql`
                UPDATE stripe_topups
                SET
                  status = ${stripeTopup.status},
                  failure_code = ${stripeTopup.failure_code || null},
                  failure_message = ${stripeTopup.failure_message || null},
                  updated_at = NOW()
                WHERE id = ${topup.id}
              `
            })
            synced++
          }
        } catch (topupError) {
          console.error(
            `[treasury/sync-topup-statuses] Error syncing topup ${topup.id}:`,
            topupError instanceof Error ? topupError.message : 'Unknown error'
          )
        }
      }

      console.log(`[treasury/sync-topup-statuses] tenantId=${tenantId} checked=${topups.length} synced=${synced}`)

      return {
        success: true,
        data: { checked: topups.length, synced },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[treasury/sync-topup-statuses] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

/**
 * Check for low balance and send alerts
 */
export const treasuryLowBalanceAlertJob = defineJob<TreasuryLowBalanceAlertPayload>({
  name: 'treasury/low-balance-alert',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    try {
      const { getTenantStripeClient, getTenantResendClient } = await import('@cgk-platform/integrations')

      // Get Stripe client
      const stripe = await getTenantStripeClient(tenantId)
      if (!stripe) {
        console.log(`[treasury/low-balance-alert] Stripe not configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'Stripe not configured' } }
      }

      // Get treasury config for threshold
      const config = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT * FROM treasury_config LIMIT 1
        `
        return result.rows[0] as {
          low_balance_threshold_cents: number
          alert_email: string
        } | undefined
      })

      const threshold = config?.low_balance_threshold_cents || 100000 // Default $1000
      const alertEmail = config?.alert_email

      if (!alertEmail) {
        console.log(`[treasury/low-balance-alert] No alert email configured for tenant ${tenantId}`)
        return { success: true, data: { skipped: 'No alert email configured' } }
      }

      // Get Stripe balance
      const balance = await stripe.balance.retrieve()
      const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0)

      if (availableBalance >= threshold) {
        console.log(
          `[treasury/low-balance-alert] Balance OK for tenant ${tenantId}: $${(availableBalance / 100).toFixed(2)}`
        )
        return { success: true, data: { balanceCents: availableBalance, alertSent: false } }
      }

      // Send alert email
      const resend = await getTenantResendClient(tenantId)
      if (resend) {
        await resend.emails.send({
          from: 'Treasury Alerts <treasury@notifications.example.com>',
          to: alertEmail,
          subject: `⚠️ Low Balance Alert: $${(availableBalance / 100).toFixed(2)}`,
          html: `
            <h2>Low Treasury Balance Alert</h2>
            <p>Your treasury balance has fallen below the configured threshold.</p>
            <p><strong>Current Balance:</strong> $${(availableBalance / 100).toFixed(2)}</p>
            <p><strong>Threshold:</strong> $${(threshold / 100).toFixed(2)}</p>
            <p>Please add funds to avoid payment processing issues.</p>
          `,
        })

        // Record alert
        await withTenant(tenantId, async () => {
          await sql`
            INSERT INTO treasury_alerts (
              type, balance_cents, threshold_cents, sent_to, sent_at
            ) VALUES (
              'low_balance', ${availableBalance}, ${threshold}, ${alertEmail}, NOW()
            )
          `
        })

        console.log(
          `[treasury/low-balance-alert] Alert sent for tenant ${tenantId}: $${(availableBalance / 100).toFixed(2)} < $${(threshold / 100).toFixed(2)}`
        )

        return {
          success: true,
          data: { balanceCents: availableBalance, alertSent: true, sentTo: alertEmail },
        }
      } else {
        console.log(`[treasury/low-balance-alert] Resend not configured, skipping email`)
        return { success: true, data: { balanceCents: availableBalance, alertSent: false } }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[treasury/low-balance-alert] tenantId=${tenantId} error:`, message)
      return {
        success: false,
        error: { message, retryable: true },
      }
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 60000 },
})

// Schedule definitions for cron jobs
export const TREASURY_SCHEDULES = {
  autoSend: '0 */4 * * *', // Every 4 hours
  syncTopups: '*/15 * * * *', // Every 15 minutes
  lowBalanceAlert: '0 9,17 * * *', // 9 AM and 5 PM
} as const
