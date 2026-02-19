/**
 * Creator Lifecycle Automation Jobs
 *
 * Background jobs for:
 * - Approval reminders (daily cron)
 * - Welcome call reminders (daily cron)
 * - Slack notifications (event-driven)
 * - Shipment sync (hourly cron)
 */

import { withTenant, sql } from '@cgk-platform/db'
import { defineJob } from '../define'
import type { Job, JobResult } from '../types'
import type {
  CreatorApprovalRemindersPayload,
  CreatorShipmentSyncPayload,
  CreatorSlackNotificationPayload,
  CreatorWelcomeCallRemindersPayload,
  TenantEvent,
} from '../events'

// ============================================================
// APPROVAL REMINDERS (Daily 9 AM UTC)
// ============================================================

interface CheckApprovalRemindersResult {
  tenantsProcessed: number
  remindersQueued: number
  escalationsMarked: number
}

/**
 * Process approval reminders for all tenants
 * Runs daily at 9 AM UTC
 *
 * For each tenant:
 * 1. Get reminder config
 * 2. Find approved creators who haven't logged in
 * 3. Check which step they're on based on days since approval
 * 4. Queue appropriate reminder emails
 * 5. Update reminder_count and last_reminder_at
 * 6. Mark as escalated if past final step + escalation days
 */
export const checkApprovalRemindersJob = defineJob<
  TenantEvent<CreatorApprovalRemindersPayload>,
  CheckApprovalRemindersResult
