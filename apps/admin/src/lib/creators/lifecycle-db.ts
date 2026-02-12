/**
 * Database operations for Creator Lifecycle Automation
 * - Product shipments (PostgreSQL)
 * - Reminder config (PostgreSQL)
 * - Slack notifications config (Redis)
 */

import { createTenantCache, sql, withTenant } from '@cgk/db'

import type {
  CreateShipmentParams,
  CreatorReminderConfig,
  CreatorSlackNotificationConfig,
  ProductShipment,
  ReminderStep,
  ShipmentStatus,
} from './lifecycle-types'
import {
  CREATOR_NOTIFICATION_TYPES,
  DEFAULT_APPROVAL_STEPS,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_WELCOME_CALL_STEPS,
} from './lifecycle-types'

// ============================================================
// SLACK NOTIFICATION CONFIG (Redis)
// ============================================================

const SLACK_CONFIG_KEY = 'creator:slack:notifications:config'

/**
 * Get Slack notification configuration for all creator events
 */
export async function getSlackNotificationConfig(
  tenantSlug: string
): Promise<CreatorSlackNotificationConfig[]> {
  const cache = createTenantCache(tenantSlug)
  const cached = await cache.get<CreatorSlackNotificationConfig[]>(SLACK_CONFIG_KEY)

  if (cached) {
    return cached
  }

  // Return default config if not set
  return CREATOR_NOTIFICATION_TYPES.map((nt) => ({
    type: nt.type,
    enabled: false,
    channelId: '',
    channelName: '',
    messageTemplate: DEFAULT_NOTIFICATION_TEMPLATES[nt.type],
    includeActionButtons: true,
    customEmoji: nt.emoji,
  }))
}

/**
 * Save Slack notification configuration
 */
export async function saveSlackNotificationConfig(
  tenantSlug: string,
  config: CreatorSlackNotificationConfig[]
): Promise<void> {
  const cache = createTenantCache(tenantSlug)
  await cache.set(SLACK_CONFIG_KEY, config)
}

/**
 * Get configuration for a specific notification type
 */
export async function getSlackNotificationConfigByType(
  tenantSlug: string,
  type: string
): Promise<CreatorSlackNotificationConfig | null> {
  const configs = await getSlackNotificationConfig(tenantSlug)
  return configs.find((c) => c.type === type) || null
}

// ============================================================
// PRODUCT SHIPMENTS (PostgreSQL)
// ============================================================

/**
 * Get all shipments for a creator
 */
export async function getCreatorShipments(
  tenantSlug: string,
  creatorId: string
): Promise<ProductShipment[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        creator_id as "creatorId",
        shopify_order_id as "shopifyOrderId",
        shopify_order_number as "shopifyOrderNumber",
        shopify_draft_order_id as "shopifyDraftOrderId",
        products,
        status,
        tracking_number as "trackingNumber",
        carrier,
        shipping_address as "shippingAddress",
        ordered_at as "orderedAt",
        shipped_at as "shippedAt",
        delivered_at as "deliveredAt",
        notes,
        created_by as "createdBy",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_product_shipments
      WHERE creator_id = ${creatorId}
      ORDER BY created_at DESC
    `
    return result.rows as ProductShipment[]
  })
}

/**
 * Get a single shipment by ID
 */
export async function getShipmentById(
  tenantSlug: string,
  shipmentId: string
): Promise<ProductShipment | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        creator_id as "creatorId",
        shopify_order_id as "shopifyOrderId",
        shopify_order_number as "shopifyOrderNumber",
        shopify_draft_order_id as "shopifyDraftOrderId",
        products,
        status,
        tracking_number as "trackingNumber",
        carrier,
        shipping_address as "shippingAddress",
        ordered_at as "orderedAt",
        shipped_at as "shippedAt",
        delivered_at as "deliveredAt",
        notes,
        created_by as "createdBy",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_product_shipments
      WHERE id = ${shipmentId}
      LIMIT 1
    `
    return (result.rows[0] as ProductShipment) || null
  })
}

/**
 * Create a new shipment record
 */
