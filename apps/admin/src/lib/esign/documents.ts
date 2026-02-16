/**
 * E-Signature Document Data Layer
 *
 * Functions for managing e-signature documents with tenant isolation.
 */

import { sql, withTenant } from '@cgk-platform/db'
import type {
  EsignDocument,
  EsignDocumentFilters,
  EsignDocumentWithSigners,
  EsignPendingDocuments,
  EsignSigner,
  EsignAuditLogEntry,
} from './types'

/**
 * Get documents with signers, filtered and paginated
 */
export async function getDocuments(
  tenantSlug: string,
  filters: EsignDocumentFilters = {},
  page = 1,
  limit = 20
): Promise<{ documents: EsignDocumentWithSigners[]; total: number }> {
  return withTenant(tenantSlug, async () => {
    const offset = (page - 1) * limit

    // Build query based on filters
    let result
    let countResult

    if (filters.status) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM esign_documents WHERE status = ${filters.status}
      `
      result = await sql`
        SELECT
          d.id, d.template_id as "templateId", d.creator_id as "creatorId",
          d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
          d.status, d.expires_at as "expiresAt", d.reminder_enabled as "reminderEnabled",
          d.reminder_days as "reminderDays", d.last_reminder_at as "lastReminderAt",
          d.message, d.created_by as "createdBy", d.created_at as "createdAt",
          d.updated_at as "updatedAt", d.completed_at as "completedAt",
          t.name as "templateName", c.name as "creatorName", c.email as "creatorEmail"
        FROM esign_documents d
        LEFT JOIN esign_templates t ON t.id = d.template_id
        LEFT JOIN creators c ON c.id = d.creator_id
        WHERE d.status = ${filters.status}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.templateId) {
      countResult = await sql`
        SELECT COUNT(*) as count FROM esign_documents WHERE template_id = ${filters.templateId}
      `
      result = await sql`
        SELECT
          d.id, d.template_id as "templateId", d.creator_id as "creatorId",
          d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
          d.status, d.expires_at as "expiresAt", d.reminder_enabled as "reminderEnabled",
          d.reminder_days as "reminderDays", d.last_reminder_at as "lastReminderAt",
          d.message, d.created_by as "createdBy", d.created_at as "createdAt",
          d.updated_at as "updatedAt", d.completed_at as "completedAt",
          t.name as "templateName", c.name as "creatorName", c.email as "creatorEmail"
        FROM esign_documents d
        LEFT JOIN esign_templates t ON t.id = d.template_id
        LEFT JOIN creators c ON c.id = d.creator_id
        WHERE d.template_id = ${filters.templateId}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (filters.search) {
      const searchPattern = `%${filters.search}%`
      countResult = await sql`
        SELECT COUNT(*) as count FROM esign_documents d
        WHERE d.name ILIKE ${searchPattern}
      `
      result = await sql`
        SELECT
          d.id, d.template_id as "templateId", d.creator_id as "creatorId",
          d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
          d.status, d.expires_at as "expiresAt", d.reminder_enabled as "reminderEnabled",
          d.reminder_days as "reminderDays", d.last_reminder_at as "lastReminderAt",
          d.message, d.created_by as "createdBy", d.created_at as "createdAt",
          d.updated_at as "updatedAt", d.completed_at as "completedAt",
          t.name as "templateName", c.name as "creatorName", c.email as "creatorEmail"
        FROM esign_documents d
        LEFT JOIN esign_templates t ON t.id = d.template_id
        LEFT JOIN creators c ON c.id = d.creator_id
        WHERE d.name ILIKE ${searchPattern}
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      countResult = await sql`SELECT COUNT(*) as count FROM esign_documents`
      result = await sql`
        SELECT
          d.id, d.template_id as "templateId", d.creator_id as "creatorId",
          d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
          d.status, d.expires_at as "expiresAt", d.reminder_enabled as "reminderEnabled",
          d.reminder_days as "reminderDays", d.last_reminder_at as "lastReminderAt",
          d.message, d.created_by as "createdBy", d.created_at as "createdAt",
          d.updated_at as "updatedAt", d.completed_at as "completedAt",
          t.name as "templateName", c.name as "creatorName", c.email as "creatorEmail"
        FROM esign_documents d
        LEFT JOIN esign_templates t ON t.id = d.template_id
        LEFT JOIN creators c ON c.id = d.creator_id
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const total = Number(countResult.rows[0]?.count || 0)

    // No documents - return early
    if (result.rows.length === 0) {
      return { documents: [], total }
    }

    // Get all document IDs for batch signer query (eliminates N+1)
    const docIds = result.rows.map((row) => row.id as string)

    // Single query to get all signers for all documents
    const signerResult = await sql`
      SELECT
        id, document_id as "documentId", name, email, role,
        signing_order as "signingOrder", status, access_token as "accessToken",
        is_internal as "isInternal", ip_address as "ipAddress",
        user_agent as "userAgent", sent_at as "sentAt", viewed_at as "viewedAt",
        signed_at as "signedAt", declined_at as "declinedAt",
        decline_reason as "declineReason", created_at as "createdAt"
      FROM esign_signers
      WHERE document_id = ANY(${`{${docIds.join(',')}}`}::text[])
      ORDER BY document_id, signing_order ASC
    `

    // Group signers by document ID
    const signersByDoc = new Map<string, EsignSigner[]>()
    for (const signer of signerResult.rows) {
      const s = signer as unknown as EsignSigner
      if (!signersByDoc.has(s.documentId)) {
        signersByDoc.set(s.documentId, [])
      }
      signersByDoc.get(s.documentId)!.push(s)
    }

    // Build documents with their signers
    const documents: EsignDocumentWithSigners[] = result.rows.map((row) => ({
      ...(row as unknown as EsignDocumentWithSigners),
      signers: signersByDoc.get(row.id as string) || [],
    }))

    return { documents, total }
  })
}

/**
 * Get a single document with signers
 */
export async function getDocumentWithSigners(
  tenantSlug: string,
  documentId: string
): Promise<EsignDocumentWithSigners | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        d.id, d.template_id as "templateId", d.creator_id as "creatorId",
        d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
        d.status, d.expires_at as "expiresAt", d.reminder_enabled as "reminderEnabled",
        d.reminder_days as "reminderDays", d.last_reminder_at as "lastReminderAt",
        d.message, d.created_by as "createdBy", d.created_at as "createdAt",
        d.updated_at as "updatedAt", d.completed_at as "completedAt",
        t.name as "templateName", c.name as "creatorName", c.email as "creatorEmail"
      FROM esign_documents d
      LEFT JOIN esign_templates t ON t.id = d.template_id
      LEFT JOIN creators c ON c.id = d.creator_id
      WHERE d.id = ${documentId}
    `

    if (result.rows.length === 0) {
      return null
    }

    const doc = result.rows[0]

    const signerResult = await sql`
      SELECT
        id, document_id as "documentId", name, email, role,
        signing_order as "signingOrder", status, access_token as "accessToken",
        is_internal as "isInternal", ip_address as "ipAddress",
        user_agent as "userAgent", sent_at as "sentAt", viewed_at as "viewedAt",
        signed_at as "signedAt", declined_at as "declinedAt",
        decline_reason as "declineReason", created_at as "createdAt"
      FROM esign_signers
      WHERE document_id = ${documentId}
      ORDER BY signing_order ASC
    `

    return {
      ...(doc as unknown as EsignDocumentWithSigners),
      signers: signerResult.rows as unknown as EsignSigner[],
    }
  })
}

