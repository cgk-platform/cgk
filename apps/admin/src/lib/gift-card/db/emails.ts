/**
 * Gift Card Emails Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  GiftCardEmail,
  CreateGiftCardEmailInput,
  GiftCardEmailFilters,
} from '../types'

/**
 * Get gift card emails with filters and pagination
 */
export async function getGiftCardEmails(
  filters: GiftCardEmailFilters
): Promise<{ rows: GiftCardEmail[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.status) {
    paramIndex++
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
  }

  if (filters.search) {
    paramIndex++
    conditions.push(`(to_email ILIKE $${paramIndex} OR to_name ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, transaction_id, to_email, to_name, subject, status,
            resend_message_id, scheduled_for, sent_at, failed_at,
            error_message, attempt_count, last_attempt_at, created_at, updated_at
     FROM gift_card_emails
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*)::text as count FROM gift_card_emails ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as GiftCardEmail[],
    totalCount: parseInt(countResult.rows[0]?.count || '0', 10),
  }
}

/**
 * Get an email by ID
 */
export async function getGiftCardEmailById(id: string): Promise<GiftCardEmail | null> {
  const result = await sql<GiftCardEmail>`
    SELECT id, transaction_id, to_email, to_name, subject, status,
           resend_message_id, scheduled_for, sent_at, failed_at,
           error_message, attempt_count, last_attempt_at, created_at, updated_at
    FROM gift_card_emails
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

/**
 * Get emails for a transaction
 */
export async function getEmailsForTransaction(transactionId: string): Promise<GiftCardEmail[]> {
  const result = await sql<GiftCardEmail>`
    SELECT id, transaction_id, to_email, to_name, subject, status,
           resend_message_id, scheduled_for, sent_at, failed_at,
           error_message, attempt_count, last_attempt_at, created_at, updated_at
    FROM gift_card_emails
    WHERE transaction_id = ${transactionId}
    ORDER BY created_at DESC
  `
  return result.rows
}

/**
 * Create a new gift card email
 */
export async function createGiftCardEmail(
  input: CreateGiftCardEmailInput
): Promise<GiftCardEmail> {
  const result = await sql<GiftCardEmail>`
    INSERT INTO gift_card_emails (
      transaction_id, to_email, to_name, subject, scheduled_for
    ) VALUES (
      ${input.transaction_id},
      ${input.to_email},
      ${input.to_name || null},
      ${input.subject},
      ${input.scheduled_for || 'NOW()'}::timestamptz
    )
    RETURNING id, transaction_id, to_email, to_name, subject, status,
              resend_message_id, scheduled_for, sent_at, failed_at,
              error_message, attempt_count, last_attempt_at, created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Mark an email as sent
 */
export async function markEmailSent(
  id: string,
  resendMessageId: string
): Promise<GiftCardEmail | null> {
  const result = await sql<GiftCardEmail>`
    UPDATE gift_card_emails
    SET status = 'sent',
        resend_message_id = ${resendMessageId},
        sent_at = NOW(),
        last_attempt_at = NOW(),
        attempt_count = attempt_count + 1,
        error_message = NULL,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, transaction_id, to_email, to_name, subject, status,
              resend_message_id, scheduled_for, sent_at, failed_at,
              error_message, attempt_count, last_attempt_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Mark an email as failed
 */
export async function markEmailFailed(
  id: string,
  errorMessage: string
): Promise<GiftCardEmail | null> {
  const result = await sql<GiftCardEmail>`
    UPDATE gift_card_emails
    SET status = 'failed',
        failed_at = NOW(),
        last_attempt_at = NOW(),
        attempt_count = attempt_count + 1,
        error_message = ${errorMessage},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, transaction_id, to_email, to_name, subject, status,
              resend_message_id, scheduled_for, sent_at, failed_at,
              error_message, attempt_count, last_attempt_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Reset a failed email to pending for retry
 */
export async function resetEmailToPending(id: string): Promise<GiftCardEmail | null> {
  const result = await sql<GiftCardEmail>`
    UPDATE gift_card_emails
    SET status = 'pending',
        error_message = NULL,
        scheduled_for = NOW(),
        updated_at = NOW()
    WHERE id = ${id} AND status = 'failed'
    RETURNING id, transaction_id, to_email, to_name, subject, status,
              resend_message_id, scheduled_for, sent_at, failed_at,
              error_message, attempt_count, last_attempt_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Skip an email
 */
export async function skipEmail(id: string): Promise<GiftCardEmail | null> {
  const result = await sql<GiftCardEmail>`
    UPDATE gift_card_emails
    SET status = 'skipped',
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, transaction_id, to_email, to_name, subject, status,
              resend_message_id, scheduled_for, sent_at, failed_at,
              error_message, attempt_count, last_attempt_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Get pending emails ready to send
 */
export async function getPendingEmailsToSend(limit = 50): Promise<GiftCardEmail[]> {
  const result = await sql<GiftCardEmail>`
    SELECT id, transaction_id, to_email, to_name, subject, status,
           resend_message_id, scheduled_for, sent_at, failed_at,
           error_message, attempt_count, last_attempt_at, created_at, updated_at
    FROM gift_card_emails
    WHERE status = 'pending' AND scheduled_for <= NOW()
    ORDER BY scheduled_for ASC
    LIMIT ${limit}
  `
  return result.rows
}

/**
 * Count pending emails
 */
export async function countPendingEmails(): Promise<number> {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*)::text as count FROM gift_card_emails WHERE status = 'pending'
  `
  return parseInt(result.rows[0]?.count || '0', 10)
}

/**
 * Get email statistics
 */
export async function getEmailStats(): Promise<{
  total_count: number
  pending_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
}> {
  const result = await sql<{
    total_count: string
    pending_count: string
    sent_count: string
    failed_count: string
    skipped_count: string
  }>`
    SELECT
      COUNT(*)::text as total_count,
      COUNT(*) FILTER (WHERE status = 'pending')::text as pending_count,
      COUNT(*) FILTER (WHERE status = 'sent')::text as sent_count,
      COUNT(*) FILTER (WHERE status = 'failed')::text as failed_count,
      COUNT(*) FILTER (WHERE status = 'skipped')::text as skipped_count
    FROM gift_card_emails
  `

  const row = result.rows[0]
  return {
    total_count: parseInt(row?.total_count || '0', 10),
    pending_count: parseInt(row?.pending_count || '0', 10),
    sent_count: parseInt(row?.sent_count || '0', 10),
    failed_count: parseInt(row?.failed_count || '0', 10),
    skipped_count: parseInt(row?.skipped_count || '0', 10),
  }
}
