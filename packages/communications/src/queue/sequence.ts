/**
 * Multi-sequence email queue operations
 *
 * @ai-pattern email-sequence
 * @ai-note Handles follow-up emails and duplicate prevention
 */

import { sql, withTenant } from '@cgk/db'

import type { QueueEntry, QueueType, ReviewQueueEntry } from './types.js'

/**
 * Create a follow-up entry with duplicate prevention.
 * Uses ON CONFLICT DO NOTHING to handle race conditions.
 *
 * @ai-pattern duplicate-prevention
 * @ai-critical Uses unique constraint on (tenant_id, order_id, sequence_number)
 */
export async function createFollowUpEntry(
  tenantId: string,
  queueType: QueueType,
  orderId: string,
  sequenceNumber: number,
  scheduledAt: Date,
  metadata: Record<string, unknown> = {},
  sequenceId?: string
): Promise<QueueEntry | null> {
  const scheduledAtStr = scheduledAt.toISOString()
  const metadataStr = JSON.stringify(metadata)
  const seqId = sequenceId || null

  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          INSERT INTO review_email_queue (tenant_id, order_id, sequence_number, status, scheduled_at, sequence_id, metadata)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb)
          ON CONFLICT (tenant_id, order_id, sequence_number) DO NOTHING
          RETURNING *
        `
      case 'creator':
        return sql`
          INSERT INTO creator_email_queue (tenant_id, creator_id, sequence_number, status, scheduled_at, sequence_id, metadata, communication_type)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb, 'reminder')
          ON CONFLICT (tenant_id, creator_id, sequence_number) DO NOTHING
          RETURNING *
        `
      case 'subscription':
        return sql`
          INSERT INTO subscription_email_queue (tenant_id, subscription_id, sequence_number, status, scheduled_at, sequence_id, metadata, communication_type, customer_id, customer_email, subscription_status)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb, 'reminder', '', '', '')
          ON CONFLICT (tenant_id, subscription_id, sequence_number) DO NOTHING
          RETURNING *
        `
      case 'esign':
        return sql`
          INSERT INTO esign_email_queue (tenant_id, document_id, sequence_number, status, scheduled_at, sequence_id, metadata, communication_type, recipient_email, document_title)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb, 'reminder', '', '')
          ON CONFLICT (tenant_id, document_id, sequence_number) DO NOTHING
          RETURNING *
        `
      case 'treasury':
        return sql`
          INSERT INTO treasury_email_queue (tenant_id, request_id, sequence_number, status, scheduled_at, sequence_id, metadata, communication_type, requester_id, requester_email, approver_email, request_amount)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb, 'reminder', '', '', '', 0)
          ON CONFLICT (tenant_id, request_id, sequence_number) DO NOTHING
          RETURNING *
        `
      case 'team_invitation':
        return sql`
          INSERT INTO team_invitation_queue (tenant_id, invitation_id, sequence_number, status, scheduled_at, sequence_id, metadata, communication_type, invitee_email, inviter_id, invited_role)
          VALUES (${tenantId}, ${orderId}, ${sequenceNumber}, 'scheduled', ${scheduledAtStr}::timestamptz, ${seqId}, ${metadataStr}::jsonb, 'reminder', '', '', '')
          ON CONFLICT (tenant_id, invitation_id, sequence_number) DO NOTHING
          RETURNING *
        `
    }
  })

  return (result.rows[0] as QueueEntry) || null
}

/**
 * Create a review email follow-up with full context
 */
export async function createReviewFollowUp(
  tenantId: string,
  previousEntry: ReviewQueueEntry,
  scheduledAt: Date,
  templateType: string
): Promise<ReviewQueueEntry | null> {
  const newSequenceNumber = previousEntry.sequenceNumber + 1
  const scheduledAtStr = scheduledAt.toISOString()
  const fulfilledAtStr = previousEntry.fulfilledAt?.toISOString() || null
  const deliveredAtStr = previousEntry.deliveredAt?.toISOString() || null
  const metadataStr = JSON.stringify(previousEntry.metadata || {})

  const result = await withTenant(tenantId, async () => {
    return sql`
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
        ${tenantId}, ${previousEntry.orderId}, ${previousEntry.orderNumber},
        ${previousEntry.customerEmail}, ${previousEntry.customerName}, ${previousEntry.productTitle},
        ${fulfilledAtStr}::timestamptz, ${deliveredAtStr}::timestamptz, ${previousEntry.trackingNumber},
        'scheduled', 'immediate', ${scheduledAtStr}::timestamptz,
        ${previousEntry.delayDays}, ${newSequenceNumber}, ${previousEntry.sequenceId},
        ${templateType}, ${previousEntry.incentiveOffered}, ${previousEntry.forceIncentive},
        ${previousEntry.incentiveCode}, ${metadataStr}::jsonb, ${previousEntry.maxAttempts}
      )
      ON CONFLICT (tenant_id, order_id, sequence_number) DO NOTHING
      RETURNING *
    `
  })

  return (result.rows[0] as ReviewQueueEntry) || null
}

/**
 * Skip all pending/scheduled entries for an order.
 */
export async function skipPendingEntriesForOrder(
  tenantId: string,
  queueType: QueueType,
  orderId: string,
  reason: string
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND order_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND creator_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND subscription_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND document_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND request_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND invitation_id = ${orderId}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
    }
  })

  return result.rowCount ?? 0
}

/**
 * Skip all pending entries for an email address.
 */
export async function skipPendingEntriesForEmail(
  tenantId: string,
  queueType: QueueType,
  email: string,
  reason: string
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`
          UPDATE review_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND customer_email = ${email}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'creator':
        return sql`
          UPDATE creator_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND creator_email = ${email}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'subscription':
        return sql`
          UPDATE subscription_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND customer_email = ${email}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'esign':
        return sql`
          UPDATE esign_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND recipient_email = ${email}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'treasury':
        return sql`
          UPDATE treasury_email_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND (requester_email = ${email} OR approver_email = ${email})
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
      case 'team_invitation':
        return sql`
          UPDATE team_invitation_queue
          SET status = 'skipped', skip_reason = ${reason}, skipped_at = NOW(), updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND invitee_email = ${email}
            AND status IN ('pending', 'awaiting_delivery', 'scheduled')
        `
    }
  })

  return result.rowCount ?? 0
}

