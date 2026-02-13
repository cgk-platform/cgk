/**
 * Inbound Email Router
 *
 * Routes inbound emails to appropriate handlers based on address purpose.
 *
 * @ai-pattern inbound-email
 * @ai-note Handles treasury, receipt, support, and creator email routing
 */

import { sql } from '@cgk-platform/db'

import type {
  ApprovalParseResult,
  CreateTreasuryCommunicationInput,
  InboundAddressPurpose,
  InboundEmail,
  InboundEmailType,
  TreasuryCommunication,
  TreasuryReceipt,
} from './types.js'
import { handleCreatorReply } from './creator-replies.js'
import {
  defaultUploadToBlob,
  processReceiptEmail,
  type UploadToBlobFn,
} from './receipt-processor.js'
import { addInboundToThread, matchToThread } from './thread-matcher.js'
import {
  extractTreasuryRequestId,
  parseTreasuryApproval,
} from './treasury-parser.js'
import { updateInboundLogStatus } from './webhook-handler.js'

// ============================================================================
// Handler Result Types
// ============================================================================

/**
 * Result of handling treasury email
 */
export interface TreasuryHandlerResult {
  success: boolean
  treasuryRequestId?: string
  approval?: ApprovalParseResult
  communicationId?: string
  error?: string
}

/**
 * Result of handling receipt email
 */
export interface ReceiptHandlerResult {
  success: boolean
  receiptId?: string
  attachmentCount?: number
  error?: string
}

/**
 * Result of handling support email
 */
export interface SupportHandlerResult {
  success: boolean
  threadId?: string
  isNewThread?: boolean
  messageId?: string
  error?: string
}

/**
 * Result of handling creator email
 */
