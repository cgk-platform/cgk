/**
 * Privacy Service
 * Phase 2SP-CHANNELS: GDPR/CCPA privacy request management and consent tracking
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use withTenant() for all database operations
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  ConsentFilters,
  ConsentRecord,
  ConsentType,
  CreatePrivacyRequestInput,
  PrivacyRequest,
  PrivacyRequestFilters,
  PrivacyRequestStatus,
  PrivacyRequestType,
  RecordConsentInput,
  UpdatePrivacyRequestInput,
  VerificationMethod,
  VerifyRequestInput,
} from './channel-types'
import {
  COMPLIANCE_DEADLINES,
  calculateDeadline,
  getDaysUntilDeadline,
  isRequestOverdue,
} from './channel-types'

// ============================================
// REQUEST MANAGEMENT
// ============================================

/**
 * Create a new privacy request
 */
export async function createPrivacyRequest(
  tenantId: string,
  data: CreatePrivacyRequestInput
): Promise<PrivacyRequest> {
  return withTenant(tenantId, async () => {
    // Calculate deadline based on regulation (default to GDPR as stricter)
    const deadline = calculateDeadline(data.requestType, 'gdpr')

    const result = await sql`
      INSERT INTO privacy_requests (
        customer_email,
        customer_id,
        request_type,
        notes,
        deadline_at
      ) VALUES (
        ${data.customerEmail},
        ${data.customerId ?? null},
        ${data.requestType},
        ${data.notes ?? null},
        ${deadline.toISOString()}
      )
      RETURNING *
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) {
      throw new Error('Failed to create privacy request')
    }
    return mapRequestRow(row)
  })
}

/**
 * Get privacy requests with filters
 */
export async function getPrivacyRequests(
  tenantId: string,
  filters: PrivacyRequestFilters = {}
): Promise<{ requests: PrivacyRequest[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters.limit ?? 50
    const offset = ((filters.page ?? 1) - 1) * limit

    // Use conditional queries instead of dynamic SQL
    let countResult
    let requestsResult

    if (filters.status) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM privacy_requests WHERE status = ${filters.status}
      `
      requestsResult = await sql`
        SELECT * FROM privacy_requests
        WHERE status = ${filters.status}
        ORDER BY
          CASE WHEN status IN ('pending', 'processing') THEN 0 ELSE 1 END,
          deadline_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.requestType) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM privacy_requests WHERE request_type = ${filters.requestType}
      `
      requestsResult = await sql`
        SELECT * FROM privacy_requests
        WHERE request_type = ${filters.requestType}
        ORDER BY
          CASE WHEN status IN ('pending', 'processing') THEN 0 ELSE 1 END,
          deadline_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.customerEmail) {
      const emailPattern = `%${filters.customerEmail}%`
      countResult = await sql`
        SELECT COUNT(*) as count FROM privacy_requests WHERE customer_email ILIKE ${emailPattern}
      `
      requestsResult = await sql`
        SELECT * FROM privacy_requests
        WHERE customer_email ILIKE ${emailPattern}
        ORDER BY
          CASE WHEN status IN ('pending', 'processing') THEN 0 ELSE 1 END,
          deadline_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.overdue) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM privacy_requests
        WHERE deadline_at < NOW() AND status IN ('pending', 'processing')
      `
      requestsResult = await sql`
        SELECT * FROM privacy_requests
        WHERE deadline_at < NOW() AND status IN ('pending', 'processing')
        ORDER BY deadline_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      // No filters - get all
      countResult = await sql`SELECT COUNT(*) as count FROM privacy_requests`
      requestsResult = await sql`
        SELECT * FROM privacy_requests
        ORDER BY
          CASE WHEN status IN ('pending', 'processing') THEN 0 ELSE 1 END,
          deadline_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countRow = countResult.rows[0] as Record<string, unknown> | undefined
    const total = parseInt((countRow?.count as string) ?? '0', 10)

    return {
      requests: requestsResult.rows.map((r) => mapRequestRow(r as Record<string, unknown>)),
      total,
    }
  })
}

/**
 * Get a privacy request by ID
 */
export async function getPrivacyRequest(
  tenantId: string,
  requestId: string
): Promise<PrivacyRequest | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM privacy_requests WHERE id = ${requestId}
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapRequestRow(row)
  })
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  tenantId: string,
  requestId: string,
  status: PrivacyRequestStatus,
  userId?: string
): Promise<PrivacyRequest | null> {
  return withTenant(tenantId, async () => {
    // Update status
    await sql`
      UPDATE privacy_requests
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${requestId}
    `

    // Update processed_by if applicable
    if ((status === 'processing' || status === 'completed' || status === 'rejected') && userId) {
      await sql`
        UPDATE privacy_requests
        SET processed_by = ${userId}
        WHERE id = ${requestId}
      `
    }

    // Update processed_at if completed or rejected
    if (status === 'completed' || status === 'rejected') {
      await sql`
        UPDATE privacy_requests
        SET processed_at = NOW()
        WHERE id = ${requestId}
      `
    }

    return getPrivacyRequest(tenantId, requestId)
  })
}

/**
 * Update a privacy request
 */
export async function updatePrivacyRequest(
  tenantId: string,
  requestId: string,
  data: UpdatePrivacyRequestInput
): Promise<PrivacyRequest | null> {
  return withTenant(tenantId, async () => {
    // Update individual fields
    if (data.status) {
      await sql`
        UPDATE privacy_requests
        SET status = ${data.status}, updated_at = NOW()
        WHERE id = ${requestId}
      `
    }
    if (data.notes !== undefined) {
      await sql`
        UPDATE privacy_requests
        SET notes = ${data.notes}, updated_at = NOW()
        WHERE id = ${requestId}
      `
    }
    if (data.rejectionReason !== undefined) {
      await sql`
        UPDATE privacy_requests
        SET rejection_reason = ${data.rejectionReason}, updated_at = NOW()
        WHERE id = ${requestId}
      `
    }
    if (data.resultUrl !== undefined) {
      await sql`
        UPDATE privacy_requests
        SET result_url = ${data.resultUrl}, updated_at = NOW()
        WHERE id = ${requestId}
      `
    }

    return getPrivacyRequest(tenantId, requestId)
  })
}

// ============================================
// VERIFICATION
// ============================================

/**
 * Verify a privacy request
 */
export async function verifyRequest(
  tenantId: string,
  requestId: string,
  data: VerifyRequestInput
): Promise<PrivacyRequest | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE privacy_requests
      SET
        verified_at = NOW(),
        verification_method = ${data.method},
        updated_at = NOW()
      WHERE id = ${requestId}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapRequestRow(row)
  })
}

// ============================================
// DATA PROCESSING
// ============================================

/**
 * Process a data export request
 * Generates a JSON export of all customer data
 *
 * @returns URL to the exported data file
 */
export async function processDataExport(
  tenantId: string,
  requestId: string
): Promise<string> {
  return withTenant(tenantId, async () => {
    // Get the request
    const requestResult = await sql`
      SELECT customer_email, customer_id
      FROM privacy_requests
      WHERE id = ${requestId}
    `

    if (requestResult.rows.length === 0) {
      throw new Error('Request not found')
    }

    const reqRow = requestResult.rows[0] as Record<string, unknown>
    const customerEmail = reqRow.customer_email as string
    const customerId = reqRow.customer_id as string | null

    // Collect all customer data from various tables
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      customerEmail,
      customerId,
      data: {},
    }

    // Get customer orders
    const ordersResult = await sql`
      SELECT id, order_number, status, total_amount, created_at
      FROM orders
      WHERE customer_email = ${customerEmail}
      ORDER BY created_at DESC
    `
    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      orders: ordersResult.rows,
    }

    // Get support tickets
    const ticketsResult = await sql`
      SELECT id, ticket_number, subject, status, created_at, resolved_at
      FROM support_tickets
      WHERE customer_email = ${customerEmail}
      ORDER BY created_at DESC
    `
    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      supportTickets: ticketsResult.rows,
    }

    // Get chat sessions
    const chatsResult = await sql`
      SELECT id, status, started_at, ended_at
      FROM chat_sessions
      WHERE visitor_email = ${customerEmail}
      ORDER BY created_at DESC
    `
    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      chatSessions: chatsResult.rows,
    }

    // Get consent records
    const consentResult = await sql`
      SELECT consent_type, granted, source, created_at, revoked_at
      FROM consent_records
      WHERE customer_email = ${customerEmail}
      ORDER BY created_at DESC
    `
    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      consentRecords: consentResult.rows,
    }

    // Get reviews
    const reviewsResult = await sql`
      SELECT id, rating, title, content, status, created_at
      FROM reviews
      WHERE customer_email = ${customerEmail}
      ORDER BY created_at DESC
    `
    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      reviews: reviewsResult.rows,
    }

    // In production, you would upload this to secure storage
    // For now, we'll store it as a data URL (would be a real URL in production)
    const jsonData = JSON.stringify(exportData, null, 2)
    const resultUrl = `data:application/json;base64,${Buffer.from(jsonData).toString('base64')}`

    // Update the request with the result URL
    await sql`
      UPDATE privacy_requests
      SET
        result_url = ${resultUrl},
        status = 'completed',
        processed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${requestId}
    `

    return resultUrl
  })
}

/**
 * Process a data deletion request
 * Removes all customer data (right to be forgotten)
 */
export async function processDataDeletion(
  tenantId: string,
  requestId: string
): Promise<void> {
  return withTenant(tenantId, async () => {
    // Get the request
    const requestResult = await sql`
      SELECT customer_email, customer_id
      FROM privacy_requests
      WHERE id = ${requestId}
    `

    if (requestResult.rows.length === 0) {
      throw new Error('Request not found')
    }

    const reqRow = requestResult.rows[0] as Record<string, unknown>
    const customerEmail = reqRow.customer_email as string

    // Delete data from various tables
    // Order matters due to foreign key constraints

    // Delete chat messages via sessions
    await sql`
      DELETE FROM chat_messages
      WHERE session_id IN (
        SELECT id FROM chat_sessions WHERE visitor_email = ${customerEmail}
      )
    `

    // Delete chat sessions
    await sql`
      DELETE FROM chat_sessions
      WHERE visitor_email = ${customerEmail}
    `

    // Delete CSAT surveys
    await sql`
      DELETE FROM csat_surveys
      WHERE customer_email = ${customerEmail}
    `

    // Delete ticket comments
    await sql`
      DELETE FROM ticket_comments
      WHERE ticket_id IN (
        SELECT id FROM support_tickets WHERE customer_email = ${customerEmail}
      )
    `

    // Delete sentiment alerts
    await sql`
      DELETE FROM sentiment_alerts
      WHERE ticket_id IN (
        SELECT id FROM support_tickets WHERE customer_email = ${customerEmail}
      )
    `

    // Delete ticket audit log
    await sql`
      DELETE FROM ticket_audit_log
      WHERE ticket_id IN (
        SELECT id FROM support_tickets WHERE customer_email = ${customerEmail}
      )
    `

    // Delete support tickets
    await sql`
      DELETE FROM support_tickets
      WHERE customer_email = ${customerEmail}
    `

    // Anonymize orders (keep for accounting but remove PII)
    await sql`
      UPDATE orders
      SET
        customer_email = 'deleted@privacy.local',
        customer_name = 'Deleted Customer',
        shipping_address = NULL,
        billing_address = NULL,
        phone = NULL
      WHERE customer_email = ${customerEmail}
    `

    // Anonymize reviews
    await sql`
      UPDATE reviews
      SET
        customer_email = 'deleted@privacy.local',
        customer_name = 'Deleted Customer',
        author_name = 'Deleted'
      WHERE customer_email = ${customerEmail}
    `

    // Delete consent records
    await sql`
      DELETE FROM consent_records
      WHERE customer_email = ${customerEmail}
    `

    // Keep the privacy request itself as audit trail
    // but mark as completed
    await sql`
      UPDATE privacy_requests
      SET
        status = 'completed',
        processed_at = NOW(),
        notes = COALESCE(notes, '') || E'\nData deletion completed.',
        updated_at = NOW()
      WHERE id = ${requestId}
    `
  })
}

// ============================================
// CONSENT MANAGEMENT
// ============================================

/**
 * Record a consent decision
 */
export async function recordConsent(
  tenantId: string,
  data: RecordConsentInput
): Promise<ConsentRecord> {
  return withTenant(tenantId, async () => {
    // If revoking, update existing record
    if (!data.granted) {
      await sql`
        UPDATE consent_records
        SET revoked_at = NOW()
        WHERE customer_email = ${data.customerEmail}
          AND consent_type = ${data.consentType}
          AND revoked_at IS NULL
      `
    }

    // Always create a new record (immutable audit trail)
    const result = await sql`
      INSERT INTO consent_records (
        customer_email,
        customer_id,
        consent_type,
        granted,
        source,
        ip_address,
        user_agent
      ) VALUES (
        ${data.customerEmail},
        ${data.customerId ?? null},
        ${data.consentType},
        ${data.granted},
        ${data.source ?? null},
        ${data.ipAddress ?? null}::INET,
        ${data.userAgent ?? null}
      )
      RETURNING *
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    if (!row) {
      throw new Error('Failed to record consent')
    }
    return mapConsentRow(row)
  })
}

