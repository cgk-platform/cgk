/**
 * Review-specific email queue operations
 *
 * @ai-pattern review-emails
 * @ai-note Handles review request and reminder email sequences
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { CreateQueueEntryInput, ReviewQueueEntry, TriggerEvent } from './types.js'
import { generateSequenceId } from './sequence.js'

/**
 * Create a new review email queue entry
 *
 * @ai-pattern queue-entry-creation
 * @ai-note Uses ON CONFLICT to handle duplicate orders
 *
 * @param input - Entry data
 */
export async function createReviewQueueEntry(
  input: CreateQueueEntryInput
): Promise<ReviewQueueEntry | null> {
  const sequenceId = input.sequenceId || generateSequenceId()
  const triggerEvent: TriggerEvent = input.triggerEvent || 'fulfilled'
  const sequenceNumber = input.sequenceNumber || 1

  // Calculate scheduled_at based on trigger event
  let status: 'pending' | 'awaiting_delivery' | 'scheduled' = 'pending'
  let scheduledAt: Date | null = null

  if (triggerEvent === 'immediate') {
    status = 'scheduled'
    scheduledAt = new Date()
  } else if (triggerEvent === 'delivered') {
    status = 'awaiting_delivery'
  } else if (triggerEvent === 'fulfilled' && input.fulfilledAt) {
    status = 'scheduled'
    const delayMs = (input.delayDays || 3) * 24 * 60 * 60 * 1000
    scheduledAt = new Date(input.fulfilledAt.getTime() + delayMs)
  }

  // Convert Date objects to ISO strings for SQL
  const fulfilledAtStr = input.fulfilledAt?.toISOString() || null
  const deliveredAtStr = input.deliveredAt?.toISOString() || null
  const scheduledAtStr = scheduledAt?.toISOString() || null

  const result = await withTenant(input.tenantId, async () => {
    const res = await sql`
      INSERT INTO review_email_queue (
        tenant_id, order_id, order_number,
        customer_email, customer_name, product_title,
        fulfilled_at, delivered_at, tracking_number,
        status, trigger_event, scheduled_at,
        delay_days, sequence_number, sequence_id,
        template_type, incentive_offered, force_incentive,
        incentive_code, metadata, max_attempts
      )
      VALUES (
        ${input.tenantId}, ${input.orderId}, ${input.orderNumber || null},
        ${input.customerEmail}, ${input.customerName || null}, ${input.productTitle || null},
        ${fulfilledAtStr}::timestamptz, ${deliveredAtStr}::timestamptz, ${input.trackingNumber || null},
        ${status}, ${triggerEvent}, ${scheduledAtStr}::timestamptz,
        ${input.delayDays || 3}, ${sequenceNumber}, ${sequenceId},
        ${input.templateType || 'reviewRequest'}, ${input.incentiveOffered || false}, ${input.forceIncentive || false},
        ${input.incentiveCode || null}, ${JSON.stringify(input.metadata || {})}, ${input.maxAttempts || 5}
      )
      ON CONFLICT (tenant_id, order_id, sequence_number) DO NOTHING
      RETURNING *
    `
    return res
  })

  return (result.rows[0] as ReviewQueueEntry) || null
}

/**
 * Update entry when order is fulfilled
 *
 * @param tenantId - Tenant owning the entry
 * @param orderId - Order ID
 * @param fulfilledAt - Fulfillment timestamp
 * @param trackingNumber - Optional tracking number
 */
export async function onOrderFulfilled(
  tenantId: string,
  orderId: string,
  fulfilledAt: Date,
  trackingNumber?: string
): Promise<void> {
  const fulfilledAtStr = fulfilledAt.toISOString()

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE review_email_queue
      SET
        fulfilled_at = ${fulfilledAtStr}::timestamptz,
        tracking_number = ${trackingNumber || null},
        status = CASE
          WHEN trigger_event = 'fulfilled' AND status = 'pending'
            THEN 'scheduled'
          WHEN trigger_event = 'delivered' AND status = 'pending'
            THEN 'awaiting_delivery'
          ELSE status
        END,
        scheduled_at = CASE
          WHEN trigger_event = 'fulfilled' AND status = 'pending'
            THEN ${fulfilledAtStr}::timestamptz + (delay_days * INTERVAL '1 day')
          ELSE scheduled_at
        END,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND order_id = ${orderId}
        AND status = 'pending'
    `
  })
}

/**
 * Update entry when order is delivered
 *
 * @param tenantId - Tenant owning the entry
 * @param orderId - Order ID
 * @param deliveredAt - Delivery timestamp
 */
export async function onOrderDelivered(
  tenantId: string,
  orderId: string,
  deliveredAt: Date
): Promise<void> {
  const deliveredAtStr = deliveredAt.toISOString()

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE review_email_queue
      SET
        delivered_at = ${deliveredAtStr}::timestamptz,
        status = CASE
          WHEN trigger_event = 'delivered' AND status = 'awaiting_delivery'
            THEN 'scheduled'
          ELSE status
        END,
        scheduled_at = CASE
          WHEN trigger_event = 'delivered' AND status = 'awaiting_delivery'
            THEN ${deliveredAtStr}::timestamptz + (delay_days * INTERVAL '1 day')
          ELSE scheduled_at
        END,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND order_id = ${orderId}
        AND status IN ('pending', 'awaiting_delivery')
    `
  })
}