export async function createShipment(
  tenantSlug: string,
  params: CreateShipmentParams,
  createdBy: string
): Promise<ProductShipment> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_product_shipments (
        creator_id,
        products,
        shipping_address,
        notes,
        created_by,
        status
      ) VALUES (
        ${params.creatorId},
        ${JSON.stringify(params.products)}::jsonb,
        ${JSON.stringify(params.shippingAddress)}::jsonb,
        ${params.notes || null},
        ${createdBy},
        'pending'
      )
      RETURNING
        id,
        creator_id as "creatorId",
        shopify_order_id as "shopifyOrderId",
        shopify_order_number as "shopifyOrderNumber",
        shopify_draft_order_id as "shopifyDraftOrderId",
        products,
        status,
        tracking_number as "trackingNumber",
        carrier,
        shipping_address as "shippingAddress",
        ordered_at as "orderedAt",
        shipped_at as "shippedAt",
        delivered_at as "deliveredAt",
        notes,
        created_by as "createdBy",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as ProductShipment
  })
}

/**
 * Update shipment with Shopify order details
 */
export async function updateShipmentWithOrder(
  tenantSlug: string,
  shipmentId: string,
  shopifyData: {
    shopifyOrderId: string
    shopifyOrderNumber: string
    shopifyDraftOrderId?: string
  }
): Promise<ProductShipment | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creator_product_shipments
      SET
        shopify_order_id = ${shopifyData.shopifyOrderId},
        shopify_order_number = ${shopifyData.shopifyOrderNumber},
        shopify_draft_order_id = ${shopifyData.shopifyDraftOrderId || null},
        status = 'ordered',
        ordered_at = NOW(),
        updated_at = NOW()
      WHERE id = ${shipmentId}
      RETURNING
        id,
        creator_id as "creatorId",
        shopify_order_id as "shopifyOrderId",
        shopify_order_number as "shopifyOrderNumber",
        shopify_draft_order_id as "shopifyDraftOrderId",
        products,
        status,
        tracking_number as "trackingNumber",
        carrier,
        shipping_address as "shippingAddress",
        ordered_at as "orderedAt",
        shipped_at as "shippedAt",
        delivered_at as "deliveredAt",
        notes,
        created_by as "createdBy",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return (result.rows[0] as ProductShipment) || null
  })
}

/**
 * Update shipment status and tracking
 */
export async function updateShipmentStatus(
  tenantSlug: string,
  shipmentId: string,
  updates: {
    status?: ShipmentStatus
    trackingNumber?: string
    carrier?: string
    errorMessage?: string
  }
): Promise<ProductShipment | null> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.status) {
      paramIndex++
      setClauses.push(`status = $${paramIndex}`)
      values.push(updates.status)

      // Set appropriate timestamp based on status
      if (updates.status === 'shipped') {
        setClauses.push('shipped_at = NOW()')
      } else if (updates.status === 'delivered') {
        setClauses.push('delivered_at = NOW()')
      }
    }

    if (updates.trackingNumber !== undefined) {
      paramIndex++
      setClauses.push(`tracking_number = $${paramIndex}`)
      values.push(updates.trackingNumber)
    }

    if (updates.carrier !== undefined) {
      paramIndex++
      setClauses.push(`carrier = $${paramIndex}`)
      values.push(updates.carrier)
    }

    if (updates.errorMessage !== undefined) {
      paramIndex++
      setClauses.push(`error_message = $${paramIndex}`)
      values.push(updates.errorMessage)
    }

    paramIndex++
    values.push(shipmentId)

    const result = await sql.query(
      `UPDATE creator_product_shipments
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING
         id,
         creator_id as "creatorId",
         shopify_order_id as "shopifyOrderId",
         shopify_order_number as "shopifyOrderNumber",
         shopify_draft_order_id as "shopifyDraftOrderId",
         products,
         status,
         tracking_number as "trackingNumber",
         carrier,
         shipping_address as "shippingAddress",
         ordered_at as "orderedAt",
         shipped_at as "shippedAt",
         delivered_at as "deliveredAt",
         notes,
         created_by as "createdBy",
         error_message as "errorMessage",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      values
    )
    return (result.rows[0] as ProductShipment) || null
  })
}

/**
 * Get shipments that need status sync (ordered or shipped)
 */
export async function getShipmentsForSync(tenantSlug: string): Promise<ProductShipment[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        creator_id as "creatorId",
        shopify_order_id as "shopifyOrderId",
        shopify_order_number as "shopifyOrderNumber",
        shopify_draft_order_id as "shopifyDraftOrderId",
        products,
        status,
        tracking_number as "trackingNumber",
        carrier,
        shipping_address as "shippingAddress",
        ordered_at as "orderedAt",
        shipped_at as "shippedAt",
        delivered_at as "deliveredAt",
        notes,
        created_by as "createdBy",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_product_shipments
      WHERE status IN ('ordered', 'shipped')
        AND shopify_order_id IS NOT NULL
      ORDER BY created_at DESC
    `
    return result.rows as ProductShipment[]
  })
}