/**
 * Get consent records for a customer
 */
export async function getConsentRecords(
  tenantId: string,
  customerEmail: string
): Promise<ConsentRecord[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM consent_records
      WHERE customer_email = ${customerEmail}
      ORDER BY created_at DESC
    `

    return result.rows.map((r) => mapConsentRow(r as Record<string, unknown>))
  })
}

/**
 * Get active consent status for a customer
 */
export async function getActiveConsent(
  tenantId: string,
  customerEmail: string
): Promise<Record<ConsentType, boolean>> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT DISTINCT ON (consent_type)
        consent_type, granted
      FROM consent_records
      WHERE customer_email = ${customerEmail}
        AND revoked_at IS NULL
      ORDER BY consent_type, created_at DESC
    `

    const consent: Record<ConsentType, boolean> = {
      marketing: false,
      analytics: false,
      third_party: false,
      data_processing: false,
    }

    for (const r of result.rows) {
      const row = r as Record<string, unknown>
      consent[row.consent_type as ConsentType] = row.granted as boolean
    }

    return consent
  })
}

/**
 * Get consent records with filters
 */
export async function getConsentRecordsFiltered(
  tenantId: string,
  filters: ConsentFilters = {}
): Promise<{ records: ConsentRecord[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters.limit ?? 50
    const offset = ((filters.page ?? 1) - 1) * limit

    // Use conditional queries instead of dynamic SQL
    let countResult
    let recordsResult

    if (filters.customerEmail) {
      const emailPattern = `%${filters.customerEmail}%`
      countResult = await sql`
        SELECT COUNT(*) as count FROM consent_records WHERE customer_email ILIKE ${emailPattern}
      `
      recordsResult = await sql`
        SELECT * FROM consent_records
        WHERE customer_email ILIKE ${emailPattern}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.consentType) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM consent_records WHERE consent_type = ${filters.consentType}
      `
      recordsResult = await sql`
        SELECT * FROM consent_records
        WHERE consent_type = ${filters.consentType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.granted !== undefined) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM consent_records WHERE granted = ${filters.granted}
      `
      recordsResult = await sql`
        SELECT * FROM consent_records
        WHERE granted = ${filters.granted}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.active) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM consent_records WHERE revoked_at IS NULL
      `
      recordsResult = await sql`
        SELECT * FROM consent_records
        WHERE revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      // No filters - get all
      countResult = await sql`SELECT COUNT(*) as count FROM consent_records`
      recordsResult = await sql`
        SELECT * FROM consent_records
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countRow = countResult.rows[0] as Record<string, unknown> | undefined
    const total = parseInt((countRow?.count as string) ?? '0', 10)

    return {
      records: recordsResult.rows.map((r) => mapConsentRow(r as Record<string, unknown>)),
      total,
    }
  })
}

