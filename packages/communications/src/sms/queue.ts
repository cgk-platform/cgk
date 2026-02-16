/**
 * SMS Queue Operations
 *
 * Queue management for SMS notifications with atomic claim pattern.
 * Follows the same patterns as email queue for consistency.
 *
 * @ai-pattern atomic-claim
 * @ai-critical Uses FOR UPDATE SKIP LOCKED to prevent race conditions
 */

import { sql, withTenant } from '@cgk-platform/db'

import { calculateSegmentCount } from './compliance.js'
import type {
  CreateSmsQueueEntryInput,
  SmsQueueEntry,
  SmsQueueFilters,
  SmsQueueStats,
} from './types.js'

// ============================================================================
// Queue Entry Operations
// ============================================================================

/**
 * Create an SMS queue entry
 */
export async function createSmsQueueEntry(
  input: CreateSmsQueueEntryInput
): Promise<SmsQueueEntry> {
  const { characterCount, segmentCount } = calculateSegmentCount(input.content)

  const result = await withTenant(input.tenantId, async () => {
    return sql`
      INSERT INTO sms_queue (
        tenant_id,
        phone_number,
        recipient_type,
        recipient_id,
        recipient_name,
        notification_type,
        content,
        character_count,
        segment_count,
        status,
        scheduled_at,
        max_attempts
      ) VALUES (
        ${input.tenantId},
        ${input.phoneNumber},
        ${input.recipientType},
        ${input.recipientId || null},
        ${input.recipientName || null},
        ${input.notificationType},
        ${input.content},
        ${characterCount},
        ${segmentCount},
        'pending',
        ${input.scheduledAt ? input.scheduledAt.toISOString() : null},
        ${input.maxAttempts || 3}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        recipient_type as "recipientType",
        recipient_id as "recipientId",
        recipient_name as "recipientName",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        status,
        scheduled_at as "scheduledAt",
        trigger_run_id as "triggerRunId",
        attempts,
        max_attempts as "maxAttempts",
        last_attempt_at as "lastAttemptAt",
        sent_at as "sentAt",
        delivered_at as "deliveredAt",
        twilio_message_sid as "twilioMessageSid",
        skip_reason as "skipReason",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create SMS queue entry')
  }
  return row as SmsQueueEntry
}

/**
 * Schedule a pending entry for sending
 */
export async function scheduleEntry(
  tenantId: string,
  entryId: string,
  scheduledAt?: Date
): Promise<void> {
  await withTenant(tenantId, async () => {
    const scheduleTime = (scheduledAt || new Date()).toISOString()
    return sql`
      UPDATE sms_queue
      SET
        status = 'scheduled',
        scheduled_at = ${scheduleTime},
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
        AND status = 'pending'
    `
  })
}

/**
 * Atomically claim scheduled entries for processing
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions
 */
export async function claimScheduledSmsEntries(
  tenantId: string,
  runId: string,
  limit: number = 50
): Promise<SmsQueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      WITH to_claim AS (
        SELECT id FROM sms_queue
        WHERE tenant_id = ${tenantId}
          AND status = 'scheduled'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE sms_queue q
      SET
        status = 'processing',
        trigger_run_id = ${runId},
        updated_at = NOW()
      FROM to_claim
      WHERE q.id = to_claim.id
      RETURNING
        q.id,
        q.tenant_id as "tenantId",
        q.phone_number as "phoneNumber",
        q.recipient_type as "recipientType",
        q.recipient_id as "recipientId",
        q.recipient_name as "recipientName",
        q.notification_type as "notificationType",
        q.content,
        q.character_count as "characterCount",
        q.segment_count as "segmentCount",
        q.status,
        q.scheduled_at as "scheduledAt",
        q.trigger_run_id as "triggerRunId",
        q.attempts,
        q.max_attempts as "maxAttempts",
        q.last_attempt_at as "lastAttemptAt",
        q.sent_at as "sentAt",
        q.delivered_at as "deliveredAt",
        q.twilio_message_sid as "twilioMessageSid",
        q.skip_reason as "skipReason",
        q.error_message as "errorMessage",
        q.created_at as "createdAt",
        q.updated_at as "updatedAt"
    `
  })

  return result.rows as SmsQueueEntry[]
}

