/**
 * Payment Request (Invoice) Functions
 *
 * Manages contractor payment requests/invoices including
 * submission, status tracking, and attachment handling.
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreatePaymentRequestInput,
  PaymentRequest,
  PaymentRequestAttachment,
  PaymentRequestStatus,
  WorkType,
} from './types'
import { PAYMENT_REQUEST_RULES } from './types'

/**
 * Create a new payment request
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param input - Payment request data
 */
export async function createPaymentRequest(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  input: CreatePaymentRequestInput
): Promise<PaymentRequest> {
  // Validate amount
  if (input.amountCents < PAYMENT_REQUEST_RULES.minAmountCents) {
    throw new PaymentRequestError(
      `Minimum amount is $${(PAYMENT_REQUEST_RULES.minAmountCents / 100).toFixed(2)}`,
      'MIN_AMOUNT'
    )
  }

  // Validate description
  if (input.description.length < PAYMENT_REQUEST_RULES.minDescriptionLength) {
    throw new PaymentRequestError(
      `Description must be at least ${PAYMENT_REQUEST_RULES.minDescriptionLength} characters`,
      'MIN_DESCRIPTION'
    )
  }

  // Validate work type
  if (
    !PAYMENT_REQUEST_RULES.allowedWorkTypes.includes(
      input.workType as (typeof PAYMENT_REQUEST_RULES.allowedWorkTypes)[number]
    )
  ) {
    throw new PaymentRequestError('Invalid work type', 'INVALID_WORK_TYPE')
  }

  // Check pending request count
  const pendingCount = await getPendingRequestCount(payeeId, tenantSlug)
  if (pendingCount >= PAYMENT_REQUEST_RULES.maxPendingRequests) {
    throw new PaymentRequestError(
      `Maximum of ${PAYMENT_REQUEST_RULES.maxPendingRequests} pending requests allowed`,
      'MAX_PENDING'
    )
  }

  // Get attachments if IDs provided
  let attachments: PaymentRequestAttachment[] = []
  if (input.attachmentIds && input.attachmentIds.length > 0) {
    attachments = await getAttachmentsByIds(input.attachmentIds, tenantSlug)
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO payment_requests (
        payee_id, tenant_id, amount_cents, description, work_type,
        project_id, attachments, status
      )
      VALUES (
        ${payeeId}, ${tenantId}, ${input.amountCents}, ${input.description},
        ${input.workType}, ${input.projectId || null},
        ${JSON.stringify(attachments)}, 'pending'
      )
      RETURNING *
    `
  })

  return mapRowToPaymentRequest(result.rows[0] as Record<string, unknown>)
}

/**
 * Get payment requests for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param options - Filtering and pagination options
 */
export async function getPaymentRequests(
  payeeId: string,
  tenantSlug: string,
  options: {
    status?: PaymentRequestStatus
    limit?: number
    offset?: number
  } = {}
): Promise<{ requests: PaymentRequest[]; total: number }> {
  const { status, limit = 50, offset = 0 } = options

  const result = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql`
        SELECT *
        FROM payment_requests
        WHERE payee_id = ${payeeId}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }
    return sql`
      SELECT *
      FROM payment_requests
      WHERE payee_id = ${payeeId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql`
        SELECT COUNT(*) as total
        FROM payment_requests
        WHERE payee_id = ${payeeId}
          AND status = ${status}
      `
    }
    return sql`
      SELECT COUNT(*) as total
      FROM payment_requests
      WHERE payee_id = ${payeeId}
    `
  })

  return {
    requests: result.rows.map((row) =>
      mapRowToPaymentRequest(row as Record<string, unknown>)
    ),
    total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
  }
}

/**
 * Get a single payment request by ID
 *
 * @param requestId - Payment request ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getPaymentRequestById(
  requestId: string,
  payeeId: string,
  tenantSlug: string
): Promise<PaymentRequest | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payment_requests
      WHERE id = ${requestId}
        AND payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToPaymentRequest(result.rows[0] as Record<string, unknown>)
}

/**
 * Get count of pending payment requests
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getPendingRequestCount(
  payeeId: string,
  tenantSlug: string
): Promise<number> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT COUNT(*) as count
      FROM payment_requests
      WHERE payee_id = ${payeeId}
        AND status = 'pending'
    `
  })

  return parseInt(result.rows[0]?.count as string, 10) || 0
}

