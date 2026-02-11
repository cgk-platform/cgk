/**
 * E-Signature Bulk Send Data Layer
 *
 * Functions for managing bulk document sending operations.
 */

import { sql, withTenant } from '@cgk/db'
import type {
  EsignBulkSend,
  EsignBulkSendRecipient,
  CreateBulkSendInput,
  EsignBulkSendStatus,
} from './types'

/**
 * Create a new bulk send batch
 */
export async function createBulkSend(
  tenantSlug: string,
  input: CreateBulkSendInput,
  createdBy: string
): Promise<EsignBulkSend> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_bulk_sends (
        template_id,
        name,
        recipient_count,
        status,
        scheduled_for,
        csv_data,
        created_by
      ) VALUES (
        ${input.templateId},
        ${input.name || null},
        ${input.recipients.length},
        ${input.scheduledFor ? 'queued' : 'queued'},
        ${input.scheduledFor || null},
        ${JSON.stringify({ message: input.message, expiresInDays: input.expiresInDays })},
        ${createdBy}
      )
      RETURNING
        id,
        template_id as "templateId",
        name,
        recipient_count as "recipientCount",
        status,
        scheduled_for as "scheduledFor",
        started_at as "startedAt",
        completed_at as "completedAt",
        sent_count as "sentCount",
        failed_count as "failedCount",
        csv_data as "csvData",
        error_log as "errorLog",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const bulkSend = result.rows[0] as unknown as EsignBulkSend

    // Insert recipients
    for (const recipient of input.recipients) {
      await sql`
        INSERT INTO esign_bulk_send_recipients (
          bulk_send_id, name, email, custom_fields
        ) VALUES (
          ${bulkSend.id},
          ${recipient.name},
          ${recipient.email},
          ${JSON.stringify(recipient.customFields || {})}
        )
      `
    }

    return bulkSend
  })
}

/**
 * Get bulk send by ID
 */
export async function getBulkSend(
  tenantSlug: string,
  bulkSendId: string
): Promise<EsignBulkSend | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        template_id as "templateId",
        name,
        recipient_count as "recipientCount",
        status,
        scheduled_for as "scheduledFor",
        started_at as "startedAt",
        completed_at as "completedAt",
        sent_count as "sentCount",
        failed_count as "failedCount",
        csv_data as "csvData",
        error_log as "errorLog",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_bulk_sends
      WHERE id = ${bulkSendId}
    `
    return result.rows.length > 0 ? (result.rows[0] as unknown as EsignBulkSend) : null
  })
}

/**
 * Get bulk send with recipients
 */
export async function getBulkSendWithRecipients(
  tenantSlug: string,
  bulkSendId: string
): Promise<{ bulkSend: EsignBulkSend; recipients: EsignBulkSendRecipient[] } | null> {
  return withTenant(tenantSlug, async () => {
    const bulkSend = await getBulkSend(tenantSlug, bulkSendId)
    if (!bulkSend) return null

    const recipientResult = await sql`
      SELECT
        id,
        bulk_send_id as "bulkSendId",
        document_id as "documentId",
        name,
        email,
        custom_fields as "customFields",
        status,
        error_message as "errorMessage",
        sent_at as "sentAt",
        created_at as "createdAt"
      FROM esign_bulk_send_recipients
      WHERE bulk_send_id = ${bulkSendId}
      ORDER BY created_at ASC
    `

    return {
      bulkSend,
      recipients: recipientResult.rows as unknown as EsignBulkSendRecipient[],
    }
  })
}

/**
 * List bulk sends with pagination
 */
export async function listBulkSends(
  tenantSlug: string,
  options: {
    status?: EsignBulkSendStatus
    page?: number
    limit?: number
  } = {}
): Promise<{ bulkSends: EsignBulkSend[]; total: number }> {
  const { page = 1, limit = 20, status } = options
  const offset = (page - 1) * limit

  return withTenant(tenantSlug, async () => {
    const statusCondition = status ? sql`AND status = ${status}` : sql``

    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM esign_bulk_sends
      WHERE 1=1 ${statusCondition}
    `
    const total = Number(countResult.rows[0]?.count || 0)

    const result = await sql`
      SELECT
        id,
        template_id as "templateId",
        name,
        recipient_count as "recipientCount",
        status,
        scheduled_for as "scheduledFor",
        started_at as "startedAt",
        completed_at as "completedAt",
        sent_count as "sentCount",
        failed_count as "failedCount",
        csv_data as "csvData",
        error_log as "errorLog",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_bulk_sends
      WHERE 1=1 ${statusCondition}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      bulkSends: result.rows as unknown as EsignBulkSend[],
      total,
    }
  })
}

/**
 * Update bulk send status
 */
export async function updateBulkSendStatus(
  tenantSlug: string,
  bulkSendId: string,
  status: EsignBulkSendStatus,
  updates?: {
    startedAt?: Date
    completedAt?: Date
    sentCount?: number
    failedCount?: number
  }
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_bulk_sends
      SET status = ${status},
          started_at = COALESCE(${updates?.startedAt || null}, started_at),
          completed_at = COALESCE(${updates?.completedAt || null}, completed_at),
          sent_count = COALESCE(${updates?.sentCount ?? null}, sent_count),
          failed_count = COALESCE(${updates?.failedCount ?? null}, failed_count)
      WHERE id = ${bulkSendId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Increment bulk send counters
 */
export async function incrementBulkSendCounters(
  tenantSlug: string,
  bulkSendId: string,
  sentIncrement: number,
  failedIncrement: number
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE esign_bulk_sends
      SET sent_count = sent_count + ${sentIncrement},
          failed_count = failed_count + ${failedIncrement}
      WHERE id = ${bulkSendId}
    `
  })
}