/**
 * Mark entry as sent
 */
export async function markSmsSent(
  tenantId: string,
  entryId: string,
  twilioMessageSid: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'sent',
        sent_at = NOW(),
        twilio_message_sid = ${twilioMessageSid},
        trigger_run_id = NULL,
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Mark entry as delivered (from Twilio webhook)
 */
export async function markSmsDelivered(
  tenantId: string,
  twilioMessageSid: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'delivered',
        delivered_at = NOW(),
        updated_at = NOW()
      WHERE twilio_message_sid = ${twilioMessageSid}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Mark entry as failed
 */
export async function markSmsFailed(
  tenantId: string,
  entryId: string,
  errorMessage: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'failed',
        attempts = attempts + 1,
        last_attempt_at = NOW(),
        error_message = ${errorMessage},
        trigger_run_id = NULL,
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Mark entry as skipped
 */
export async function markSmsSkipped(
  tenantId: string,
  entryId: string,
  skipReason: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'skipped',
        skip_reason = ${skipReason},
        trigger_run_id = NULL,
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
    `
  })
}

/**
 * Reset stale processing entries
 */
export async function resetStaleSmSProcessingEntries(
  tenantId: string,
  staleMinutes: number = 10
): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_queue
      SET
        status = 'scheduled',
        trigger_run_id = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND status = 'processing'
        AND updated_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
    `
  })

  return result.rowCount ?? 0
}

/**
 * Get entry by ID
 */
export async function getSmsQueueEntry(
  tenantId: string,
  entryId: string
): Promise<SmsQueueEntry | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        recipient_type as "recipientType",
        recipient_id as "recipientId",
        recipient_name as "recipientName",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        status,
        scheduled_at as "scheduledAt",
        trigger_run_id as "triggerRunId",
        attempts,
        max_attempts as "maxAttempts",
        last_attempt_at as "lastAttemptAt",
        sent_at as "sentAt",
        delivered_at as "deliveredAt",
        twilio_message_sid as "twilioMessageSid",
        skip_reason as "skipReason",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_queue
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
    `
  })

  return (result.rows[0] as SmsQueueEntry) || null
}

/**
 * Get entry by Twilio message SID
 */
export async function getSmsQueueEntryByMessageSid(
  tenantId: string,
  twilioMessageSid: string
): Promise<SmsQueueEntry | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        recipient_type as "recipientType",
        recipient_id as "recipientId",
        recipient_name as "recipientName",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        status,
        scheduled_at as "scheduledAt",
        trigger_run_id as "triggerRunId",
        attempts,
        max_attempts as "maxAttempts",
        last_attempt_at as "lastAttemptAt",
        sent_at as "sentAt",
        delivered_at as "deliveredAt",
        twilio_message_sid as "twilioMessageSid",
        skip_reason as "skipReason",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_queue
      WHERE twilio_message_sid = ${twilioMessageSid}
        AND tenant_id = ${tenantId}
    `
  })

  return (result.rows[0] as SmsQueueEntry) || null
}

/**
 * List queue entries with filters
 */
export async function listSmsQueueEntries(
  tenantId: string,
  filters?: SmsQueueFilters
): Promise<{ entries: SmsQueueEntry[]; total: number }> {
  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0

  // Build dynamic WHERE conditions
  const conditions: string[] = [`tenant_id = '${tenantId}'`]

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    conditions.push(`status IN (${statuses.map((s) => `'${s}'`).join(',')})`)
  }

  if (filters?.recipientType) {
    conditions.push(`recipient_type = '${filters.recipientType}'`)
  }

  if (filters?.notificationType) {
    conditions.push(`notification_type = '${filters.notificationType}'`)
  }

  if (filters?.phoneNumber) {
    conditions.push(`phone_number = '${filters.phoneNumber}'`)
  }

  // Note: Using raw SQL here since dynamic WHERE clauses are complex with template literals
  // In production, use a query builder or proper parameterization
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        recipient_type as "recipientType",
        recipient_id as "recipientId",
        recipient_name as "recipientName",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        status,
        scheduled_at as "scheduledAt",
        trigger_run_id as "triggerRunId",
        attempts,
        max_attempts as "maxAttempts",
        last_attempt_at as "lastAttemptAt",
        sent_at as "sentAt",
        delivered_at as "deliveredAt",
        twilio_message_sid as "twilioMessageSid",
        skip_reason as "skipReason",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_queue
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantId, async () => {
    return sql`
      SELECT COUNT(*) as count FROM sms_queue
      WHERE tenant_id = ${tenantId}
    `
  })

  return {
    entries: result.rows as SmsQueueEntry[],
    total: parseInt((countResult.rows[0] as { count: string }).count, 10),
  }
}

