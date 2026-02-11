/**
 * Inbound Email Webhook Handler
 *
 * Main entry point for processing inbound emails from Resend webhooks.
 * Handles signature verification, tenant lookup, routing, and processing.
 *
 * @ai-pattern inbound-email
 * @ai-note All operations are tenant-isolated
 */

import { sql } from '@cgk/db'
import crypto from 'crypto'

import type {
  InboundAddressInfo,
  InboundEmail,
  InboundEmailLog,
  InboundEmailType,
  InboundProcessingStatus,
  LogInboundEmailInput,
} from './types.js'

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify Resend webhook signature
 *
 * @param payload - Raw webhook payload string
 * @param signature - Signature from resend-signature header
 * @param secret - Webhook secret from Resend
 * @returns True if signature is valid
 */
export function verifyResendSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    // Resend uses HMAC-SHA256
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

/**
 * Verify Svix webhook signature (used by Resend v2 webhooks)
 *
 * @param payload - Raw webhook payload string
 * @param headers - Object with svix-id, svix-timestamp, svix-signature headers
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifySvixSignature(
  payload: string,
  headers: {
    'svix-id'?: string | null
    'svix-timestamp'?: string | null
    'svix-signature'?: string | null
  },
  secret: string
): boolean {
  const svixId = headers['svix-id']
  const svixTimestamp = headers['svix-timestamp']
  const svixSignature = headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature || !secret) {
    return false
  }

  try {
    // Check timestamp is within 5 minutes
    const timestamp = parseInt(svixTimestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestamp) > 300) {
      return false
    }

    // Build signature base string
    const signatureBase = `${svixId}.${svixTimestamp}.${payload}`

    // Decode secret (base64 with whsec_ prefix)
    const secretBytes = Buffer.from(
      secret.startsWith('whsec_') ? secret.slice(6) : secret,
      'base64'
    )

    // Calculate expected signature
    const expected = crypto
      .createHmac('sha256', secretBytes)
      .update(signatureBase)
      .digest('base64')

    // Parse signatures (comma-separated, may have version prefix)
    const signatures = svixSignature.split(',').map((sig) => {
      const parts = sig.split(' ')
      return parts.length > 1 ? parts[1] : parts[0]
    })

    // Check if any signature matches
    return signatures.some((sig) => {
      if (!sig) return false
      try {
        return crypto.timingSafeEqual(
          Buffer.from(sig, 'base64'),
          Buffer.from(expected, 'base64')
        )
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

// ============================================================================
// Email Parsing
// ============================================================================

/**
 * Parse inbound email from Resend webhook payload
 */
export function parseInboundEmail(
  payload: Record<string, unknown>
): InboundEmail {
  // Handle both nested and flat payload structures
  const data = (payload.data as Record<string, unknown>) || payload

  return {
    from: (data.from as string) || '',
    fromName: data.from_name as string | undefined,
    to: (data.to as string) || (Array.isArray(data.to) ? data.to[0] : ''),
    subject: data.subject as string | undefined,
    bodyText: data.text as string | undefined,
    bodyHtml: data.html as string | undefined,
    messageId: data.message_id as string | undefined,
    inReplyTo: data.in_reply_to as string | undefined,
    references: parseReferences(data.references),
    attachments: parseAttachments(data.attachments),
    rawPayload: payload,
    resendEmailId: (data.email_id || data.id) as string | undefined,
    receivedAt: new Date(),
  }
}

/**
 * Parse references header (may be string or array)
 */
function parseReferences(
  refs: unknown
): string[] | undefined {
  if (!refs) return undefined
  if (Array.isArray(refs)) return refs as string[]
  if (typeof refs === 'string') {
    return refs.split(/\s+/).filter(Boolean)
  }
  return undefined
}

/**
 * Parse attachments from payload
 */
function parseAttachments(
  attachments: unknown
): InboundEmail['attachments'] {
  if (!Array.isArray(attachments)) return undefined

  return attachments.map((att: Record<string, unknown>) => ({
    filename: (att.filename as string) || 'unnamed',
    contentType: (att.content_type as string) || 'application/octet-stream',
    sizeBytes: (att.size as number) || 0,
    content: att.content as string | undefined,
  }))
}

