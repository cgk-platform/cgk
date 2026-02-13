/**
 * E-Signature Library for Creator Portal
 *
 * Handles document signing workflow for creators including
 * viewing pending documents, signing, and audit logging.
 */

import { sql, withTenant } from '@cgk-platform/db'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'

import type {
  EsignDocument,
  EsignSigner,
  EsignField,
  EsignSignature,
  SigningSession,
  SignDocumentInput,
  DocumentStatus,
  SignerStatus,
  SignerRole,
  FieldType,
  SignatureType,
} from './types'

export type * from './types'

/**
 * Map database row to EsignDocument
 */
function mapRowToDocument(row: Record<string, unknown>): EsignDocument {
  return {
    id: row.id as string,
    templateId: (row.template_id as string) || null,
    creatorId: (row.creator_id as string) || null,
    name: row.name as string,
    fileUrl: row.file_url as string,
    signedFileUrl: (row.signed_file_url as string) || null,
    status: row.status as DocumentStatus,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    reminderEnabled: row.reminder_enabled as boolean,
    reminderDays: parseInt(row.reminder_days as string, 10) || 3,
    lastReminderAt: row.last_reminder_at ? new Date(row.last_reminder_at as string) : null,
    message: (row.message as string) || null,
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  }
}

/**
 * Map database row to EsignSigner
 */
