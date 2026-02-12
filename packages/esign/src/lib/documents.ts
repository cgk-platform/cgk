/**
 * E-Sign Document Database Operations
 * CRUD operations for signing documents with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'
import { nanoid } from 'nanoid'
import type {
  EsignDocument,
  EsignTemplate,
  EsignSigner,
  EsignField,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentStatus,
  DocumentWithSigners,
  ListDocumentsOptions,
  FieldValidation,
  FieldOption,
} from '../types.js'
import { DOCUMENT_DEFAULTS } from '../constants.js'

// ============================================================================
// HELPER: Parse field decimals
// ============================================================================

function parseFieldDecimals(field: Record<string, unknown>): EsignField {
  return {
    ...field,
    x: parseFloat(String(field.x)),
    y: parseFloat(String(field.y)),
    width: parseFloat(String(field.width)),
    height: parseFloat(String(field.height)),
    page: parseInt(String(field.page), 10),
    options: field.options as FieldOption[] | null,
    validation: (field.validation || {}) as FieldValidation,
  } as EsignField
}

// ============================================================================
// DOCUMENT CRUD OPERATIONS
// ============================================================================

/**
 * Create a new document
 */
export async function createDocument(
  tenantSlug: string,
  input: CreateDocumentInput
): Promise<EsignDocument> {
  const id = `doc_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_documents (
        id, template_id, creator_id, name, file_url, expires_at,
        reminder_enabled, reminder_days, message, created_by
      ) VALUES (
        ${id},
        ${input.template_id || null},
        ${input.creator_id || null},
        ${input.name},
        ${input.file_url},
        ${input.expires_at?.toISOString() || null},
        ${input.reminder_enabled ?? true},
        ${input.reminder_days ?? DOCUMENT_DEFAULTS.REMINDER_DAYS},
        ${input.message || null},
        ${input.created_by}
      )
      RETURNING *
    `

    return result.rows[0] as EsignDocument
  })
}

/**
 * Get a document by ID
 */
export async function getDocument(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_documents WHERE id = ${id}
    `

    return (result.rows[0] as EsignDocument) || null
  })
}

/**
 * Get a document with all related data (signers, fields, template)
 */
export async function getDocumentWithSigners(
  tenantSlug: string,
  id: string
): Promise<DocumentWithSigners | null> {
  return withTenant(tenantSlug, async () => {
    const docResult = await sql`
      SELECT * FROM esign_documents WHERE id = ${id}
    `

    if (docResult.rows.length === 0) return null

    const document = docResult.rows[0] as EsignDocument

    // Get signers
    const signersResult = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${id}
      ORDER BY signing_order ASC, created_at ASC
    `

    // Get fields
    const fieldsResult = await sql`
      SELECT * FROM esign_fields
      WHERE document_id = ${id}
      ORDER BY page ASC, y ASC, x ASC
    `

    // Get template if linked
    let template: EsignTemplate | null = null
    if (document.template_id) {
      const templateResult = await sql`
        SELECT * FROM esign_templates WHERE id = ${document.template_id}
      `
      template = (templateResult.rows[0] as EsignTemplate) || null
    }

    return {
      ...document,
      signers: signersResult.rows as EsignSigner[],
      fields: fieldsResult.rows.map(parseFieldDecimals),
      template,
    }
  })
}

/**
 * List documents with optional filtering
 */