/**
 * Get shipment summary for a creator (for card badge)
 */
export async function getCreatorShipmentSummary(
  tenantSlug: string,
  creatorId: string
): Promise<{
  totalProducts: number
  latestStatus?: ShipmentStatus
  latestDate?: string
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COALESCE(SUM((
          SELECT SUM((p->>'quantity')::int)
          FROM jsonb_array_elements(products) p
        )), 0)::int as total_products,
        (
          SELECT status
          FROM creator_product_shipments s2
          WHERE s2.creator_id = ${creatorId}
          ORDER BY created_at DESC
          LIMIT 1
        ) as latest_status,
        (
          SELECT COALESCE(shipped_at, ordered_at, created_at)
          FROM creator_product_shipments s3
          WHERE s3.creator_id = ${creatorId}
          ORDER BY created_at DESC
          LIMIT 1
        ) as latest_date
      FROM creator_product_shipments
      WHERE creator_id = ${creatorId}
    `

    const row = result.rows[0] || {}
    return {
      totalProducts: Number(row.total_products || 0),
      latestStatus: row.latest_status as ShipmentStatus | undefined,
      latestDate: row.latest_date as string | undefined,
    }
  })
}

// ============================================================
// REMINDER CONFIG (PostgreSQL)
// ============================================================

/**
 * Get reminder configuration (singleton per tenant)
 */
export async function getReminderConfig(
  tenantSlug: string
): Promise<CreatorReminderConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        approval_enabled as "approvalEnabled",
        approval_schedule_time::text as "approvalScheduleTime",
        approval_steps as "approvalSteps",
        approval_escalation_enabled as "approvalEscalationEnabled",
        approval_escalation_days as "approvalEscalationDays",
        approval_escalation_slack as "approvalEscalationSlack",
        welcome_call_enabled as "welcomeCallEnabled",
        welcome_call_schedule_time::text as "welcomeCallScheduleTime",
        welcome_call_steps as "welcomeCallSteps",
        welcome_call_event_type_id as "welcomeCallEventTypeId",
        max_one_per_day as "maxOnePerDay",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_reminder_config
      LIMIT 1
    `
    return (result.rows[0] as CreatorReminderConfig) || null
  })
}

/**
 * Create or update reminder configuration
 */