>({
  name: 'creator.approvalReminders',
  handler: async (
    job: Job<TenantEvent<CreatorApprovalRemindersPayload>>
  ): Promise<JobResult<CheckApprovalRemindersResult>> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[checkApprovalReminders] Processing approval reminders for tenant ${tenantId}`)

    const result = await withTenant(tenantId, async () => {
      // Get reminder config (singleton per tenant)
      const configRes = await sql`
        SELECT approval_enabled, approval_steps, approval_escalation_enabled,
               approval_escalation_days
        FROM creator_reminder_config
        LIMIT 1
      `
      const config = configRes.rows[0] as {
        approval_enabled: boolean
        approval_steps: Array<{ day: number; template: string }>
        approval_escalation_enabled: boolean
        approval_escalation_days: number
      } | undefined

      if (!config?.approval_enabled) {
        return { remindersQueued: 0, escalationsMarked: 0 }
      }

      const steps: Array<{ day: number; template: string }> = config.approval_steps || [
        { day: 1, template: 'creator-approval-reminder-day1' },
        { day: 3, template: 'creator-approval-reminder-day3' },
        { day: 7, template: 'creator-approval-reminder-day7' },
      ]

      // Find approved creators who haven't logged in yet and need a reminder.
      // Reminder eligibility: approved_at > 1 day ago, first_login_at IS NULL,
      //   last reminder was >1 day ago or never sent.
      const creatorsRes = await sql`
        SELECT id, email, first_name, last_name, approved_at,
               reminder_count, last_reminder_at
        FROM creators
        WHERE status = 'approved'
          AND first_login_at IS NULL
          AND approved_at IS NOT NULL
          AND approved_at <= NOW() - INTERVAL '1 day'
          AND (last_reminder_at IS NULL OR last_reminder_at <= NOW() - INTERVAL '1 day')
        ORDER BY approved_at ASC
        LIMIT 200
      `

      const creators = creatorsRes.rows as Array<{
        id: string; email: string; first_name: string; last_name: string
        approved_at: string; reminder_count: number; last_reminder_at: string | null
      }>

      let remindersQueued = 0
      let escalationsMarked = 0

      for (const creator of creators) {
        const daysSinceApproval = Math.floor(
          (Date.now() - new Date(creator.approved_at).getTime()) / 86400000
        )

        // Find which step we should be on (match to current day bracket)
        const step = steps.find(s => s.day === daysSinceApproval) ??
          (daysSinceApproval >= 3 && creator.reminder_count < steps.length
            ? steps[Math.min(creator.reminder_count, steps.length - 1)]
            : null)

        if (step) {
          // Insert into creator_email_queue for processing
          await sql`
            INSERT INTO creator_email_queue
              (id, creator_id, template_id, status, priority, scheduled_for, created_at)
            VALUES
              (gen_random_uuid()::text, ${creator.id}, ${step.template},
               'pending', 'normal', NOW(), NOW())
            ON CONFLICT DO NOTHING
          `

          // Update reminder tracking on the creator
          await sql`
            UPDATE creators
            SET reminder_count = reminder_count + 1,
                last_reminder_at = NOW(),
                updated_at = NOW()
            WHERE id = ${creator.id}
          `
          remindersQueued++
        }

        // Escalate if past final step + escalation_days
        const escalationDay = steps[steps.length - 1]!.day + (config.approval_escalation_days || 7)
        if (config.approval_escalation_enabled && daysSinceApproval >= escalationDay && !creator.last_reminder_at) {
          await sql`
            UPDATE creators
            SET escalated_at = NOW(), updated_at = NOW()
            WHERE id = ${creator.id} AND escalated_at IS NULL
          `
          escalationsMarked++
        }
      }

      return { remindersQueued, escalationsMarked }
    })

    return {
      success: true,
      data: {
        tenantsProcessed: 1,
        remindersQueued: result.remindersQueued,
        escalationsMarked: result.escalationsMarked,
      },
    }
  },
})

// ============================================================
// WELCOME CALL REMINDERS (Daily 10 AM UTC)
// ============================================================

interface CheckWelcomeCallRemindersResult {
  tenantsProcessed: number
  remindersQueued: number
}

/**
 * Process welcome call reminders for all tenants
 * Runs daily at 10 AM UTC
 *
 * For each tenant:
 * 1. Get reminder config
 * 2. Find creators: logged_in AND no_call_scheduled AND !dismissed
 * 3. Queue appropriate reminder based on days since first login
 * 4. Update welcome_call_reminder_count
 */
export const checkWelcomeCallRemindersJob = defineJob<
  TenantEvent<CreatorWelcomeCallRemindersPayload>,
  CheckWelcomeCallRemindersResult
>({
  name: 'creator.welcomeCallReminders',
  handler: async (
    job: Job<TenantEvent<CreatorWelcomeCallRemindersPayload>>
  ): Promise<JobResult<CheckWelcomeCallRemindersResult>> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return { success: false, error: { message: 'tenantId required', retryable: false } }
    }

    console.log(`[checkWelcomeCallReminders] Processing welcome call reminders for tenant ${tenantId}`)

    const result = await withTenant(tenantId, async () => {
      // Get config
      const configRes = await sql`
        SELECT welcome_call_enabled, welcome_call_steps, welcome_call_event_type_id
        FROM creator_reminder_config
        LIMIT 1
      `
      const config = configRes.rows[0] as {
        welcome_call_enabled: boolean
        welcome_call_steps: Array<{ day: number; template: string }>
        welcome_call_event_type_id: string | null
      } | undefined

      if (!config?.welcome_call_enabled) {
        return { remindersQueued: 0 }
      }

      const steps: Array<{ day: number; template: string }> = config.welcome_call_steps || [
        { day: 1, template: 'creator-welcome-call-reminder-day1' },
        { day: 3, template: 'creator-welcome-call-reminder-day3' },
      ]

      // Find creators who: have logged in (first_login_at IS NOT NULL),
      //   have NOT scheduled a welcome call (welcome_call_scheduled_at IS NULL),
      //   have NOT dismissed (welcome_call_dismissed = false),
      //   and need a reminder (last reminder >1 day ago or never)
      const creatorsRes = await sql`
        SELECT id, email, first_name, last_name, first_login_at,
               welcome_call_reminder_count, last_reminder_at
        FROM creators
        WHERE status IN ('approved', 'active')
          AND first_login_at IS NOT NULL
          AND welcome_call_scheduled_at IS NULL
          AND welcome_call_dismissed = false
          AND (last_reminder_at IS NULL OR last_reminder_at <= NOW() - INTERVAL '1 day')
          AND first_login_at <= NOW() - INTERVAL '1 day'
        ORDER BY first_login_at ASC
        LIMIT 200
      `

      const creators = creatorsRes.rows as Array<{
        id: string; email: string; first_name: string; last_name: string
        first_login_at: string; welcome_call_reminder_count: number; last_reminder_at: string | null
      }>

      let remindersQueued = 0

      for (const creator of creators) {
        const daysSinceLogin = Math.floor(
          (Date.now() - new Date(creator.first_login_at).getTime()) / 86400000
        )

        // Pick appropriate step for current day bracket
        const step = steps.find(s => s.day === daysSinceLogin) ??
          (creator.welcome_call_reminder_count < steps.length
            ? steps[Math.min(creator.welcome_call_reminder_count, steps.length - 1)]
            : null)

        if (!step) continue

        // Build scheduling link if Cal.com event type configured
        const calLink = config.welcome_call_event_type_id
          ? `https://cal.com/event/${config.welcome_call_event_type_id}?creator=${creator.id}`
          : null

        await sql`
          INSERT INTO creator_email_queue
            (id, creator_id, template_id, status, priority, scheduled_for, data, created_at)
          VALUES
            (gen_random_uuid()::text, ${creator.id}, ${step.template},
             'pending', 'normal', NOW(),
             ${JSON.stringify({ calLink, creatorName: `${creator.first_name} ${creator.last_name}` })},
             NOW())
          ON CONFLICT DO NOTHING
        `

        await sql`
          UPDATE creators
          SET welcome_call_reminder_count = welcome_call_reminder_count + 1,
              last_reminder_at = NOW(),
              updated_at = NOW()
          WHERE id = ${creator.id}
        `
        remindersQueued++
      }

      return { remindersQueued }
    })

    return {
      success: true,
      data: {
        tenantsProcessed: 1,
        remindersQueued: result.remindersQueued,
      },
    }
  },
})

