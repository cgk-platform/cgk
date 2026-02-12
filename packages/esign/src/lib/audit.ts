/**
 * E-Sign Audit Trail
 * Tracks all actions on documents for compliance
 */

import { sql, withTenant } from '@cgk/db'
import { nanoid } from 'nanoid'

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'field_filled'
  | 'signed'
  | 'declined'
  | 'voided'
  | 'reminder_sent'
  | 'resent'
  | 'counter_signed'
  | 'in_person_started'
  | 'in_person_completed'
  | 'expired'
  | 'downloaded'
  | 'forwarded'

export interface AuditLogEntry {
  id: string
  document_id: string
  signer_id: string | null
  action: AuditAction
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  performed_by: string
  created_at: Date
}

export interface CreateAuditLogInput {
  document_id: string
  signer_id?: string
  action: AuditAction
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  performed_by: string
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

/**
 * Add an audit log entry
 */
export async function addAuditLogEntry(
  tenantSlug: string,
  input: CreateAuditLogInput
): Promise<AuditLogEntry> {
  const id = `audit_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_audit_log (
        id, document_id, signer_id, action, details,
        ip_address, user_agent, performed_by
      ) VALUES (
        ${id},
        ${input.document_id},
        ${input.signer_id || null},
        ${input.action},
        ${JSON.stringify(input.details || {})},
        ${input.ip_address || null},
        ${input.user_agent || null},
        ${input.performed_by}
      )
      RETURNING *
    `

    return result.rows[0] as AuditLogEntry
  })
}

/**
 * Get audit log for a document
 */
export async function getDocumentAuditLog(
  tenantSlug: string,
  documentId: string
): Promise<AuditLogEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_audit_log
      WHERE document_id = ${documentId}
      ORDER BY created_at DESC
    `

    return result.rows as AuditLogEntry[]
  })
}

/**
 * Get audit log for a signer
 */
export async function getSignerAuditLog(
  tenantSlug: string,
  signerId: string
): Promise<AuditLogEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_audit_log
      WHERE signer_id = ${signerId}
      ORDER BY created_at DESC
    `

    return result.rows as AuditLogEntry[]
  })
}

/**
 * Get recent audit entries across all documents
 */
export async function getRecentAuditLog(
  tenantSlug: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_audit_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows as AuditLogEntry[]
  })
}

/**
 * Get audit entries by action type
 */
export async function getAuditLogByAction(
  tenantSlug: string,
  action: AuditAction,
  limit = 50
): Promise<AuditLogEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_audit_log
      WHERE action = ${action}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows as AuditLogEntry[]
  })
}

// ============================================================================
// AUDIT HELPERS
// ============================================================================

/**
 * Log document creation
 */
export async function logDocumentCreated(
  tenantSlug: string,
  documentId: string,
  performedBy: string,
  details?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    action: 'created',
    details: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

/**
 * Log document sent
 */
export async function logDocumentSent(
  tenantSlug: string,
  documentId: string,
  performedBy: string,
  recipientEmails: string[]
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    action: 'sent',
    details: {
      recipients: recipientEmails,
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

/**
 * Log document viewed by signer
 */
export async function logDocumentViewed(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'viewed',
    ip_address: ipAddress,
    user_agent: userAgent,
    performed_by: signerId,
  })
}

/**
 * Log field filled
 */
export async function logFieldFilled(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  fieldId: string,
  fieldType: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'field_filled',
    details: {
      field_id: fieldId,
      field_type: fieldType,
      timestamp: new Date().toISOString(),
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    performed_by: signerId,
  })
}

/**
 * Log document signed
 */
export async function logDocumentSigned(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'signed',
    details: {
      timestamp: new Date().toISOString(),
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    performed_by: signerId,
  })
}

/**
 * Log document declined
 */
export async function logDocumentDeclined(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'declined',
    details: {
      reason,
      timestamp: new Date().toISOString(),
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    performed_by: signerId,
  })
}

/**
 * Log document voided
 */
export async function logDocumentVoided(
  tenantSlug: string,
  documentId: string,
  performedBy: string,
  reason?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    action: 'voided',
    details: {
      reason,
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

/**
 * Log reminder sent
 */
export async function logReminderSent(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  performedBy: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'reminder_sent',
    details: {
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

/**
 * Log document resent
 */
export async function logDocumentResent(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  performedBy: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'resent',
    details: {
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

/**
 * Log counter-signature
 */
export async function logCounterSigned(
  tenantSlug: string,
  documentId: string,
  signerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    signer_id: signerId,
    action: 'counter_signed',
    details: {
      timestamp: new Date().toISOString(),
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    performed_by: signerId,
  })
}

/**
 * Log document expiration
 */
export async function logDocumentExpired(
  tenantSlug: string,
  documentId: string
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    action: 'expired',
    details: {
      timestamp: new Date().toISOString(),
    },
    performed_by: 'system',
  })
}

/**
 * Log document download
 */
export async function logDocumentDownloaded(
  tenantSlug: string,
  documentId: string,
  performedBy: string,
  isSigned: boolean
): Promise<AuditLogEntry> {
  return addAuditLogEntry(tenantSlug, {
    document_id: documentId,
    action: 'downloaded',
    details: {
      is_signed: isSigned,
      timestamp: new Date().toISOString(),
    },
    performed_by: performedBy,
  })
}

// ============================================================================
// COMPLIANCE CERTIFICATE
// ============================================================================

export interface ComplianceCertificate {
  document_id: string
  document_name: string
  created_at: Date
  completed_at: Date | null
  signers: Array<{
    name: string
    email: string
    signed_at: Date | null
    ip_address: string | null
    user_agent: string | null
  }>
  audit_trail: AuditLogEntry[]
}

/**
 * Generate compliance certificate data for a document
 */
export async function generateComplianceCertificate(
  tenantSlug: string,
  documentId: string
): Promise<ComplianceCertificate | null> {
  return withTenant(tenantSlug, async () => {
    // Get document
    const docResult = await sql`
      SELECT id, name, created_at, completed_at
      FROM esign_documents
      WHERE id = ${documentId}
    `

    const doc = docResult.rows[0]
    if (!doc) return null

    // Get signers
    const signersResult = await sql`
      SELECT name, email, signed_at, ip_address, user_agent
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
      ORDER BY signing_order ASC
    `

    // Get audit log
    const auditResult = await sql`
      SELECT * FROM esign_audit_log
      WHERE document_id = ${documentId}
      ORDER BY created_at ASC
    `

    return {
      document_id: doc.id as string,
      document_name: doc.name as string,
      created_at: doc.created_at as Date,
      completed_at: doc.completed_at as Date | null,
      signers: signersResult.rows.map((s) => ({
        name: s.name as string,
        email: s.email as string,
        signed_at: s.signed_at as Date | null,
        ip_address: s.ip_address as string | null,
        user_agent: s.user_agent as string | null,
      })),
      audit_trail: auditResult.rows as AuditLogEntry[],
    }
  })
}