// ============================================================================
// Inbound Address Lookup
// ============================================================================

/**
 * Find inbound address configuration by email
 *
 * Looks up the sender address across all tenants to find which
 * tenant should receive this inbound email.
 *
 * @param toAddress - The TO address from the inbound email
 * @returns Address info with tenant context, or null if not found
 */
export async function findInboundAddressByEmail(
  toAddress: string
): Promise<InboundAddressInfo | null> {
  // Query public schema for tenant + address info
  // This is a cross-tenant lookup, so we query directly
  const result = await sql`
    SELECT
      sa.id,
      sa.email_address,
      sa.display_name,
      sa.purpose,
      o.id as tenant_id,
      o.slug as tenant_slug
    FROM public.organizations o
    CROSS JOIN LATERAL (
      SELECT *
      FROM tenant_sender_addresses sa
      WHERE sa.email_address = ${toAddress.toLowerCase()}
      AND sa.is_inbound_enabled = true
    ) sa
    WHERE o.status = 'active'
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) return null

  // Map purpose to inbound purpose type
  const purposeMap: Record<string, InboundAddressInfo['purpose']> = {
    treasury: 'treasury',
    transactional: 'receipts',
    support: 'support',
    creator: 'creator',
    system: 'general',
  }

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    tenantSlug: row.tenant_slug as string,
    emailAddress: row.email_address as string,
    purpose: purposeMap[row.purpose as string] || 'general',
    displayName: row.display_name as string,
  }
}

// ============================================================================
// Inbound Email Logging
// ============================================================================

/**
 * Map database row to InboundEmailLog
 */
function mapRowToLog(row: Record<string, unknown>): InboundEmailLog {
  return {
    id: row.id as string,
    fromAddress: row.from_address as string,
    fromName: row.from_name as string | null,
    toAddress: row.to_address as string,
    subject: row.subject as string | null,
    bodyText: row.body_text as string | null,
    bodyHtml: row.body_html as string | null,
    attachments: (row.attachments || []) as InboundEmailLog['attachments'],
    messageId: row.message_id as string | null,
    inReplyTo: row.in_reply_to as string | null,
    referencesList: row.references_list as string[] | null,
    emailType: row.email_type as InboundEmailType,
    inboundAddressId: row.inbound_address_id as string | null,
    processingStatus: row.processing_status as InboundProcessingStatus,
    processingError: row.processing_error as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    linkedRecordType: row.linked_record_type as string | null,
    linkedRecordId: row.linked_record_id as string | null,
    rawPayload: row.raw_payload as Record<string, unknown> | null,
    resendEmailId: row.resend_email_id as string | null,
    isAutoReply: row.is_auto_reply as boolean,
    isSpam: row.is_spam as boolean,
    spamScore: row.spam_score as number | null,
    receivedAt: new Date(row.received_at as string),
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Log inbound email to database
 */
export async function logInboundEmail(
  input: LogInboundEmailInput
): Promise<InboundEmailLog> {
  const result = await sql`
    INSERT INTO inbound_email_logs (
      from_address, from_name, to_address, subject,
      body_text, body_html, attachments,
      message_id, in_reply_to, references_list,
      email_type, inbound_address_id,
      raw_payload, resend_email_id,
      is_auto_reply, is_spam, spam_score
    ) VALUES (
      ${input.fromAddress},
      ${input.fromName ?? null},
      ${input.toAddress},
      ${input.subject ?? null},
      ${input.bodyText ?? null},
      ${input.bodyHtml ?? null},
      ${JSON.stringify(input.attachments ?? [])},
      ${input.messageId ?? null},
      ${input.inReplyTo ?? null},
      ${input.referencesList ? JSON.stringify(input.referencesList) : null}::text[],
      ${input.emailType},
      ${input.inboundAddressId ?? null},
      ${JSON.stringify(input.rawPayload ?? {})},
      ${input.resendEmailId ?? null},
      ${input.isAutoReply ?? false},
      ${input.isSpam ?? false},
      ${input.spamScore ?? null}
    )
    RETURNING *
  `

  return mapRowToLog(result.rows[0] as Record<string, unknown>)
}

/**
 * Update inbound log status
 */
export async function updateInboundLogStatus(
  logId: string,
  status: InboundProcessingStatus,
  error?: string,
  linkedRecordType?: string,
  linkedRecordId?: string
): Promise<void> {
  await sql`
    UPDATE inbound_email_logs
    SET
      processing_status = ${status},
      processing_error = ${error ?? null},
      processed_at = CASE WHEN ${status} != 'pending' THEN NOW() ELSE processed_at END,
      linked_record_type = COALESCE(${linkedRecordType ?? null}, linked_record_type),
      linked_record_id = COALESCE(${linkedRecordId ?? null}, linked_record_id)
    WHERE id = ${logId}
  `
}

/**
 * Log unknown inbound email (no tenant match)
 *
 * Stores in a platform-level log for debugging
 */
export async function logUnknownInbound(email: InboundEmail): Promise<void> {
  try {
    // Log to platform table in public schema
    await sql`
      INSERT INTO public.platform_logs (
        category, level, message, metadata, created_at
      ) VALUES (
        'inbound_email',
        'warning',
        'Received email for unknown address',
        ${JSON.stringify({
          to: email.to,
          from: email.from,
          subject: email.subject,
          messageId: email.messageId,
          receivedAt: email.receivedAt.toISOString(),
        })},
        NOW()
      )
    `
  } catch (error) {
    console.error('Failed to log unknown inbound email:', error)
  }
}

// ============================================================================
// Inbound Email Retrieval
// ============================================================================

/**
 * Get inbound email log by ID
 */
export async function getInboundEmailById(
  id: string
): Promise<InboundEmailLog | null> {
  const result = await sql`
    SELECT * FROM inbound_email_logs WHERE id = ${id}
  `

  const row = result.rows[0]
  return row ? mapRowToLog(row as Record<string, unknown>) : null
}

/**
 * List inbound emails with filters
 * Note: Simplified version without dynamic WHERE building due to template literal constraints
 */
export async function listInboundEmails(options: {
  emailType?: InboundEmailType
  processingStatus?: InboundProcessingStatus
  fromAddress?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{
  emails: InboundEmailLog[]
  total: number
}> {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  // Use a simplified query approach
  const emailType = options.emailType || null
  const processingStatus = options.processingStatus || null
  const fromAddressPattern = options.fromAddress ? `%${options.fromAddress}%` : null
  const searchPattern = options.search ? `%${options.search}%` : null

  const [emailsResult, countResult] = await Promise.all([
    sql`
      SELECT * FROM inbound_email_logs
      WHERE
        (${emailType}::text IS NULL OR email_type = ${emailType})
        AND (${processingStatus}::text IS NULL OR processing_status = ${processingStatus})
        AND (${fromAddressPattern}::text IS NULL OR from_address ILIKE ${fromAddressPattern})
        AND (${searchPattern}::text IS NULL OR (
          subject ILIKE ${searchPattern}
          OR from_address ILIKE ${searchPattern}
          OR body_text ILIKE ${searchPattern}
        ))
      ORDER BY received_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as total FROM inbound_email_logs
      WHERE
        (${emailType}::text IS NULL OR email_type = ${emailType})
        AND (${processingStatus}::text IS NULL OR processing_status = ${processingStatus})
        AND (${fromAddressPattern}::text IS NULL OR from_address ILIKE ${fromAddressPattern})
        AND (${searchPattern}::text IS NULL OR (
          subject ILIKE ${searchPattern}
          OR from_address ILIKE ${searchPattern}
          OR body_text ILIKE ${searchPattern}
        ))
    `,
  ])

  return {
    emails: emailsResult.rows.map((row) => mapRowToLog(row as Record<string, unknown>)),
    total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
  }
}

// ============================================================================
// Main Handler Result Type
// ============================================================================

/**
 * Result of processing an inbound email
 */
export interface InboundProcessingResult {
  received: boolean
  processed: boolean
  logId?: string
  tenantSlug?: string
  emailType?: InboundEmailType
  error?: string
}