function mapRowToSigner(row: Record<string, unknown>): EsignSigner {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as SignerRole,
    signingOrder: parseInt(row.signing_order as string, 10) || 1,
    status: row.status as SignerStatus,
    accessToken: (row.access_token as string) || null,
    isInternal: row.is_internal as boolean,
    ipAddress: (row.ip_address as string) || null,
    userAgent: (row.user_agent as string) || null,
    sentAt: row.sent_at ? new Date(row.sent_at as string) : null,
    viewedAt: row.viewed_at ? new Date(row.viewed_at as string) : null,
    signedAt: row.signed_at ? new Date(row.signed_at as string) : null,
    declinedAt: row.declined_at ? new Date(row.declined_at as string) : null,
    declineReason: (row.decline_reason as string) || null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Map database row to EsignField
 */
function mapRowToField(row: Record<string, unknown>): EsignField {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    signerId: (row.signer_id as string) || null,
    templateFieldId: (row.template_field_id as string) || null,
    type: row.type as FieldType,
    page: parseInt(row.page as string, 10),
    x: parseFloat(row.x as string),
    y: parseFloat(row.y as string),
    width: parseFloat(row.width as string),
    height: parseFloat(row.height as string),
    required: row.required as boolean,
    placeholder: (row.placeholder as string) || null,
    defaultValue: (row.default_value as string) || null,
    options: row.options,
    validation: row.validation,
    groupId: (row.group_id as string) || null,
    formula: (row.formula as string) || null,
    readOnly: row.read_only as boolean,
    value: (row.value as string) || null,
    filledAt: row.filled_at ? new Date(row.filled_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Map database row to EsignSignature
 */
function mapRowToSignature(row: Record<string, unknown>): EsignSignature {
  return {
    id: row.id as string,
    signerId: row.signer_id as string,
    type: row.type as SignatureType,
    imageUrl: row.image_url as string,
    fontName: (row.font_name as string) || null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Get pending signing requests for a creator
 */
export async function getPendingSigningRequests(
  tenantSlug: string,
  creatorEmail: string
): Promise<Array<EsignDocument & { signer: EsignSigner }>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        ed.*,
        es.id as signer_id,
        es.name as signer_name,
        es.email as signer_email,
        es.role as signer_role,
        es.signing_order,
        es.status as signer_status,
        es.access_token,
        es.is_internal,
        es.ip_address,
        es.user_agent,
        es.sent_at,
        es.viewed_at,
        es.signed_at,
        es.declined_at,
        es.decline_reason,
        es.created_at as signer_created_at
      FROM esign_documents ed
      INNER JOIN esign_signers es ON es.document_id = ed.id
      WHERE es.email = ${creatorEmail.toLowerCase()}
        AND es.status IN ('pending', 'sent', 'viewed')
        AND ed.status IN ('pending', 'in_progress')
      ORDER BY ed.created_at DESC
    `

    return result.rows.map((row) => {
      const record = row as Record<string, unknown>
      const document = mapRowToDocument(record)
      const signer: EsignSigner = {
        id: record.signer_id as string,
        documentId: document.id,
        name: record.signer_name as string,
        email: record.signer_email as string,
        role: record.signer_role as SignerRole,
        signingOrder: parseInt(record.signing_order as string, 10) || 1,
        status: record.signer_status as SignerStatus,
        accessToken: (record.access_token as string) || null,
        isInternal: record.is_internal as boolean,
        ipAddress: (record.ip_address as string) || null,
        userAgent: (record.user_agent as string) || null,
        sentAt: record.sent_at ? new Date(record.sent_at as string) : null,
        viewedAt: record.viewed_at ? new Date(record.viewed_at as string) : null,
        signedAt: record.signed_at ? new Date(record.signed_at as string) : null,
        declinedAt: record.declined_at ? new Date(record.declined_at as string) : null,
        declineReason: (record.decline_reason as string) || null,
        createdAt: new Date(record.signer_created_at as string),
      }
      return { ...document, signer }
    })
  })
}

/**
 * Get signed documents for a creator
 */
export async function getSignedDocuments(
  tenantSlug: string,
  creatorEmail: string
): Promise<Array<EsignDocument & { signer: EsignSigner }>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        ed.*,
        es.id as signer_id,
        es.name as signer_name,
        es.email as signer_email,
        es.role as signer_role,
        es.signing_order,
        es.status as signer_status,
        es.access_token,
        es.is_internal,
        es.ip_address,
        es.user_agent,
        es.sent_at,
        es.viewed_at,
        es.signed_at,
        es.declined_at,
        es.decline_reason,
        es.created_at as signer_created_at
      FROM esign_documents ed
      INNER JOIN esign_signers es ON es.document_id = ed.id
      WHERE es.email = ${creatorEmail.toLowerCase()}
        AND es.status = 'signed'
      ORDER BY es.signed_at DESC
    `

    return result.rows.map((row) => {
      const record = row as Record<string, unknown>
      const document = mapRowToDocument(record)
      const signer: EsignSigner = {
        id: record.signer_id as string,
        documentId: document.id,
        name: record.signer_name as string,
        email: record.signer_email as string,
        role: record.signer_role as SignerRole,
        signingOrder: parseInt(record.signing_order as string, 10) || 1,
        status: record.signer_status as SignerStatus,
        accessToken: (record.access_token as string) || null,
        isInternal: record.is_internal as boolean,
        ipAddress: (record.ip_address as string) || null,
        userAgent: (record.user_agent as string) || null,
        sentAt: record.sent_at ? new Date(record.sent_at as string) : null,
        viewedAt: record.viewed_at ? new Date(record.viewed_at as string) : null,
        signedAt: record.signed_at ? new Date(record.signed_at as string) : null,
        declinedAt: record.declined_at ? new Date(record.declined_at as string) : null,
        declineReason: (record.decline_reason as string) || null,
        createdAt: new Date(record.signer_created_at as string),
      }
      return { ...document, signer }
    })
  })
}

/**
 * Get document and signer by access token (for public signing page)
 */
export async function getSigningSessionByToken(
  tenantSlug: string,
  accessToken: string
): Promise<SigningSession | null> {
  return withTenant(tenantSlug, async () => {
    // Get signer by token
    const signerResult = await sql`
      SELECT * FROM esign_signers
      WHERE access_token = ${accessToken}
    `

    const signerRow = signerResult.rows[0]
    if (!signerRow) {
      return null
    }

    const signer = mapRowToSigner(signerRow as Record<string, unknown>)

    // Check if already signed or declined
    if (signer.status === 'signed' || signer.status === 'declined') {
      return null
    }

    // Get document
    const documentResult = await sql`
      SELECT * FROM esign_documents
      WHERE id = ${signer.documentId}
    `

    const documentRow = documentResult.rows[0]
    if (!documentRow) {
      return null
    }

    const document = mapRowToDocument(documentRow as Record<string, unknown>)

    // Check document status
    if (!['pending', 'in_progress'].includes(document.status)) {
      return null
    }

    // Check expiration
    if (document.expiresAt && document.expiresAt < new Date()) {
      return null
    }

    // Get fields for this signer
    const fieldsResult = await sql`
      SELECT * FROM esign_fields
      WHERE document_id = ${document.id}
        AND (signer_id = ${signer.id} OR signer_id IS NULL)
      ORDER BY page, y, x
    `

    const fields = fieldsResult.rows.map((row) => mapRowToField(row as Record<string, unknown>))

    // Get existing signature if any
    const signatureResult = await sql`
      SELECT * FROM esign_signatures
      WHERE signer_id = ${signer.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const existingSignature = signatureResult.rows[0]
      ? mapRowToSignature(signatureResult.rows[0] as Record<string, unknown>)
      : null

    // Mark as viewed if first time
    if (signer.status === 'pending' || signer.status === 'sent') {
      await sql`
        UPDATE esign_signers
        SET status = 'viewed', viewed_at = NOW()
        WHERE id = ${signer.id}
      `
      signer.status = 'viewed'
      signer.viewedAt = new Date()

      // Update document status if needed
      if (document.status === 'pending') {
        await sql`
          UPDATE esign_documents
          SET status = 'in_progress'
          WHERE id = ${document.id}
        `
        document.status = 'in_progress'
      }

      // Log audit event
      await logAuditEvent(tenantSlug, document.id, signer.id, 'viewed', signer.name)
    }

    return {
      document,
      signer,
      fields,
      existingSignature,
    }
  })
}

/**
 * Sign a document
 */
export async function signDocument(
  tenantSlug: string,
  accessToken: string,
  input: SignDocumentInput,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; document?: EsignDocument; error?: string }> {
  return withTenant(tenantSlug, async () => {
    // Get signing session
    const session = await getSigningSessionByToken(tenantSlug, accessToken)
    if (!session) {
      return { success: false, error: 'Invalid or expired signing link' }
    }

    const { document, signer, fields } = session

    // Validate required fields
    const requiredFields = fields.filter(
      (f) => f.required && f.signerId === signer.id && f.type !== 'signature'
    )
    for (const field of requiredFields) {
      const value = input.fieldValues?.[field.id]
      if (!value && field.type !== 'checkbox') {
        return { success: false, error: `Required field "${field.placeholder || field.type}" is missing` }
      }
    }

    // Save signature image
    const signatureId = `sig_${nanoid(16)}`
    let signatureUrl = ''

    if (input.signatureType === 'drawn' || input.signatureType === 'uploaded') {
      // Upload signature image to blob storage
      const base64Data = input.signatureData.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const blob = await put(
        `tenants/${tenantSlug}/signatures/${signatureId}.png`,
        buffer,
        {
          access: 'public',
          contentType: 'image/png',
          addRandomSuffix: false,
        }
      )
      signatureUrl = blob.url
    } else {
      // Typed signature - store the text (UI will render with font)
      signatureUrl = `text:${input.signatureData}`
    }

    // Create signature record
    await sql`
      INSERT INTO esign_signatures (id, signer_id, type, image_url, font_name)
      VALUES (${signatureId}, ${signer.id}, ${input.signatureType}, ${signatureUrl}, ${input.fontName || null})
    `

    // Update field values
    for (const field of fields) {
      if (field.signerId !== signer.id) continue

      let value: string | null = null

      if (field.type === 'signature' || field.type === 'initial') {
        value = signatureUrl
      } else if (field.type === 'date_signed') {
        value = new Date().toISOString()
      } else if (input.fieldValues?.[field.id]) {
        value = input.fieldValues[field.id] ?? null
      }

      if (value !== null) {
        await sql`
          UPDATE esign_fields
          SET value = ${value}, filled_at = NOW()
          WHERE id = ${field.id}
        `
      }
    }

    // Update signer status
    await sql`
      UPDATE esign_signers
      SET
        status = 'signed',
        signed_at = NOW(),
        ip_address = ${ipAddress},
        user_agent = ${userAgent}
      WHERE id = ${signer.id}
    `

    // Log audit event
    await logAuditEvent(tenantSlug, document.id, signer.id, 'signed', signer.name, {
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // Check if all signers have signed
    const pendingSignersResult = await sql`
      SELECT COUNT(*) as pending_count
      FROM esign_signers
      WHERE document_id = ${document.id}
        AND role = 'signer'
        AND status != 'signed'
    `
    const pendingCount = parseInt(pendingSignersResult.rows[0]?.pending_count as string, 10) || 0

    // Update document status
    if (pendingCount === 0) {
      await sql`
        UPDATE esign_documents
        SET status = 'completed', completed_at = NOW()
        WHERE id = ${document.id}
      `
      document.status = 'completed'
      document.completedAt = new Date()
    }

    // Get updated document
    const updatedResult = await sql`
      SELECT * FROM esign_documents WHERE id = ${document.id}
    `
    const updatedDocument = mapRowToDocument(updatedResult.rows[0] as Record<string, unknown>)

    return { success: true, document: updatedDocument }
  })
}

/**
 * Decline to sign a document
 */
export async function declineDocument(
  tenantSlug: string,
  accessToken: string,
  reason: string,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; error?: string }> {
  return withTenant(tenantSlug, async () => {
    // Get signer by token
    const signerResult = await sql`
      SELECT * FROM esign_signers
      WHERE access_token = ${accessToken}
    `

    const signerRow = signerResult.rows[0]
    if (!signerRow) {
      return { success: false, error: 'Invalid or expired signing link' }
    }

    const signer = mapRowToSigner(signerRow as Record<string, unknown>)

    if (signer.status === 'signed' || signer.status === 'declined') {
      return { success: false, error: 'Document has already been processed' }
    }

    // Update signer status
    await sql`
      UPDATE esign_signers
      SET
        status = 'declined',
        declined_at = NOW(),
        decline_reason = ${reason},
        ip_address = ${ipAddress},
        user_agent = ${userAgent}
      WHERE id = ${signer.id}
    `

    // Update document status
    await sql`
      UPDATE esign_documents
      SET status = 'declined'
      WHERE id = ${signer.documentId}
    `

    // Log audit event
    await logAuditEvent(tenantSlug, signer.documentId, signer.id, 'declined', signer.name, {
      reason,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    return { success: true }
  })
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  tenantSlug: string,
  documentId: string,
  signerId: string | null,
  action: string,
  performedBy: string,
  details: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const id = `audit_${nanoid(16)}`

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO esign_audit_log (
        id, document_id, signer_id, action, details, ip_address, user_agent, performed_by
      ) VALUES (
        ${id},
        ${documentId},
        ${signerId},
        ${action},
        ${JSON.stringify(details)},
        ${ipAddress || (details.ip_address as string | undefined) || null},
        ${userAgent || (details.user_agent as string | undefined) || null},
        ${performedBy}
      )
    `
  })
}

/**
 * Get audit log for a document
 */
export async function getDocumentAuditLog(
  tenantSlug: string,
  documentId: string
): Promise<Array<{
  id: string
  action: string
  details: unknown
  ipAddress: string | null
  userAgent: string | null
  performedBy: string
  createdAt: Date
}>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_audit_log
      WHERE document_id = ${documentId}
      ORDER BY created_at ASC
    `

    return result.rows.map((row) => {
      const record = row as Record<string, unknown>
      return {
        id: record.id as string,
        action: record.action as string,
        details: record.details,
        ipAddress: (record.ip_address as string) || null,
        userAgent: (record.user_agent as string) || null,
        performedBy: record.performed_by as string,
        createdAt: new Date(record.created_at as string),
      }
    })
  })
}