// ============================================================================
// Queue Statistics
// ============================================================================

/**
 * Get SMS queue statistics
 */
export async function getSmsQueueStats(tenantId: string): Promise<SmsQueueStats> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours') as sent_today,
        COUNT(*) FILTER (WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '24 hours') as failed_today
      FROM sms_queue
      WHERE tenant_id = ${tenantId}
    `
  })

  const row = result.rows[0] as Record<string, string> | undefined

  return {
    pending: parseInt(row?.pending ?? '0', 10),
    scheduled: parseInt(row?.scheduled ?? '0', 10),
    processing: parseInt(row?.processing ?? '0', 10),
    sent: parseInt(row?.sent ?? '0', 10),
    delivered: parseInt(row?.delivered ?? '0', 10),
    failed: parseInt(row?.failed ?? '0', 10),
    skipped: parseInt(row?.skipped ?? '0', 10),
    total: parseInt(row?.total ?? '0', 10),
    sentToday: parseInt(row?.sent_today ?? '0', 10),
    failedToday: parseInt(row?.failed_today ?? '0', 10),
  }
}

/**
 * Get daily SMS count for rate limiting
 */
export async function getDailySmsCount(tenantId: string): Promise<number> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT COUNT(*) as count
      FROM sms_queue
      WHERE tenant_id = ${tenantId}
        AND status IN ('sent', 'delivered')
        AND sent_at > NOW() - INTERVAL '24 hours'
    `
  })

  return parseInt((result.rows[0] as { count: string }).count, 10)
}

/**
 * Check if daily limit is exceeded
 */
export async function isDailyLimitExceeded(
  tenantId: string,
  dailyLimit: number
): Promise<boolean> {
  const count = await getDailySmsCount(tenantId)
  return count >= dailyLimit
}

// ============================================================================
// Retry Operations
// ============================================================================

/**
 * Get retryable failed entries
 */
export async function getRetryableSmsEntries(
  tenantId: string,
  limit: number = 20
): Promise<SmsQueueEntry[]> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        phone_number as "phoneNumber",
        recipient_type as "recipientType",
        recipient_id as "recipientId",
        recipient_name as "recipientName",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        status,
        scheduled_at as "scheduledAt",
        trigger_run_id as "triggerRunId",
        attempts,
        max_attempts as "maxAttempts",
        last_attempt_at as "lastAttemptAt",
        sent_at as "sentAt",
        delivered_at as "deliveredAt",
        twilio_message_sid as "twilioMessageSid",
        skip_reason as "skipReason",
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_queue
      WHERE tenant_id = ${tenantId}
        AND status = 'failed'
        AND attempts < max_attempts
      ORDER BY last_attempt_at ASC
      LIMIT ${limit}
    `
  })

  return result.rows as SmsQueueEntry[]
}

/**
 * Schedule retry for a failed entry with exponential backoff
 */
export async function scheduleRetry(
  tenantId: string,
  entryId: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    // Calculate backoff: 1min, 2min, 4min, 8min, 16min...
    return sql`
      UPDATE sms_queue
      SET
        status = 'scheduled',
        scheduled_at = NOW() + (POWER(2, attempts - 1) * INTERVAL '1 minute'),
        updated_at = NOW()
      WHERE id = ${entryId}
        AND tenant_id = ${tenantId}
        AND status = 'failed'
        AND attempts < max_attempts
    `
  })
}
