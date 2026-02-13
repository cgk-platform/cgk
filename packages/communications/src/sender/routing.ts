/**
 * Notification Routing
 *
 * Maps notification types to sender addresses.
 * Provides the core getSenderForNotification() function.
 *
 * @ai-pattern tenant-isolation
 * @ai-required Use withTenant() wrapper when calling these functions
 */

import { sql } from '@cgk-platform/db'

import type {
  NotificationChannel,
  NotificationRouting,
  NotificationRoutingWithSender,
  NotificationType,
  SenderAddressWithDomain,
  SenderResolutionResult,
  UpdateNotificationRoutingInput,
} from '../types.js'
import { DEFAULT_NOTIFICATION_ROUTING, NOTIFICATION_TYPES } from '../types.js'
import { formatSenderAddress, getDefaultSender, getDefaultSenderForPurpose, getSenderAddressById } from './addresses.js'

/**
 * Map database row to NotificationRouting
 */
function mapRowToRouting(row: Record<string, unknown>): NotificationRouting {
  return {
    id: row.id as string,
    notificationType: row.notification_type as NotificationType,
    senderAddressId: row.sender_address_id as string | null,
    isEnabled: row.is_enabled as boolean,
    channel: row.channel as NotificationChannel,
    delayDays: row.delay_days as number,
    maxRetries: row.max_retries as number,
    retryDelayMinutes: row.retry_delay_minutes as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row to NotificationRoutingWithSender
 */
function mapRowToRoutingWithSender(
  row: Record<string, unknown>
): NotificationRoutingWithSender {
  const routing = mapRowToRouting(row)

  let senderAddress: SenderAddressWithDomain | null = null
  if (row.sa_id) {
    senderAddress = {
      id: row.sa_id as string,
      domainId: row.sa_domain_id as string,
      emailAddress: row.sa_email_address as string,
      displayName: row.sa_display_name as string,
      purpose: row.sa_purpose as SenderAddressWithDomain['purpose'],
      isDefault: row.sa_is_default as boolean,
      isInboundEnabled: row.sa_is_inbound_enabled as boolean,
      replyToAddress: row.sa_reply_to_address as string | null,
      createdAt: new Date(row.sa_created_at as string),
      updatedAt: new Date(row.sa_updated_at as string),
      domain: row.d_domain as string,
      subdomain: row.d_subdomain as string | null,
      verificationStatus: row.d_verification_status as SenderAddressWithDomain['verificationStatus'],
    }
  }

  return {
    ...routing,
    senderAddress,
  }
}

/**
 * Get all notification routing rules
 */
export async function listNotificationRouting(): Promise<NotificationRoutingWithSender[]> {
  const result = await sql`
    SELECT
      r.id, r.notification_type, r.sender_address_id, r.is_enabled,
      r.channel, r.delay_days, r.max_retries, r.retry_delay_minutes,
      r.created_at, r.updated_at,
      sa.id as sa_id, sa.domain_id as sa_domain_id,
      sa.email_address as sa_email_address, sa.display_name as sa_display_name,
      sa.purpose as sa_purpose, sa.is_default as sa_is_default,
      sa.is_inbound_enabled as sa_is_inbound_enabled,
      sa.reply_to_address as sa_reply_to_address,
      sa.created_at as sa_created_at, sa.updated_at as sa_updated_at,
      d.domain as d_domain, d.subdomain as d_subdomain,
      d.verification_status as d_verification_status
    FROM tenant_notification_routing r
    LEFT JOIN tenant_sender_addresses sa ON sa.id = r.sender_address_id
    LEFT JOIN tenant_email_domains d ON d.id = sa.domain_id
    ORDER BY r.notification_type ASC
  `

  return result.rows.map((row) => mapRowToRoutingWithSender(row as Record<string, unknown>))
}

/**
 * Get routing for a specific notification type
 */
export async function getNotificationRouting(
  notificationType: NotificationType
): Promise<NotificationRoutingWithSender | null> {
  const result = await sql`
    SELECT
      r.id, r.notification_type, r.sender_address_id, r.is_enabled,
      r.channel, r.delay_days, r.max_retries, r.retry_delay_minutes,
      r.created_at, r.updated_at,
      sa.id as sa_id, sa.domain_id as sa_domain_id,
      sa.email_address as sa_email_address, sa.display_name as sa_display_name,
      sa.purpose as sa_purpose, sa.is_default as sa_is_default,
      sa.is_inbound_enabled as sa_is_inbound_enabled,
      sa.reply_to_address as sa_reply_to_address,
      sa.created_at as sa_created_at, sa.updated_at as sa_updated_at,
      d.domain as d_domain, d.subdomain as d_subdomain,
      d.verification_status as d_verification_status
    FROM tenant_notification_routing r
    LEFT JOIN tenant_sender_addresses sa ON sa.id = r.sender_address_id
    LEFT JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE r.notification_type = ${notificationType}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToRoutingWithSender(row as Record<string, unknown>)
}

/**
 * Create or update notification routing
 */
export async function upsertNotificationRouting(
  notificationType: NotificationType,
  input: UpdateNotificationRoutingInput
): Promise<NotificationRouting> {
  // Check if routing exists
  const existing = await sql`
    SELECT id FROM tenant_notification_routing
    WHERE notification_type = ${notificationType}
  `

  if (existing.rows.length > 0) {
    // Update existing
    const result = await sql`
      UPDATE tenant_notification_routing
      SET
        sender_address_id = COALESCE(${input.senderAddressId ?? null}, sender_address_id),
        is_enabled = COALESCE(${input.isEnabled ?? null}, is_enabled),
        channel = COALESCE(${input.channel ?? null}, channel),
        delay_days = COALESCE(${input.delayDays ?? null}, delay_days),
        max_retries = COALESCE(${input.maxRetries ?? null}, max_retries),
        retry_delay_minutes = COALESCE(${input.retryDelayMinutes ?? null}, retry_delay_minutes),
        updated_at = NOW()
      WHERE notification_type = ${notificationType}
      RETURNING
        id, notification_type, sender_address_id, is_enabled,
        channel, delay_days, max_retries, retry_delay_minutes,
        created_at, updated_at
    `

    return mapRowToRouting(result.rows[0] as Record<string, unknown>)
  }

  // Create new routing
  const defaults = DEFAULT_NOTIFICATION_ROUTING[notificationType]
  const result = await sql`
    INSERT INTO tenant_notification_routing (
      notification_type, sender_address_id, is_enabled,
      channel, delay_days, max_retries, retry_delay_minutes
    ) VALUES (
      ${notificationType},
      ${input.senderAddressId ?? null},
      ${input.isEnabled ?? true},
      ${input.channel ?? defaults?.channel ?? 'email'},
      ${input.delayDays ?? 0},
      ${input.maxRetries ?? 3},
      ${input.retryDelayMinutes ?? 60}
    )
    RETURNING
      id, notification_type, sender_address_id, is_enabled,
      channel, delay_days, max_retries, retry_delay_minutes,
      created_at, updated_at
  `

  return mapRowToRouting(result.rows[0] as Record<string, unknown>)
}

/**
 * Seed default notification routing for a tenant
 * Creates entries for all notification types with default values
 */
export async function seedDefaultNotificationRouting(): Promise<void> {
  const notificationTypes = Object.values(NOTIFICATION_TYPES)

  for (const notificationType of notificationTypes) {
    const existing = await sql`
      SELECT 1 FROM tenant_notification_routing
      WHERE notification_type = ${notificationType}
    `

    if (existing.rows.length === 0) {
      const defaults = DEFAULT_NOTIFICATION_ROUTING[notificationType]
      await sql`
        INSERT INTO tenant_notification_routing (
          notification_type, is_enabled, channel,
          delay_days, max_retries, retry_delay_minutes
        ) VALUES (
          ${notificationType},
          true,
          ${defaults?.channel ?? 'email'},
          0,
          3,
          60
        )
      `
    }
  }
}

/**
 * Get the sender address for a notification type
 *
 * Resolution order:
 * 1. Explicitly configured sender for this notification type
 * 2. Default sender for the notification's purpose category
 * 3. Any default verified sender
 * 4. Error if no sender found
 *
 * @ai-pattern sender-resolution
 * @ai-critical Never hardcode sender addresses - always use this function
 */
export async function getSenderForNotification(
  notificationType: NotificationType
): Promise<SenderResolutionResult> {
  // 1. Check for explicit routing
  const routing = await getNotificationRouting(notificationType)

  if (routing?.senderAddressId) {
    const sender = await getSenderAddressById(routing.senderAddressId)
    if (sender && sender.verificationStatus === 'verified') {
      return {
        success: true,
        sender: {
          from: formatSenderAddress(sender),
          replyTo: sender.replyToAddress ?? undefined,
          isVerified: true,
        },
      }
    }
    // Sender configured but not verified, fall through to defaults
  }

  // Check if notification is disabled
  if (routing && !routing.isEnabled) {
    return {
      success: false,
      error: `Notification type "${notificationType}" is disabled`,
    }
  }

  // 2. Get default sender for the notification's purpose
  const defaults = DEFAULT_NOTIFICATION_ROUTING[notificationType]
  if (defaults) {
    const purposeSender = await getDefaultSenderForPurpose(defaults.purpose)
    if (purposeSender && purposeSender.verificationStatus === 'verified') {
      return {
        success: true,
        sender: {
          from: formatSenderAddress(purposeSender),
          replyTo: purposeSender.replyToAddress ?? undefined,
          isVerified: true,
        },
        fallbackUsed: true,
      }
    }
  }

  // 3. Get any default verified sender
  const defaultSender = await getDefaultSender()
  if (defaultSender) {
    return {
      success: true,
      sender: {
        from: formatSenderAddress(defaultSender),
        replyTo: defaultSender.replyToAddress ?? undefined,
        isVerified: true,
      },
      fallbackUsed: true,
    }
  }

  // 4. No sender found
  return {
    success: false,
    error: 'No verified sender address configured for this tenant',
  }
}

/**
 * Get all notification types with their current routing status
 */
export async function getAllNotificationRoutingStatus(): Promise<
  Array<{
    notificationType: NotificationType
    label: string
    category: string
    isConfigured: boolean
    isEnabled: boolean
    senderEmail: string | null
    channel: NotificationChannel
  }>
> {
  const routing = await listNotificationRouting()
  const routingMap = new Map(routing.map((r) => [r.notificationType, r]))

  const categories: Record<string, string> = {
    review: 'Reviews',
    subscription: 'Subscriptions',
    creator: 'Creators',
    esign: 'E-Signatures',
    treasury: 'Treasury',
    contractor: 'Contractors',
    team: 'Team',
    system: 'System',
  }

  return Object.entries(NOTIFICATION_TYPES).map(([key, type]) => {
    const r = routingMap.get(type)
    const categoryKey = key.split('_')[0]?.toLowerCase() ?? ''

    return {
      notificationType: type,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      category: categories[categoryKey] ?? 'Other',
      isConfigured: !!r?.senderAddressId,
      isEnabled: r?.isEnabled ?? true,
      senderEmail: r?.senderAddress?.emailAddress ?? null,
      channel: r?.channel ?? 'email',
    }
  })
}