/**
 * Update recipient status
 */
export async function updateRecipientStatus(
  tenantSlug: string,
  recipientId: string,
  status: 'pending' | 'sent' | 'failed',
  documentId?: string,
  errorMessage?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_bulk_send_recipients
      SET status = ${status},
          document_id = COALESCE(${documentId || null}, document_id),
          error_message = COALESCE(${errorMessage || null}, error_message),
          sent_at = ${status === 'sent' ? sql`NOW()` : sql`sent_at`}
      WHERE id = ${recipientId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Get pending recipients for bulk send
 */
export async function getPendingRecipients(
  tenantSlug: string,
  bulkSendId: string,
  limit = 10
): Promise<EsignBulkSendRecipient[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        bulk_send_id as "bulkSendId",
        document_id as "documentId",
        name,
        email,
        custom_fields as "customFields",
        status,
        error_message as "errorMessage",
        sent_at as "sentAt",
        created_at as "createdAt"
      FROM esign_bulk_send_recipients
      WHERE bulk_send_id = ${bulkSendId}
        AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${limit}
    `
    return result.rows as unknown as EsignBulkSendRecipient[]
  })
}

/**
 * Add error to bulk send error log
 */
export async function addBulkSendError(
  tenantSlug: string,
  bulkSendId: string,
  recipientEmail: string,
  error: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE esign_bulk_sends
      SET error_log = error_log || ${JSON.stringify([{
        recipientEmail,
        error,
        timestamp: new Date().toISOString(),
      }])}::jsonb
      WHERE id = ${bulkSendId}
    `
  })
}

/**
 * Cancel a bulk send
 */
export async function cancelBulkSend(
  tenantSlug: string,
  bulkSendId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_bulk_sends
      SET status = 'cancelled'
      WHERE id = ${bulkSendId}
        AND status IN ('queued', 'sending')
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Get scheduled bulk sends due for processing
 */
export async function getScheduledBulkSends(
  tenantSlug: string
): Promise<EsignBulkSend[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        template_id as "templateId",
        name,
        recipient_count as "recipientCount",
        status,
        scheduled_for as "scheduledFor",
        started_at as "startedAt",
        completed_at as "completedAt",
        sent_count as "sentCount",
        failed_count as "failedCount",
        csv_data as "csvData",
        error_log as "errorLog",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_bulk_sends
      WHERE status = 'queued'
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      ORDER BY COALESCE(scheduled_for, created_at) ASC
    `
    return result.rows as unknown as EsignBulkSend[]
  })
}
