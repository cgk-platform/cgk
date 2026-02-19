/**
 * Email Queue Database Helpers
 *
 * Direct DB queries for each email queue type.
 * Used by admin UI pages for server-side data fetching.
 */

import { sql, withTenant } from '@cgk-platform/db'
import { getQueueStats } from '@cgk-platform/communications'
import type { QueueStats, QueueStatus } from '@cgk-platform/communications'

export type { QueueStats, QueueStatus }

export interface EmailQueueRow {
  id: string
  status: QueueStatus
  tenant_id: string
  template_type: string | null
  scheduled_at: string | null
  sent_at: string | null
  attempts: number
  max_attempts: number
  error_message: string | null
  created_at: string
  updated_at: string
  // Recipient fields (vary by queue type)
  customer_email?: string
  customer_name?: string
  recipient_email?: string
  recipient_name?: string
  requester_email?: string
  requester_name?: string
  approver_email?: string
  order_id?: string
  order_number?: string
  document_id?: string
  document_title?: string
  subscription_id?: string
  request_id?: string
  request_amount?: number
}

export interface QueuePageStats {
  pending: number
  sentToday: number
  failed: number
  scheduled: number
  total: number
}

export type EmailQueueType = 'review' | 'subscription' | 'esign' | 'treasury'

const TABLE_MAP: Record<EmailQueueType, string> = {
  review: 'review_email_queue',
  subscription: 'subscription_email_queue',
  esign: 'esign_email_queue',
  treasury: 'treasury_email_queue',
}

export async function getEmailQueueStats(
  tenantSlug: string,
  queueType: EmailQueueType,
): Promise<QueuePageStats> {
  try {
    const stats: QueueStats = await getQueueStats(tenantSlug, queueType)
    return {
      pending: stats.pending,
      sentToday: stats.sentToday,
      failed: stats.failed,
      scheduled: stats.scheduled,
      total: stats.total,
    }
  } catch {
    return { pending: 0, sentToday: 0, failed: 0, scheduled: 0, total: 0 }
  }
}

export async function getEmailQueueEntries(
  tenantSlug: string,
  queueType: EmailQueueType,
  options: {
    status?: QueueStatus
    page: number
    limit: number
  },
): Promise<{ rows: EmailQueueRow[]; totalCount: number }> {
  const { status, page, limit } = options
  const offset = (page - 1) * limit
  const table = TABLE_MAP[queueType]

  return withTenant(tenantSlug, async () => {
    if (status) {
      const [dataResult, countResult] = await Promise.all([
        sql.query(
          `SELECT * FROM ${table} WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
          [tenantSlug, status, limit, offset],
        ),
        sql.query(
          `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = $1 AND status = $2`,
          [tenantSlug, status],
        ),
      ])
      return {
        rows: dataResult.rows as EmailQueueRow[],
        totalCount: Number(countResult.rows[0]?.total) || 0,
      }
    } else {
      const [dataResult, countResult] = await Promise.all([
        sql.query(
          `SELECT * FROM ${table} WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [tenantSlug, limit, offset],
        ),
        sql.query(
          `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = $1`,
          [tenantSlug],
        ),
      ])
      return {
        rows: dataResult.rows as EmailQueueRow[],
        totalCount: Number(countResult.rows[0]?.total) || 0,
      }
    }
  })
}

/**
 * Map a raw DB row to the UI-friendly QueueEntry shape.
 * Normalizes recipient fields across queue types.
 */
export function mapRowToQueueEntry(row: EmailQueueRow) {
  const recipientEmail =
    row.customer_email ||
    row.recipient_email ||
    row.requester_email ||
    ''

  const recipientName =
    row.customer_name ||
    row.recipient_name ||
    row.requester_name ||
    null

  const subject =
    row.document_title ||
    row.order_number ||
    row.subscription_id ||
    row.request_id ||
    null

  return {
    id: row.id,
    status: row.status,
    recipientEmail,
    recipientName,
    subject,
    templateType: row.template_type,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    attempts: row.attempts,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}