/**
 * Get pending documents categorized
 */
export async function getPendingDocuments(
  tenantSlug: string,
  currentUserEmail: string
): Promise<EsignPendingDocuments> {
  return withTenant(tenantSlug, async () => {
    // Awaiting your signature (counter-sign queue for this user)
    const awaitingResult = await sql`
      SELECT DISTINCT d.*
      FROM esign_documents d
      JOIN esign_signers s ON s.document_id = d.id
      WHERE s.email = ${currentUserEmail}
        AND s.is_internal = true
        AND s.status = 'pending'
        AND d.status IN ('pending', 'in_progress')
      ORDER BY d.created_at DESC
    `

    // Overdue (past expiration)
    const overdueResult = await sql`
      SELECT d.*
      FROM esign_documents d
      WHERE d.expires_at < NOW()
        AND d.status IN ('pending', 'in_progress')
      ORDER BY d.expires_at ASC
    `

    // Expiring soon (within 3 days)
    const expiringSoonResult = await sql`
      SELECT d.*
      FROM esign_documents d
      WHERE d.expires_at > NOW()
        AND d.expires_at <= NOW() + INTERVAL '3 days'
        AND d.status IN ('pending', 'in_progress')
      ORDER BY d.expires_at ASC
    `

    // Stale (no activity in 7+ days)
    const staleResult = await sql`
      SELECT d.*
      FROM esign_documents d
      WHERE d.updated_at < NOW() - INTERVAL '7 days'
        AND d.status IN ('pending', 'in_progress')
      ORDER BY d.updated_at ASC
    `

    // Collect all unique document IDs from all result sets (eliminates N+1)
    const allDocs = [
      ...awaitingResult.rows,
      ...overdueResult.rows,
      ...expiringSoonResult.rows,
      ...staleResult.rows,
    ] as Array<{ id: string } & Record<string, unknown>>

    const allDocIds = [...new Set(allDocs.map((doc) => doc.id))]

    // Single query to get all signers for all documents
    let signersByDoc = new Map<string, EsignSigner[]>()
    if (allDocIds.length > 0) {
      const signerResult = await sql`
        SELECT
          id, document_id as "documentId", name, email, role,
          signing_order as "signingOrder", status, is_internal as "isInternal",
          sent_at as "sentAt", viewed_at as "viewedAt", signed_at as "signedAt",
          created_at as "createdAt"
        FROM esign_signers
        WHERE document_id = ANY(${`{${allDocIds.join(',')}}`}::text[])
        ORDER BY document_id, signing_order ASC
      `

      // Group signers by document ID
      for (const signer of signerResult.rows) {
        const s = signer as unknown as EsignSigner
        if (!signersByDoc.has(s.documentId)) {
          signersByDoc.set(s.documentId, [])
        }
        signersByDoc.get(s.documentId)!.push(s)
      }
    }

    // Helper to attach signers to documents (no additional queries)
    const attachSigners = (
      docs: Array<{ id: string } & Record<string, unknown>>
    ): EsignDocumentWithSigners[] =>
      docs.map((doc) => ({
        ...(doc as unknown as EsignDocument),
        signers: signersByDoc.get(doc.id) || [],
      }))

    return {
      awaitingYourSignature: attachSigners(awaitingResult.rows as Array<{ id: string } & Record<string, unknown>>),
      overdue: attachSigners(overdueResult.rows as Array<{ id: string } & Record<string, unknown>>),
      expiringSoon: attachSigners(expiringSoonResult.rows as Array<{ id: string } & Record<string, unknown>>),
      stale: attachSigners(staleResult.rows as Array<{ id: string } & Record<string, unknown>>),
    }
  })
}