export async function upsertReminderConfig(
  tenantSlug: string,
  config: Partial<Omit<CreatorReminderConfig, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<CreatorReminderConfig> {
  return withTenant(tenantSlug, async () => {
    // Use upsert with the singleton constraint
    const result = await sql`
      INSERT INTO creator_reminder_config (
        approval_enabled,
        approval_schedule_time,
        approval_steps,
        approval_escalation_enabled,
        approval_escalation_days,
        approval_escalation_slack,
        welcome_call_enabled,
        welcome_call_schedule_time,
        welcome_call_steps,
        welcome_call_event_type_id,
        max_one_per_day
      ) VALUES (
        ${config.approvalEnabled ?? true},
        ${config.approvalScheduleTime ?? '09:00'}::time,
        ${JSON.stringify(config.approvalSteps ?? DEFAULT_APPROVAL_STEPS)}::jsonb,
        ${config.approvalEscalationEnabled ?? true},
        ${config.approvalEscalationDays ?? 7},
        ${config.approvalEscalationSlack ?? true},
        ${config.welcomeCallEnabled ?? true},
        ${config.welcomeCallScheduleTime ?? '10:00'}::time,
        ${JSON.stringify(config.welcomeCallSteps ?? DEFAULT_WELCOME_CALL_STEPS)}::jsonb,
        ${config.welcomeCallEventTypeId ?? null},
        ${config.maxOnePerDay ?? true}
      )
      ON CONFLICT ((true)) DO UPDATE SET
        approval_enabled = COALESCE(EXCLUDED.approval_enabled, creator_reminder_config.approval_enabled),
        approval_schedule_time = COALESCE(EXCLUDED.approval_schedule_time, creator_reminder_config.approval_schedule_time),
        approval_steps = COALESCE(EXCLUDED.approval_steps, creator_reminder_config.approval_steps),
        approval_escalation_enabled = COALESCE(EXCLUDED.approval_escalation_enabled, creator_reminder_config.approval_escalation_enabled),
        approval_escalation_days = COALESCE(EXCLUDED.approval_escalation_days, creator_reminder_config.approval_escalation_days),
        approval_escalation_slack = COALESCE(EXCLUDED.approval_escalation_slack, creator_reminder_config.approval_escalation_slack),
        welcome_call_enabled = COALESCE(EXCLUDED.welcome_call_enabled, creator_reminder_config.welcome_call_enabled),
        welcome_call_schedule_time = COALESCE(EXCLUDED.welcome_call_schedule_time, creator_reminder_config.welcome_call_schedule_time),
        welcome_call_steps = COALESCE(EXCLUDED.welcome_call_steps, creator_reminder_config.welcome_call_steps),
        welcome_call_event_type_id = COALESCE(EXCLUDED.welcome_call_event_type_id, creator_reminder_config.welcome_call_event_type_id),
        max_one_per_day = COALESCE(EXCLUDED.max_one_per_day, creator_reminder_config.max_one_per_day),
        updated_at = NOW()
      RETURNING
        id,
        approval_enabled as "approvalEnabled",
        approval_schedule_time::text as "approvalScheduleTime",
        approval_steps as "approvalSteps",
        approval_escalation_enabled as "approvalEscalationEnabled",
        approval_escalation_days as "approvalEscalationDays",
        approval_escalation_slack as "approvalEscalationSlack",
        welcome_call_enabled as "welcomeCallEnabled",
        welcome_call_schedule_time::text as "welcomeCallScheduleTime",
        welcome_call_steps as "welcomeCallSteps",
        welcome_call_event_type_id as "welcomeCallEventTypeId",
        max_one_per_day as "maxOnePerDay",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as CreatorReminderConfig
  })
}

/**
 * Get reminder config with defaults if not set
 */
export async function getReminderConfigOrDefault(
  tenantSlug: string
): Promise<CreatorReminderConfig> {
  const config = await getReminderConfig(tenantSlug)

  if (config) {
    return config
  }

  // Return default config without persisting
  return {
    id: '',
    approvalEnabled: true,
    approvalScheduleTime: '09:00',
    approvalSteps: DEFAULT_APPROVAL_STEPS,
    approvalEscalationEnabled: true,
    approvalEscalationDays: 7,
    approvalEscalationSlack: true,
    welcomeCallEnabled: true,
    welcomeCallScheduleTime: '10:00',
    welcomeCallSteps: DEFAULT_WELCOME_CALL_STEPS,
    maxOnePerDay: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================
// CREATOR REMINDER TRACKING
// ============================================================

/**
 * Get creators needing approval reminders
 */
export async function getCreatorsNeedingApprovalReminders(
  tenantSlug: string,
  config: CreatorReminderConfig
): Promise<
  Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    approvedAt: string
    reminderCount: number
    lastReminderAt?: string
    escalatedAt?: string
  }>
> {
  if (!config.approvalEnabled || config.approvalSteps.length === 0) {
    return []
  }

  return withTenant(tenantSlug, async () => {
    // Find creators who are approved but haven't logged in
    // And haven't been escalated yet
    const result = await sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        approved_at as "approvedAt",
        COALESCE(reminder_count, 0) as "reminderCount",
        last_reminder_at as "lastReminderAt",
        escalated_at as "escalatedAt"
      FROM creators
      WHERE status = 'approved'
        AND approved_at IS NOT NULL
        AND first_login_at IS NULL
        AND escalated_at IS NULL
      ORDER BY approved_at ASC
    `
    return result.rows as Array<{
      id: string
      email: string
      firstName: string
      lastName: string
      approvedAt: string
      reminderCount: number
      lastReminderAt?: string
      escalatedAt?: string
    }>
  })
}

/**
 * Get creators needing welcome call reminders
 */
export async function getCreatorsNeedingWelcomeCallReminders(
  tenantSlug: string,
  config: CreatorReminderConfig
): Promise<
  Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    firstLoginAt: string
    welcomeCallReminderCount: number
    welcomeCallScheduledAt?: string
    welcomeCallDismissed: boolean
  }>