export interface CreatorHandlerResult {
  success: boolean
  creatorId?: string
  threadId?: string
  isNewThread?: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// Treasury Communication Database Operations
// ============================================================================

/**
 * Create treasury communication record
 */
export async function createTreasuryCommunication(
  input: CreateTreasuryCommunicationInput
): Promise<TreasuryCommunication> {
  const result = await sql`
    INSERT INTO treasury_communications (
      treasury_request_id, direction, channel,
      from_address, to_address, subject, body,
      parsed_approval_status, parsed_confidence, matched_keywords,
      message_id, in_reply_to, inbound_email_id,
      processed_at, processed_by
    ) VALUES (
      ${input.treasuryRequestId ?? null},
      ${input.direction},
      ${input.channel},
      ${input.fromAddress ?? null},
      ${input.toAddress ?? null},
      ${input.subject ?? null},
      ${input.body ?? null},
      ${input.parsedApprovalStatus ?? null},
      ${input.parsedConfidence ?? null},
      ${input.matchedKeywords ? JSON.stringify(input.matchedKeywords) : null}::text[],
      ${input.messageId ?? null},
      ${input.inReplyTo ?? null},
      ${input.inboundEmailId ?? null},
      NOW(),
      ${input.processedBy ?? 'system'}
    )
    RETURNING *
  `

  const row = result.rows[0] as Record<string, unknown>

  return {
    id: row.id as string,
    treasuryRequestId: row.treasury_request_id as string | null,
    direction: row.direction as 'inbound' | 'outbound',
    channel: row.channel as 'email' | 'slack' | 'manual',
    fromAddress: row.from_address as string | null,
    toAddress: row.to_address as string | null,
    subject: row.subject as string | null,
    body: row.body as string | null,
    parsedApprovalStatus: row.parsed_approval_status as ApprovalParseResult['status'] | null,
    parsedConfidence: row.parsed_confidence as ApprovalParseResult['confidence'] | null,
    matchedKeywords: row.matched_keywords as string[] | null,
    messageId: row.message_id as string | null,
    inReplyTo: row.in_reply_to as string | null,
    inboundEmailId: row.inbound_email_id as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    processedBy: row.processed_by as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

// ============================================================================
// Treasury Receipt Database Operations
// ============================================================================

/**
 * Create treasury receipt record
 */
export async function createTreasuryReceipt(
  input: {
    inboundEmailId?: string
    fromAddress: string
    subject?: string
    body?: string
    attachments: TreasuryReceipt['attachments']
    status?: TreasuryReceipt['status']
  }
): Promise<TreasuryReceipt> {
  const result = await sql`
    INSERT INTO treasury_receipts (
      inbound_email_id, from_address, subject, body,
      attachments, status
    ) VALUES (
      ${input.inboundEmailId ?? null},
      ${input.fromAddress},
      ${input.subject ?? null},
      ${input.body ?? null},
      ${JSON.stringify(input.attachments)},
      ${input.status ?? 'pending'}
    )
    RETURNING *
  `

  const row = result.rows[0] as Record<string, unknown>

  return {
    id: row.id as string,
    inboundEmailId: row.inbound_email_id as string | null,
    fromAddress: row.from_address as string,
    subject: row.subject as string | null,
    body: row.body as string | null,
    attachments: (row.attachments || []) as TreasuryReceipt['attachments'],
    status: row.status as TreasuryReceipt['status'],
    linkedExpenseId: row.linked_expense_id as string | null,
    vendorName: row.vendor_name as string | null,
    description: row.description as string | null,
    amountCents: row.amount_cents as number | null,
    currency: (row.currency as string) || 'USD',
    expenseCategoryId: row.expense_category_id as string | null,
    receiptDate: row.receipt_date as string | null,
    notes: row.notes as string | null,
    processedBy: row.processed_by as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

// ============================================================================
// Email Handlers
// ============================================================================

/**
 * Handle treasury approval email
 */
export async function handleTreasuryEmail(
  email: InboundEmail,
  logId: string
): Promise<TreasuryHandlerResult> {
  try {
    // Parse for approval keywords
    const approval = parseTreasuryApproval(
      email.subject || '',
      email.bodyText || ''
    )

    // Skip auto-replies
    if (approval.isAutoReply) {
      await updateInboundLogStatus(logId, 'ignored', 'Auto-reply detected')
      return {
        success: true,
        approval,
      }
    }

    // Extract treasury request ID from subject
    const treasuryRequestId = extractTreasuryRequestId(email.subject || '')

    // Create communication record
    const communication = await createTreasuryCommunication({
      treasuryRequestId: treasuryRequestId || undefined,
      direction: 'inbound',
      channel: 'email',
      fromAddress: email.from,
      toAddress: email.to,
      subject: email.subject,
      body: email.bodyText,
      parsedApprovalStatus: approval.status,
      parsedConfidence: approval.confidence,
      matchedKeywords: approval.matchedKeywords,
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      inboundEmailId: logId,
    })

    // Update log with link
    await updateInboundLogStatus(
      logId,
      'processed',
      undefined,
      'treasury_communication',
      communication.id
    )

    return {
      success: true,
      treasuryRequestId: treasuryRequestId || undefined,
      approval,
      communicationId: communication.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await updateInboundLogStatus(logId, 'failed', message)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Handle receipt email
 */
export async function handleReceiptEmail(
  tenantId: string,
  email: InboundEmail,
  logId: string,
  uploadFn: UploadToBlobFn = defaultUploadToBlob
): Promise<ReceiptHandlerResult> {
  try {
    const result = await processReceiptEmail(
      tenantId,
      email,
      uploadFn,
      createTreasuryReceipt
    )

    // Update log with link
    await updateInboundLogStatus(
      logId,
      'processed',
      undefined,
      'treasury_receipt',
      result.receiptId
    )

    return {
      success: true,
      receiptId: result.receiptId,
      attachmentCount: result.attachments.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await updateInboundLogStatus(logId, 'failed', message)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Handle support email
 */
export async function handleSupportEmail(
  email: InboundEmail,
  logId: string
): Promise<SupportHandlerResult> {
  try {
    // Match to existing thread or create new one
    const thread = await matchToThread(email)

    // Add message to thread
    const message = await addInboundToThread(email, thread.threadId, logId)

    // Update log with link
    await updateInboundLogStatus(
      logId,
      'processed',
      undefined,
      'thread',
      thread.threadId
    )

    return {
      success: true,
      threadId: thread.threadId,
      isNewThread: thread.isNewThread,
      messageId: message.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await updateInboundLogStatus(logId, 'failed', message)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Handle creator reply email
 */
export async function handleCreatorReplyEmail(
  email: InboundEmail,
  logId: string
): Promise<CreatorHandlerResult> {
  try {
    const result = await handleCreatorReply(email, logId)

    if (!result) {
      // Not from a recognized creator - treat as generic support
      const supportResult = await handleSupportEmail(email, logId)
      return {
        success: supportResult.success,
        threadId: supportResult.threadId,
        isNewThread: supportResult.isNewThread,
        messageId: supportResult.messageId,
        error: supportResult.error,
      }
    }

    // Update log with link
    await updateInboundLogStatus(
      logId,
      'processed',
      undefined,
      'creator',
      result.thread.creatorId
    )

    return {
      success: true,
      creatorId: result.thread.creatorId,
      threadId: result.thread.threadId,
      isNewThread: result.thread.isNewThread,
      messageId: result.message.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await updateInboundLogStatus(logId, 'failed', message)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Handle generic/unknown email
 */
export async function handleGenericEmail(
  email: InboundEmail,
  logId: string
): Promise<SupportHandlerResult> {
  // Route to support handler by default
  return handleSupportEmail(email, logId)
}

// ============================================================================
// Main Router
// ============================================================================

/**
 * Route email to appropriate handler based on purpose
 */
export async function routeEmail(
  tenantId: string,
  email: InboundEmail,
  logId: string,
  purpose: InboundAddressPurpose,
  uploadFn?: UploadToBlobFn
): Promise<{
  success: boolean
  handler: string
  result: unknown
}> {
  switch (purpose) {
    case 'treasury':
      return {
        success: true,
        handler: 'treasury',
        result: await handleTreasuryEmail(email, logId),
      }

    case 'receipts':
      return {
        success: true,
        handler: 'receipts',
        result: await handleReceiptEmail(tenantId, email, logId, uploadFn),
      }

    case 'support':
    case 'general':
      return {
        success: true,
        handler: 'support',
        result: await handleSupportEmail(email, logId),
      }

    case 'creator':
      return {
        success: true,
        handler: 'creator',
        result: await handleCreatorReplyEmail(email, logId),
      }

    default:
      return {
        success: true,
        handler: 'generic',
        result: await handleGenericEmail(email, logId),
      }
  }
}

/**
 * Get email type from purpose
 */
export function getEmailTypeFromPurpose(
  purpose: InboundAddressPurpose
): InboundEmailType {
  const typeMap: Record<InboundAddressPurpose, InboundEmailType> = {
    treasury: 'treasury_approval',
    receipts: 'receipt',
    support: 'support',
    creator: 'creator_reply',
    general: 'unknown',
  }

  return typeMap[purpose] || 'unknown'
}
