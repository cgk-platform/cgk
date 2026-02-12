/**
 * Creator Lifecycle Automation Jobs
 *
 * Background jobs for:
 * - Approval reminders (daily cron)
 * - Welcome call reminders (daily cron)
 * - Slack notifications (event-driven)
 * - Shipment sync (hourly cron)
 */

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
    _job: Job<TenantEvent<CreatorApprovalRemindersPayload>>
  ): Promise<JobResult<CheckApprovalRemindersResult>> => {
    // In a full implementation, this would:
    // 1. Get all active tenants from public.organizations
    // 2. For each tenant, call the reminder processing logic
    // 3. Use @cgk/db withTenant() for tenant isolation
    // 4. Queue email/SMS jobs via sendJob()

    console.log('[checkApprovalReminders] Processing approval reminders...')

    // Placeholder implementation
    return {
      success: true,
      data: {
        tenantsProcessed: 0,
        remindersQueued: 0,
        escalationsMarked: 0,
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
    _job: Job<TenantEvent<CreatorWelcomeCallRemindersPayload>>
  ): Promise<JobResult<CheckWelcomeCallRemindersResult>> => {
    console.log('[checkWelcomeCallReminders] Processing welcome call reminders...')

    // Placeholder implementation
    return {
      success: true,
      data: {
        tenantsProcessed: 0,
        remindersQueued: 0,
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
    // 1. Use @cgk/db withTenant() for tenant isolation
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