/**
 * Get counter-sign queue (documents waiting for internal signature)
 */
export async function getCounterSignQueue(
  tenantSlug: string,
  _adminEmail: string
): Promise<EsignDocumentWithSigners[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT
        d.id, d.template_id as "templateId", d.creator_id as "creatorId",
        d.name, d.file_url as "fileUrl", d.signed_file_url as "signedFileUrl",
        d.status, d.expires_at as "expiresAt", d.message,
        d.created_by as "createdBy", d.created_at as "createdAt",
        d.updated_at as "updatedAt", d.completed_at as "completedAt"
      FROM esign_documents d
      JOIN esign_signers s ON s.document_id = d.id
      WHERE s.is_internal = true
        AND s.status = 'pending'
        AND d.status IN ('pending', 'in_progress')
      ORDER BY d.created_at ASC
    `

    // No documents - return early
    if (result.rows.length === 0) {
      return []
    }

    // Get all document IDs for batch signer query (eliminates N+1)
    const docIds = result.rows.map((row) => row.id as string)

    // Single query to get all signers for all documents
    const signerResult = await sql`
      SELECT
        id, document_id as "documentId", name, email, role,
        signing_order as "signingOrder", status, is_internal as "isInternal",
        sent_at as "sentAt", viewed_at as "viewedAt", signed_at as "signedAt",
        created_at as "createdAt"
      FROM esign_signers
      WHERE document_id = ANY(${`{${docIds.join(',')}}`}::text[])
      ORDER BY document_id, signing_order ASC
    `

    // Group signers by document ID
    const signersByDoc = new Map<string, EsignSigner[]>()
    for (const signer of signerResult.rows) {
      const s = signer as unknown as EsignSigner
      if (!signersByDoc.has(s.documentId)) {
        signersByDoc.set(s.documentId, [])
      }
      signersByDoc.get(s.documentId)!.push(s)
    }

    // Build documents with their signers
    const documents: EsignDocumentWithSigners[] = result.rows.map((row) => ({
      ...(row as unknown as EsignDocument),
      signers: signersByDoc.get(row.id as string) || [],
    }))

    return documents
  })
}

/**
 * Get audit log for a document
 */
export async function getDocumentAuditLog(
  tenantSlug: string,
  documentId: string
): Promise<EsignAuditLogEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, document_id as "documentId", signer_id as "signerId",
        action, details, ip_address as "ipAddress",
        user_agent as "userAgent", performed_by as "performedBy",
        created_at as "createdAt"
      FROM esign_audit_log
      WHERE document_id = ${documentId}
      ORDER BY created_at DESC
    `
    return result.rows as unknown as EsignAuditLogEntry[]
  })
}

