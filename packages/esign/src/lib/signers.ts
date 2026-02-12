/**
 * E-Sign Signer Database Operations
 * CRUD operations for document signers with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'
import { nanoid } from 'nanoid'
import type { EsignSigner, CreateSignerInput, UpdateSignerInput, SignerStatus } from '../types.js'
import { DOCUMENT_DEFAULTS } from '../constants.js'

// ============================================================================
// SIGNER CRUD OPERATIONS
// ============================================================================

/**
 * Create a new signer for a document
 */
export async function createSigner(
  tenantSlug: string,
  input: CreateSignerInput
): Promise<EsignSigner> {
  const id = `signer_${nanoid(12)}`
  const accessToken = input.access_token || nanoid(DOCUMENT_DEFAULTS.TOKEN_LENGTH)
  const isInternal = input.is_internal || false

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_signers (
        id, document_id, name, email, role, signing_order, access_token, is_internal
      ) VALUES (
        ${id},
        ${input.document_id},
        ${input.name},
        ${input.email},
        ${input.role || 'signer'},
        ${input.signing_order || 1},
        ${accessToken},
        ${isInternal}
      )
      RETURNING *
    `

    return result.rows[0] as EsignSigner
  })
}

/**
 * Get a signer by ID
 */
export async function getSigner(
  tenantSlug: string,
  id: string
): Promise<EsignSigner | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signers WHERE id = ${id}
    `

    return (result.rows[0] as EsignSigner) || null
  })
}

/**
 * Get a signer by access token
 * Note: This is called during signing flow, needs to work across tenants
 * The signing URL contains the token, and we need to find which tenant it belongs to
 */
export async function getSignerByToken(
  tenantSlug: string,
  accessToken: string
): Promise<EsignSigner | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signers WHERE access_token = ${accessToken}
    `

    return (result.rows[0] as EsignSigner) || null
  })
}

/**
 * Get all signers for a document
 */
export async function getDocumentSigners(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${documentId}
      ORDER BY signing_order ASC, created_at ASC
    `

    return result.rows as EsignSigner[]
  })
}

/**
 * Update a signer
 */
export async function updateSigner(
  tenantSlug: string,
  id: string,
  input: UpdateSignerInput
): Promise<EsignSigner | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(input.name)
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(input.email)
    }
    if (input.role !== undefined) {
      updates.push(`role = $${paramIndex++}`)
      values.push(input.role)
    }
    if (input.signing_order !== undefined) {
      updates.push(`signing_order = $${paramIndex++}`)
      values.push(input.signing_order)
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(input.status)
    }
    if (input.ip_address !== undefined) {
      updates.push(`ip_address = $${paramIndex++}`)
      values.push(input.ip_address)
    }
    if (input.user_agent !== undefined) {
      updates.push(`user_agent = $${paramIndex++}`)
      values.push(input.user_agent)
    }
    if (input.signed_at !== undefined) {
      updates.push(`signed_at = $${paramIndex++}`)
      values.push(input.signed_at.toISOString())
    }
    if (input.declined_at !== undefined) {
      updates.push(`declined_at = $${paramIndex++}`)
      values.push(input.declined_at.toISOString())
    }
    if (input.decline_reason !== undefined) {
      updates.push(`decline_reason = $${paramIndex++}`)
      values.push(input.decline_reason)
    }
    if (input.viewed_at !== undefined) {
      updates.push(`viewed_at = $${paramIndex++}`)
      values.push(input.viewed_at.toISOString())
    }
    if (input.sent_at !== undefined) {
      updates.push(`sent_at = $${paramIndex++}`)
      values.push(input.sent_at.toISOString())
    }

    if (updates.length === 0) {
      return getSigner(tenantSlug, id)
    }

    values.push(id)

    const query = `
      UPDATE esign_signers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    return (result.rows[0] as EsignSigner) || null
  })
}

/**
 * Delete a signer
 */
export async function deleteSigner(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_signers WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

/**
 * Mark signer as sent (email sent)
 */
export async function markSignerSent(
  tenantSlug: string,
  id: string
): Promise<EsignSigner | null> {
  return updateSigner(tenantSlug, id, {
    status: 'sent',
    sent_at: new Date(),
  })
}

/**
 * Mark signer as viewed (opened signing page)
 */
export async function markSignerViewed(
  tenantSlug: string,
  id: string,
  ipAddress?: string,
  userAgent?: string
): Promise<EsignSigner | null> {
  const signer = await getSigner(tenantSlug, id)
  if (!signer) return null

  // Only update viewed_at if not already viewed
  if (signer.viewed_at) {
    return signer
  }

  return updateSigner(tenantSlug, id, {
    status: 'viewed',
    viewed_at: new Date(),
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

/**
 * Mark signer as signed
 */
export async function markSignerSigned(
  tenantSlug: string,
  id: string,
  ipAddress?: string,
  userAgent?: string
): Promise<EsignSigner | null> {
  return updateSigner(tenantSlug, id, {
    status: 'signed',
    signed_at: new Date(),
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

/**
 * Mark signer as declined
 */
export async function markSignerDeclined(
  tenantSlug: string,
  id: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<EsignSigner | null> {
  return updateSigner(tenantSlug, id, {
    status: 'declined',
    declined_at: new Date(),
    decline_reason: reason,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the next signer in order (for sequential signing)
 */
export async function getNextSigner(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
        AND status NOT IN ('signed', 'declined')
      ORDER BY signing_order ASC, created_at ASC
      LIMIT 1
    `

    return (result.rows[0] as EsignSigner) || null
  })
}

/**
 * Check if all signers with a specific order have signed
 */