/**
 * Revoke a consent record
 */
export async function revokeConsent(
  tenantId: string,
  consentId: string
): Promise<ConsentRecord | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE consent_records
      SET revoked_at = NOW()
      WHERE id = ${consentId}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    return mapConsentRow(row)
  })
}

// ============================================
// COMPLIANCE
// ============================================

/**
 * Get overdue privacy requests
 */
export async function getOverdueRequests(tenantId: string): Promise<PrivacyRequest[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT *
      FROM privacy_requests
      WHERE status IN ('pending', 'processing')
        AND deadline_at < NOW()
      ORDER BY deadline_at ASC
    `

    return result.rows.map((r) => mapRequestRow(r as Record<string, unknown>))
  })
}

/**
 * Get requests approaching deadline (within X days)
 */
export async function getApproachingDeadlineRequests(
  tenantId: string,
  withinDays: number = 7
): Promise<PrivacyRequest[]> {
  return withTenant(tenantId, async () => {
    // Use parameterized interval
    const result = await sql`
      SELECT *
      FROM privacy_requests
      WHERE status IN ('pending', 'processing')
        AND deadline_at <= NOW() + (${withinDays} || ' days')::INTERVAL
        AND deadline_at >= NOW()
      ORDER BY deadline_at ASC
    `

    return result.rows.map((r) => mapRequestRow(r as Record<string, unknown>))
  })
}

/**
 * Get privacy request statistics
 */
export async function getPrivacyStats(tenantId: string): Promise<{
  pending: number
  processing: number
  completed: number
  rejected: number
  overdue: number
  avgProcessingDays: number | null
}> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND deadline_at < NOW()) as overdue,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 86400) FILTER (WHERE processed_at IS NOT NULL) as avg_processing_days
      FROM privacy_requests
    `

    const row = result.rows[0] as Record<string, unknown> | undefined
    return {
      pending: parseInt((row?.pending as string) ?? '0', 10),
      processing: parseInt((row?.processing as string) ?? '0', 10),
      completed: parseInt((row?.completed as string) ?? '0', 10),
      rejected: parseInt((row?.rejected as string) ?? '0', 10),
      overdue: parseInt((row?.overdue as string) ?? '0', 10),
      avgProcessingDays: row?.avg_processing_days
        ? parseFloat(row.avg_processing_days as string)
        : null,
    }
  })
}

// ============================================
// ROW MAPPERS
// ============================================

function mapRequestRow(row: Record<string, unknown>): PrivacyRequest {
  return {
    id: row.id as string,
    customerId: row.customer_id as string | null,
    customerEmail: row.customer_email as string,
    requestType: row.request_type as PrivacyRequestType,
    status: row.status as PrivacyRequestStatus,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
    verificationMethod: row.verification_method as VerificationMethod | null,
    processedBy: row.processed_by as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    resultUrl: row.result_url as string | null,
    rejectionReason: row.rejection_reason as string | null,
    notes: row.notes as string | null,
    deadlineAt: new Date(row.deadline_at as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapConsentRow(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    customerId: row.customer_id as string | null,
    customerEmail: row.customer_email as string,
    consentType: row.consent_type as ConsentType,
    granted: row.granted as boolean,
    source: row.source as string | null,
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    createdAt: new Date(row.created_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
  }
}

// Re-export utility functions
export {
  COMPLIANCE_DEADLINES,
  calculateDeadline,
  getDaysUntilDeadline,
  isRequestOverdue,
}