export async function listDocuments(
  tenantSlug: string,
  options?: ListDocumentsOptions
): Promise<{ documents: DocumentWithSigners[]; total: number }> {
  const { status = 'all', creatorId, createdBy, limit = 50, offset = 0, search } = options || {}

  return withTenant(tenantSlug, async () => {
    // Build conditions
    const conditions: string[] = []
    if (status !== 'all') {
      conditions.push(`d.status = '${status}'`)
    }
    if (creatorId) {
      conditions.push(`d.creator_id = '${creatorId}'`)
    }
    if (createdBy) {
      conditions.push(`d.created_by = '${createdBy}'`)
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "''")
      conditions.push(`(d.name ILIKE '%${escapedSearch}%')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM esign_documents d ${whereClause}`
    const countResult = await sql.query(countQuery)
    const total = parseInt(countResult.rows[0].count, 10)

    // Get documents
    const query = `
      SELECT d.*,
        t.name as template_name,
        (SELECT COUNT(*) FROM esign_signers WHERE document_id = d.id) as signer_count,
        (SELECT COUNT(*) FROM esign_signers WHERE document_id = d.id AND status = 'signed') as signed_count
      FROM esign_documents d
      LEFT JOIN esign_templates t ON t.id = d.template_id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const result = await sql.query(query)

    // Fetch full signer/field data for each document
    const documents: DocumentWithSigners[] = []
    for (const row of result.rows) {
      const fullDoc = await getDocumentWithSigners(tenantSlug, row.id as string)
      if (fullDoc) {
        documents.push(fullDoc)
      }
    }

    return { documents, total }
  })
}

/**
 * Update a document
 */
export async function updateDocument(
  tenantSlug: string,
  id: string,
  input: UpdateDocumentInput
): Promise<EsignDocument | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(input.name)
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(input.status)
    }
    if (input.signed_file_url !== undefined) {
      updates.push(`signed_file_url = $${paramIndex++}`)
      values.push(input.signed_file_url)
    }
    if (input.expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`)
      values.push(input.expires_at.toISOString())
    }
    if (input.reminder_enabled !== undefined) {
      updates.push(`reminder_enabled = $${paramIndex++}`)
      values.push(input.reminder_enabled)
    }
    if (input.reminder_days !== undefined) {
      updates.push(`reminder_days = $${paramIndex++}`)
      values.push(input.reminder_days)
    }
    if (input.message !== undefined) {
      updates.push(`message = $${paramIndex++}`)
      values.push(input.message)
    }
    if (input.completed_at !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`)
      values.push(input.completed_at.toISOString())
    }

    if (updates.length === 0) {
      return getDocument(tenantSlug, id)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE esign_documents
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    return (result.rows[0] as EsignDocument) || null
  })
}

/**
 * Delete a document (cascades to signers, fields)
 */
export async function deleteDocument(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_documents WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Mark document as pending (ready to send)
 */
export async function markDocumentPending(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, { status: 'pending' })
}

/**
 * Mark document as in progress (at least one signer has viewed)
 */
export async function markDocumentInProgress(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, { status: 'in_progress' })
}

/**
 * Mark document as completed
 */
export async function markDocumentCompleted(
  tenantSlug: string,
  id: string,
  signedFileUrl: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, {
    status: 'completed',
    signed_file_url: signedFileUrl,
    completed_at: new Date(),
  })
}

/**
 * Mark document as declined
 */
export async function markDocumentDeclined(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, { status: 'declined' })
}

/**
 * Void a document
 */
export async function voidDocument(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, { status: 'voided' })
}

/**
 * Mark document as expired
 */
export async function expireDocument(
  tenantSlug: string,
  id: string
): Promise<EsignDocument | null> {
  return updateDocument(tenantSlug, id, { status: 'expired' })
}

/**
 * Update last reminder sent timestamp
 */
export async function updateLastReminder(
  tenantSlug: string,
  id: string
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE esign_documents
      SET last_reminder_at = NOW()
      WHERE id = ${id}
    `
  })
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get documents pending reminders
 */
export async function getDocumentsNeedingReminders(
  tenantSlug: string
): Promise<EsignDocument[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT d.* FROM esign_documents d
      WHERE d.status IN ('pending', 'in_progress')
        AND d.reminder_enabled = true
        AND (
          d.last_reminder_at IS NULL
          OR d.last_reminder_at < NOW() - INTERVAL '1 day' * d.reminder_days
        )
        AND (d.expires_at IS NULL OR d.expires_at > NOW())
      ORDER BY d.created_at ASC
    `

    return result.rows as EsignDocument[]
  })
}

/**
 * Get expired documents that need status update
 */
export async function getExpiredDocuments(
  tenantSlug: string
): Promise<EsignDocument[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_documents
      WHERE status IN ('pending', 'in_progress', 'draft')
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `

    return result.rows as EsignDocument[]
  })
}

/**
 * Get documents for a specific creator
 */
export async function getCreatorDocuments(
  tenantSlug: string,
  creatorId: string
): Promise<DocumentWithSigners[]> {
  const { documents } = await listDocuments(tenantSlug, { creatorId })
  return documents
}

/**
 * Get document counts by status
 */
export async function getDocumentCounts(
  tenantSlug: string
): Promise<Record<DocumentStatus, number>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT status, COUNT(*) as count
      FROM esign_documents
      GROUP BY status
    `

    const counts: Record<string, number> = {
      draft: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      declined: 0,
      voided: 0,
      expired: 0,
    }

    for (const row of result.rows) {
      counts[row.status as string] = parseInt(row.count as string, 10)
    }

    return counts as Record<DocumentStatus, number>
  })
}

/**
 * Check if all signers have signed
 */
export async function checkAllSignersSigned(
  tenantSlug: string,
  documentId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
    `

    const row = result.rows[0]
    if (!row) return false
    const total = parseInt(row.total as string, 10)
    const signed = parseInt(row.signed as string, 10)
    return total > 0 && total === signed
  })
}

/**
 * Get e-sign statistics for dashboard
 */
export async function getEsignStats(
  tenantSlug: string
): Promise<{
  totalDocuments: number
  pendingDocuments: number
  completedDocuments: number
  completionRate: number
  averageCompletionTime: number | null
  recentActivity: Array<{
    documentId: string
    documentName: string
    status: DocumentStatus
    updatedAt: Date
  }>
}> {
  return withTenant(tenantSlug, async () => {
    // Get document counts
    const counts = await getDocumentCounts(tenantSlug)
    const totalDocuments = Object.values(counts).reduce((a, b) => a + b, 0)
    const pendingDocuments = counts.pending + counts.in_progress
    const completedDocuments = counts.completed

    // Calculate completion rate
    const relevantTotal = totalDocuments - counts.draft - counts.voided
    const completionRate = relevantTotal > 0 ? (completedDocuments / relevantTotal) * 100 : 0

    // Get average completion time (in days)
    const avgTimeResult = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg_days
      FROM esign_documents
      WHERE status = 'completed' AND completed_at IS NOT NULL
    `
    const averageCompletionTime = avgTimeResult.rows[0]?.avg_days
      ? parseFloat(avgTimeResult.rows[0].avg_days as string)
      : null

    // Get recent activity
    const recentResult = await sql`
      SELECT id, name, status, updated_at
      FROM esign_documents
      WHERE status IN ('pending', 'in_progress', 'completed', 'declined')
      ORDER BY updated_at DESC
      LIMIT 10
    `

    return {
      totalDocuments,
      pendingDocuments,
      completedDocuments,
      completionRate: Math.round(completionRate * 10) / 10,
      averageCompletionTime: averageCompletionTime ? Math.round(averageCompletionTime * 10) / 10 : null,
      recentActivity: recentResult.rows.map((row) => ({
        documentId: row.id as string,
        documentName: row.name as string,
        status: row.status as DocumentStatus,
        updatedAt: row.updated_at as Date,
      })),
    }
  })
}