> {
  if (!config.welcomeCallEnabled || config.welcomeCallSteps.length === 0) {
    return []
  }

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        first_login_at as "firstLoginAt",
        COALESCE(welcome_call_reminder_count, 0) as "welcomeCallReminderCount",
        welcome_call_scheduled_at as "welcomeCallScheduledAt",
        COALESCE(welcome_call_dismissed, false) as "welcomeCallDismissed"
      FROM creators
      WHERE status IN ('approved', 'onboarding', 'active')
        AND first_login_at IS NOT NULL
        AND welcome_call_scheduled_at IS NULL
        AND welcome_call_dismissed = false
      ORDER BY first_login_at ASC
    `
    return result.rows as Array<{
      id: string
      email: string
      firstName: string
      lastName: string
      firstLoginAt: string
      welcomeCallReminderCount: number
      welcomeCallScheduledAt?: string
      welcomeCallDismissed: boolean
    }>
  })
}

/**
 * Update creator reminder tracking
 */
export async function updateCreatorReminderTracking(
  tenantSlug: string,
  creatorId: string,
  updates: {
    reminderCount?: number
    lastReminderAt?: Date
    escalatedAt?: Date
    welcomeCallReminderCount?: number
    welcomeCallScheduledAt?: Date
    welcomeCallDismissed?: boolean
    firstLoginAt?: Date
  }
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (updates.reminderCount !== undefined) {
      paramIndex++
      setClauses.push(`reminder_count = $${paramIndex}`)
      values.push(updates.reminderCount)
    }

    if (updates.lastReminderAt !== undefined) {
      paramIndex++
      setClauses.push(`last_reminder_at = $${paramIndex}`)
      values.push(updates.lastReminderAt.toISOString())
    }

    if (updates.escalatedAt !== undefined) {
      paramIndex++
      setClauses.push(`escalated_at = $${paramIndex}`)
      values.push(updates.escalatedAt.toISOString())
    }

    if (updates.welcomeCallReminderCount !== undefined) {
      paramIndex++
      setClauses.push(`welcome_call_reminder_count = $${paramIndex}`)
      values.push(updates.welcomeCallReminderCount)
    }

    if (updates.welcomeCallScheduledAt !== undefined) {
      paramIndex++
      setClauses.push(`welcome_call_scheduled_at = $${paramIndex}`)
      values.push(updates.welcomeCallScheduledAt.toISOString())
    }

    if (updates.welcomeCallDismissed !== undefined) {
      paramIndex++
      setClauses.push(`welcome_call_dismissed = $${paramIndex}`)
      values.push(updates.welcomeCallDismissed)
    }

    if (updates.firstLoginAt !== undefined) {
      paramIndex++
      setClauses.push(`first_login_at = $${paramIndex}`)
      values.push(updates.firstLoginAt.toISOString())
    }

    if (setClauses.length === 1) {
      return false // Nothing to update
    }

    paramIndex++
    values.push(creatorId)

    const result = await sql.query(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
      values
    )
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get the appropriate reminder step for a creator
 */
export function getApplicableReminderStep(
  steps: ReminderStep[],
  daysSinceTrigger: number,
  reminderCount: number,
  maxOnePerDay: boolean,
  lastReminderAt?: string
): ReminderStep | null {
  if (steps.length === 0) {
    return null
  }

  // If max one per day and already sent today, skip
  if (maxOnePerDay && lastReminderAt) {
    const lastReminder = new Date(lastReminderAt)
    const today = new Date()
    if (
      lastReminder.getUTCFullYear() === today.getUTCFullYear() &&
      lastReminder.getUTCMonth() === today.getUTCMonth() &&
      lastReminder.getUTCDate() === today.getUTCDate()
    ) {
      return null
    }
  }

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)

  // Find the step that matches the current reminder count
  // (step index = reminder count, since we increment after sending)
  if (reminderCount >= sortedSteps.length) {
    return null // All steps exhausted
  }

  const step = sortedSteps[reminderCount]

  // Check if enough days have passed for this step
  if (step && daysSinceTrigger >= step.daysAfterTrigger) {
    return step
  }

  return null
}