export async function hasOrderCompleted(
  tenantSlug: string,
  documentId: string,
  signingOrder: number
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND signing_order = ${signingOrder}
        AND role = 'signer'
    `

    const row = result.rows[0]
    if (!row) return false
    const total = parseInt(row.total as string, 10)
    const signed = parseInt(row.signed as string, 10)
    return total === signed
  })
}

/**
 * Get signers pending email notification (for sequential signing)
 */
export async function getSignersPendingNotification(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner[]> {
  return withTenant(tenantSlug, async () => {
    // Get the minimum signing order that hasn't been completed
    const nextOrder = await sql`
      SELECT MIN(signing_order) as next_order
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
        AND status NOT IN ('signed', 'declined')
    `

    if (!nextOrder.rows[0]?.next_order) return []

    // Get signers at that order who haven't been sent
    const result = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${documentId}
        AND signing_order = ${nextOrder.rows[0].next_order}
        AND role = 'signer'
        AND status = 'pending'
      ORDER BY created_at ASC
    `

    return result.rows as EsignSigner[]
  })
}

/**
 * Get CC recipients for a document
 */
export async function getCCRecipients(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'cc'
      ORDER BY created_at ASC
    `

    return result.rows as EsignSigner[]
  })
}

/**
 * Regenerate access token for a signer
 */
export async function regenerateAccessToken(
  tenantSlug: string,
  id: string
): Promise<EsignSigner | null> {
  const newToken = nanoid(DOCUMENT_DEFAULTS.TOKEN_LENGTH)

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_signers
      SET access_token = ${newToken}
      WHERE id = ${id}
      RETURNING *
    `

    return (result.rows[0] as EsignSigner) || null
  })
}

/**
 * Get signer statistics for a document
 */
export async function getSignerStats(
  tenantSlug: string,
  documentId: string
): Promise<Record<SignerStatus, number> & { total: number }> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'viewed' THEN 1 END) as viewed,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
    `

    const row = result.rows[0]
    if (!row) {
      return {
        total: 0,
        pending: 0,
        sent: 0,
        viewed: 0,
        signed: 0,
        declined: 0,
      }
    }
    return {
      total: parseInt(row.total as string, 10),
      pending: parseInt(row.pending as string, 10),
      sent: parseInt(row.sent as string, 10),
      viewed: parseInt(row.viewed as string, 10),
      signed: parseInt(row.signed as string, 10),
      declined: parseInt(row.declined as string, 10),
    }
  })
}

// ============================================================================
// INTERNAL SIGNERS (COUNTER-SIGNATURES)
// ============================================================================

/**
 * Get all internal signers awaiting counter-signature
 */
export async function getPendingCounterSignatures(
  tenantSlug: string
): Promise<
  Array<{
    signer_id: string
    signer_name: string
    signer_email: string
    document_id: string
    document_name: string
    signing_order: number
    external_signers_completed: number
    external_signers_total: number
    ready_to_sign: boolean
    created_at: Date
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      WITH external_signer_status AS (
        SELECT
          document_id,
          COUNT(*) as total_external,
          COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed_external,
          MAX(CASE WHEN status = 'signed' THEN signing_order ELSE 0 END) as max_signed_order
        FROM esign_signers
        WHERE is_internal = false AND role = 'signer'
        GROUP BY document_id
      )
      SELECT
        s.id as signer_id,
        s.name as signer_name,
        s.email as signer_email,
        s.document_id,
        d.name as document_name,
        s.signing_order,
        COALESCE(e.signed_external, 0) as external_signers_completed,
        COALESCE(e.total_external, 0) as external_signers_total,
        CASE
          WHEN COALESCE(e.total_external, 0) = 0 THEN true
          WHEN s.signing_order <= COALESCE(e.max_signed_order, 0) + 1
            AND COALESCE(e.signed_external, 0) > 0 THEN true
          WHEN COALESCE(e.total_external, 0) = COALESCE(e.signed_external, 0) THEN true
          ELSE false
        END as ready_to_sign,
        s.created_at
      FROM esign_signers s
      JOIN esign_documents d ON s.document_id = d.id
      LEFT JOIN external_signer_status e ON s.document_id = e.document_id
      WHERE s.is_internal = true
        AND s.role = 'signer'
        AND s.status NOT IN ('signed', 'declined')
        AND d.status NOT IN ('completed', 'voided', 'expired')
      ORDER BY
        CASE WHEN COALESCE(e.total_external, 0) = COALESCE(e.signed_external, 0) THEN 0 ELSE 1 END,
        s.created_at ASC
    `

    return result.rows.map((row) => ({
      signer_id: row.signer_id as string,
      signer_name: row.signer_name as string,
      signer_email: row.signer_email as string,
      document_id: row.document_id as string,
      document_name: row.document_name as string,
      signing_order: parseInt(row.signing_order as string, 10),
      external_signers_completed: parseInt(row.external_signers_completed as string, 10),
      external_signers_total: parseInt(row.external_signers_total as string, 10),
      ready_to_sign: row.ready_to_sign as boolean,
      created_at: row.created_at as Date,
    }))
  })
}

/**
 * Check if a signer is an internal signer
 */
export async function isInternalSigner(
  tenantSlug: string,
  signerId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT is_internal FROM esign_signers WHERE id = ${signerId}
    `
    return result.rows[0]?.is_internal === true
  })
}

/**
 * Generate a signing URL for a signer
 */
export function generateSigningUrl(
  baseUrl: string,
  accessToken: string
): string {
  return `${baseUrl}/sign/${accessToken}`
}