// ============================================================
// SLACK NOTIFICATION (Event-driven)
// ============================================================

interface SendSlackNotificationResult {
  sent: boolean
  channelId?: string
  messageTs?: string
  error?: string
}

/**
 * Send a Slack notification for creator lifecycle events
 * Triggered by various creator events
 *
 * 1. Get notification config for this event type
 * 2. If enabled, build Slack blocks with template
 * 3. Send to configured channel
 * 4. Log delivery (fire-and-forget, don't block)
 */
export const sendCreatorSlackNotificationJob = defineJob<
  TenantEvent<CreatorSlackNotificationPayload>,
  SendSlackNotificationResult
>({
  name: 'creator.slackNotification',
  handler: async (
    job: Job<TenantEvent<CreatorSlackNotificationPayload>>
  ): Promise<JobResult<SendSlackNotificationResult>> => {
    const { tenantId, notificationType, creatorName, creatorEmail, metadata } = job.payload

    console.log(
      `[sendCreatorSlackNotification] Sending ${notificationType} for ${creatorName} (${creatorEmail}) in tenant ${tenantId}`,
      metadata
    )

    // In a full implementation, this would:
    // 1. Get Slack notification config from Redis using createTenantCache
    // 2. Check if this notification type is enabled
    // 3. Get the configured channel
    // 4. Build Slack Block Kit message from template
    // 5. Send via Slack Web API using tenant's bot token
    // 6. Log to tenant_slack_notifications table

    // Placeholder - always return success for now
    return {
      success: true,
      data: {
        sent: true,
        channelId: 'C00000001',
        messageTs: Date.now().toString(),
      },
    }
  },
})

// ============================================================
// SHIPMENT SYNC (Hourly)
// ============================================================

interface SyncShipmentsResult {
  tenantsProcessed: number
  shipmentsChecked: number
  shipmentsUpdated: number
}

/**
 * Sync shipment status from Shopify
 * Runs hourly
 *
 * For each tenant:
 * 1. Find shipments with status 'ordered' or 'shipped'
 * 2. Check Shopify fulfillment status
 * 3. Update tracking number, carrier, status
 * 4. Send Slack notification on status change
 */
export const syncCreatorShipmentsJob = defineJob<
  TenantEvent<CreatorShipmentSyncPayload>,
  SyncShipmentsResult
>({
  name: 'creator.shipmentSync',
  handler: async (
    job: Job<TenantEvent<CreatorShipmentSyncPayload>>
  ): Promise<JobResult<SyncShipmentsResult>> => {
    const { tenantId, shipmentId, fullSync } = job.payload

    console.log(
      `[syncCreatorShipments] Syncing shipments for tenant ${tenantId}`,
      { shipmentId, fullSync }
    )

    // In a full implementation, this would:
    // 1. Use @cgk-platform/db withTenant() for tenant isolation
    // 2. Call getShipmentsForSync() to get pending shipments
    // 3. For each shipment, fetch order from Shopify
    // 4. Check fulfillment status and tracking info
    // 5. Update shipment via updateShipmentStatus()
    // 6. Queue Slack notification if status changed

    // Placeholder implementation
    return {
      success: true,
      data: {
        tenantsProcessed: 1,
        shipmentsChecked: 0,
        shipmentsUpdated: 0,
      },
    }
  },
})

// ============================================================
// SCHEDULES
// ============================================================

export const CREATOR_LIFECYCLE_SCHEDULES = {
  approvalReminders: {
    cron: '0 9 * * *', // Daily at 9 AM UTC
    timezone: 'UTC',
  },
  welcomeCallReminders: {
    cron: '0 10 * * *', // Daily at 10 AM UTC
    timezone: 'UTC',
  },
  shipmentSync: {
    cron: '0 * * * *', // Every hour
    timezone: 'UTC',
  },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const creatorLifecycleJobs = [
  checkApprovalRemindersJob,
  checkWelcomeCallRemindersJob,
  sendCreatorSlackNotificationJob,
  syncCreatorShipmentsJob,
]