/**
 * Add audit log entry
 */
export async function addAuditLogEntry(
  tenantSlug: string,
  entry: {
    documentId: string
    signerId?: string
    action: string
    details?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    performedBy: string
  }
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO esign_audit_log (
        document_id, signer_id, action, details, ip_address, user_agent, performed_by
      ) VALUES (
        ${entry.documentId},
        ${entry.signerId || null},
        ${entry.action},
        ${JSON.stringify(entry.details || {})},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.performedBy}
      )
    `
  })
}

/**
 * Resend document to pending signers
 */
export async function resendDocument(
  tenantSlug: string,
  documentId: string,
  signerId?: string
): Promise<{ success: boolean; sentTo: string[] }> {
  return withTenant(tenantSlug, async () => {
    let result
    if (signerId) {
      result = await sql`
        UPDATE esign_signers
        SET sent_at = NOW()
        WHERE document_id = ${documentId} AND id = ${signerId} AND status = 'pending'
        RETURNING email
      `
    } else {
      result = await sql`
        UPDATE esign_signers
        SET sent_at = NOW()
        WHERE document_id = ${documentId} AND status = 'pending'
        RETURNING email
      `
    }

    const sentTo = result.rows.map((r) => r.email as string)
    return { success: sentTo.length > 0, sentTo }
  })
}

/**
 * Void a document
 */
export async function voidDocument(
  tenantSlug: string,
  documentId: string,
  reason?: string,
  performedBy?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_documents
      SET status = 'voided', updated_at = NOW()
      WHERE id = ${documentId}
        AND status NOT IN ('completed', 'voided')
      RETURNING id
    `

    if (result.rows.length > 0 && performedBy) {
      await addAuditLogEntry(tenantSlug, {
        documentId,
        action: 'voided',
        details: { reason },
        performedBy,
      })
    }

    return result.rows.length > 0
  })
}

/**
 * Mark document as completed
 */
export async function markDocumentCompleted(
  tenantSlug: string,
  documentId: string,
  signedFileUrl: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_documents
      SET status = 'completed',
          signed_file_url = ${signedFileUrl},
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = ${documentId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Get signer by access token
 */
export async function getSignerByToken(
  tenantSlug: string,
  accessToken: string
): Promise<EsignSigner | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, document_id as "documentId", name, email, role,
        signing_order as "signingOrder", status, access_token as "accessToken",
        is_internal as "isInternal", ip_address as "ipAddress",
        user_agent as "userAgent", sent_at as "sentAt", viewed_at as "viewedAt",
        signed_at as "signedAt", declined_at as "declinedAt",
        decline_reason as "declineReason", created_at as "createdAt"
      FROM esign_signers
      WHERE access_token = ${accessToken}
    `
    return result.rows.length > 0 ? (result.rows[0] as unknown as EsignSigner) : null
  })
}

/**
 * Mark signer as signed
 */
export async function markSignerSigned(
  tenantSlug: string,
  signerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_signers
      SET status = 'signed',
          signed_at = NOW(),
          ip_address = COALESCE(${ipAddress || null}, ip_address),
          user_agent = COALESCE(${userAgent || null}, user_agent)
      WHERE id = ${signerId}
      RETURNING document_id as "documentId"
    `

    const row = result.rows[0]
    if (row) {
      const documentId = row.documentId as string
      // Check if all signers have signed
      const pendingResult = await sql`
        SELECT COUNT(*) as count
        FROM esign_signers
        WHERE document_id = ${documentId}
          AND role = 'signer'
          AND status != 'signed'
      `
      const pendingCount = Number(pendingResult.rows[0]?.count || 0)

      if (pendingCount === 0) {
        // All signed - update document status
        await sql`
          UPDATE esign_documents
          SET status = 'completed', completed_at = NOW(), updated_at = NOW()
          WHERE id = ${documentId}
        `
      } else {
        // Still in progress
        await sql`
          UPDATE esign_documents
          SET status = 'in_progress', updated_at = NOW()
          WHERE id = ${documentId} AND status = 'pending'
        `
      }
    }

    return result.rows.length > 0
  })
}