/**
 * Get entries waiting for delivery confirmation
 *
 * @param tenantId - Tenant to check
 * @param limit - Maximum entries (default 100)
 */
export async function getEntriesAwaitingDelivery(
  tenantId: string,
  limit: number = 100
): Promise<ReviewQueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT * FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'awaiting_delivery'
      ORDER BY fulfilled_at ASC
      LIMIT ${limit}
    `
    return res
  })

  return result.rows as ReviewQueueEntry[]
}

/**
 * Get entries ready to schedule (fulfilled, past delay period)
 *
 * @param tenantId - Tenant to check
 */
export async function getPendingEntriesReadyToSchedule(
  tenantId: string
): Promise<ReviewQueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT * FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'pending'
        AND trigger_event = 'fulfilled'
        AND fulfilled_at IS NOT NULL
        AND fulfilled_at + (delay_days * INTERVAL '1 day') <= NOW()
      ORDER BY fulfilled_at ASC
    `
    return res
  })

  return result.rows as ReviewQueueEntry[]
}

/**
 * Update incentive info for an entry
 *
 * @param tenantId - Tenant owning the entry
 * @param entryId - Entry to update
 * @param incentiveCode - Discount code
 * @param incentiveOffered - Whether incentive is offered
 */
export async function updateIncentiveInfo(
  tenantId: string,
  entryId: string,
  incentiveCode: string,
  incentiveOffered: boolean = true
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE review_email_queue
      SET
        incentive_code = ${incentiveCode},
        incentive_offered = ${incentiveOffered},
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Get review queue statistics by template type
 *
 * @param tenantId - Tenant to check
 */
export async function getReviewStatsbyTemplate(
  tenantId: string
): Promise<Array<{ templateType: string; total: number; sent: number; pending: number }>> {
  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT
        COALESCE(template_type, 'reviewRequest') as template_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status IN ('pending', 'awaiting_delivery', 'scheduled')) as pending
      FROM review_email_queue
      WHERE tenant_id = ${tenantId}
      GROUP BY template_type
      ORDER BY total DESC
    `
    return res
  })

  return result.rows.map((row) => ({
    templateType: String(row.template_type),
    total: Number(row.total) || 0,
    sent: Number(row.sent) || 0,
    pending: Number(row.pending) || 0,
  }))
}

/**
 * Get entries for a specific customer email
 *
 * @param tenantId - Tenant to check
 * @param email - Customer email
 * @param limit - Maximum entries (default 50)
 */
export async function getEntriesForCustomer(
  tenantId: string,
  email: string,
  limit: number = 50
): Promise<ReviewQueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT * FROM review_email_queue
      WHERE tenant_id = ${tenantId}
        AND customer_email = ${email}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return res
  })

  return result.rows as ReviewQueueEntry[]
}

/**
 * Reschedule an entry to a new time
 *
 * @param tenantId - Tenant owning the entry
 * @param entryId - Entry to reschedule
 * @param scheduledAt - New scheduled time
 */
export async function rescheduleEntry(
  tenantId: string,
  entryId: string,
  scheduledAt: Date
): Promise<boolean> {
  const scheduledAtStr = scheduledAt.toISOString()

  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      UPDATE review_email_queue
      SET
        scheduled_at = ${scheduledAtStr}::timestamptz,
        status = 'scheduled',
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
        AND status IN ('pending', 'awaiting_delivery', 'scheduled', 'failed')
      RETURNING id
    `
    return res
  })

  return result.rows.length > 0
}

/**
 * Check if a review has been submitted for an order
 * (Stub - should be implemented with actual review check)
 *
 * @param tenantId - Tenant to check
 * @param orderId - Order ID
 */
export async function hasReviewBeenSubmitted(
  tenantId: string,
  orderId: string
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT 1 FROM reviews
      WHERE tenant_id = ${tenantId}
        AND order_id = ${orderId}
      LIMIT 1
    `
    return res
  })

  return result.rows.length > 0
}