/**
 * Upload a payment request attachment
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param attachment - Attachment data
 */
export async function createPaymentAttachment(
  payeeId: string,
  tenantSlug: string,
  attachment: {
    url: string
    filename: string
    mimeType: string
    sizeBytes: number
  }
): Promise<PaymentRequestAttachment> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO payment_request_attachments (
        payee_id, url, filename, mime_type, size_bytes
      )
      VALUES (
        ${payeeId}, ${attachment.url}, ${attachment.filename},
        ${attachment.mimeType}, ${attachment.sizeBytes}
      )
      RETURNING *
    `
  })

  const row = result.rows[0] as Record<string, unknown>
  return {
    id: row.id as string,
    url: row.url as string,
    filename: row.filename as string,
    mimeType: row.mime_type as string,
    sizeBytes: parseInt(row.size_bytes as string, 10),
    uploadedAt: new Date(row.created_at as string),
  }
}

/**
 * Get attachments by IDs
 *
 * @param attachmentIds - Array of attachment IDs
 * @param tenantSlug - Tenant slug for schema access
 */
async function getAttachmentsByIds(
  attachmentIds: string[],
  tenantSlug: string
): Promise<PaymentRequestAttachment[]> {
  if (attachmentIds.length === 0) {
    return []
  }

  // Query attachments individually since SQL templates don't support array params
  const result = await withTenant(tenantSlug, async () => {
    // Note: Using string interpolation here is safe since IDs are controlled values
    return sql`
      SELECT *
      FROM payment_request_attachments
      WHERE id IN (${attachmentIds[0]})
    `
  })

  // If more than one attachment, need multiple queries
  if (attachmentIds.length > 1) {
    // For now, query each individually (not ideal but works)
    const allResults = await Promise.all(
      attachmentIds.map((id) =>
        withTenant(tenantSlug, async () =>
          sql`SELECT * FROM payment_request_attachments WHERE id = ${id}`
        )
      )
    )
    const rows = allResults.flatMap((r) => r.rows)
    return rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as string,
        url: r.url as string,
        filename: r.filename as string,
        mimeType: r.mime_type as string,
        sizeBytes: parseInt(r.size_bytes as string, 10),
        uploadedAt: new Date(r.created_at as string),
      }
    })
  }

  return result.rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      url: r.url as string,
      filename: r.filename as string,
      mimeType: r.mime_type as string,
      sizeBytes: parseInt(r.size_bytes as string, 10),
      uploadedAt: new Date(r.created_at as string),
    }
  })
}

/**
 * Map database row to PaymentRequest
 */
function mapRowToPaymentRequest(row: Record<string, unknown>): PaymentRequest {
  let attachments: PaymentRequestAttachment[] = []
  try {
    const attachmentData = row.attachments
    if (attachmentData) {
      const parsed =
        typeof attachmentData === 'string'
          ? JSON.parse(attachmentData)
          : attachmentData
      if (Array.isArray(parsed)) {
        attachments = parsed
      }
    }
  } catch {
    attachments = []
  }

  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    amountCents: parseInt(row.amount_cents as string, 10),
    description: row.description as string,
    workType: row.work_type as WorkType,
    projectId: (row.project_id as string) || null,
    attachments,
    status: row.status as PaymentRequestStatus,
    adminNotes: (row.admin_notes as string) || null,
    approvedAmountCents: row.approved_amount_cents
      ? parseInt(row.approved_amount_cents as string, 10)
      : null,
    approvedBy: (row.approved_by as string) || null,
    rejectionReason: (row.rejection_reason as string) || null,
    createdAt: new Date(row.created_at as string),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
    paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
  }
}

/**
 * Payment request error class
 */
export class PaymentRequestError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'PaymentRequestError'
    this.code = code
  }
}