/**
 * Get all entries in a sequence
 */
export async function getSequenceEntries<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  sequenceId: string
): Promise<T[]> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND sequence_id = ${sequenceId} ORDER BY sequence_number ASC`
    }
  })

  return result.rows as T[]
}

/**
 * Get entries for an order
 */
export async function getEntriesForOrder<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  orderId: string
): Promise<T[]> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE tenant_id = ${tenantId} AND order_id = ${orderId} ORDER BY sequence_number ASC`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE tenant_id = ${tenantId} AND creator_id = ${orderId} ORDER BY sequence_number ASC`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND subscription_id = ${orderId} ORDER BY sequence_number ASC`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE tenant_id = ${tenantId} AND document_id = ${orderId} ORDER BY sequence_number ASC`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND request_id = ${orderId} ORDER BY sequence_number ASC`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND invitation_id = ${orderId} ORDER BY sequence_number ASC`
    }
  })

  return result.rows as T[]
}

/**
 * Get the latest entry for an order
 */
export async function getLatestEntryForOrder<T extends QueueEntry>(
  tenantId: string,
  queueType: QueueType,
  orderId: string
): Promise<T | null> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT * FROM review_email_queue WHERE tenant_id = ${tenantId} AND order_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
      case 'creator':
        return sql`SELECT * FROM creator_email_queue WHERE tenant_id = ${tenantId} AND creator_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
      case 'subscription':
        return sql`SELECT * FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND subscription_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
      case 'esign':
        return sql`SELECT * FROM esign_email_queue WHERE tenant_id = ${tenantId} AND document_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
      case 'treasury':
        return sql`SELECT * FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND request_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
      case 'team_invitation':
        return sql`SELECT * FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND invitation_id = ${orderId} ORDER BY sequence_number DESC LIMIT 1`
    }
  })

  return (result.rows[0] as T) || null
}

/**
 * Check if an order has any sent entries
 */
export async function hasAnyEntrySent(
  tenantId: string,
  queueType: QueueType,
  orderId: string
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT 1 FROM review_email_queue WHERE tenant_id = ${tenantId} AND order_id = ${orderId} AND status = 'sent' LIMIT 1`
      case 'creator':
        return sql`SELECT 1 FROM creator_email_queue WHERE tenant_id = ${tenantId} AND creator_id = ${orderId} AND status = 'sent' LIMIT 1`
      case 'subscription':
        return sql`SELECT 1 FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND subscription_id = ${orderId} AND status = 'sent' LIMIT 1`
      case 'esign':
        return sql`SELECT 1 FROM esign_email_queue WHERE tenant_id = ${tenantId} AND document_id = ${orderId} AND status = 'sent' LIMIT 1`
      case 'treasury':
        return sql`SELECT 1 FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND request_id = ${orderId} AND status = 'sent' LIMIT 1`
      case 'team_invitation':
        return sql`SELECT 1 FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND invitation_id = ${orderId} AND status = 'sent' LIMIT 1`
    }
  })

  return result.rows.length > 0
}

/**
 * Get count of sent entries for an order
 */
export async function getSentCountForOrder(
  tenantId: string,
  queueType: QueueType,
  orderId: string
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    switch (queueType) {
      case 'review':
        return sql`SELECT COUNT(*) as count FROM review_email_queue WHERE tenant_id = ${tenantId} AND order_id = ${orderId} AND status = 'sent'`
      case 'creator':
        return sql`SELECT COUNT(*) as count FROM creator_email_queue WHERE tenant_id = ${tenantId} AND creator_id = ${orderId} AND status = 'sent'`
      case 'subscription':
        return sql`SELECT COUNT(*) as count FROM subscription_email_queue WHERE tenant_id = ${tenantId} AND subscription_id = ${orderId} AND status = 'sent'`
      case 'esign':
        return sql`SELECT COUNT(*) as count FROM esign_email_queue WHERE tenant_id = ${tenantId} AND document_id = ${orderId} AND status = 'sent'`
      case 'treasury':
        return sql`SELECT COUNT(*) as count FROM treasury_email_queue WHERE tenant_id = ${tenantId} AND request_id = ${orderId} AND status = 'sent'`
      case 'team_invitation':
        return sql`SELECT COUNT(*) as count FROM team_invitation_queue WHERE tenant_id = ${tenantId} AND invitation_id = ${orderId} AND status = 'sent'`
    }
  })

  return Number(result.rows[0]?.count) || 0
}

/**
 * Generate a new sequence ID
 */
export function generateSequenceId(): string {
  return crypto.randomUUID()
}
