/**
 * E-Sign Document Decline Flow
 * Handles document decline with reason capture and notifications
 */

import { withTenant } from '@cgk-platform/db'
import type { EsignDocument, EsignSigner } from '../types.js'
import { getDocument, markDocumentDeclined, updateDocument } from './documents.js'
import { getSigner, markSignerDeclined, getDocumentSigners } from './signers.js'
import { logDocumentDeclined, logDocumentVoided } from './audit.js'
import { ERROR_MESSAGES } from '../constants.js'

// ============================================================================
// TYPES
// ============================================================================

export interface DeclineDocumentInput {
  signerId: string
  reason?: string
  ipAddress?: string
  userAgent?: string
}

export interface DeclineDocumentResult {
  success: boolean
  document: EsignDocument | null
  signer: EsignSigner | null
  signerRole: 'signer' | 'cc' | 'viewer' | 'approver'
  notifyRecipients: string[]
  error?: string
}

export interface VoidDocumentInput {
  documentId: string
  reason?: string
  voidedBy: string
  notifySigners?: boolean
}

export interface VoidDocumentResult {
  success: boolean
  document: EsignDocument | null
  voidedSigners: string[]
  error?: string
}

// ============================================================================
// DECLINE FLOW
// ============================================================================

/**
 * Decline a document as a signer
 * Updates signer status and optionally marks document as declined
 */
export async function declineDocument(
  tenantSlug: string,
  input: DeclineDocumentInput
): Promise<DeclineDocumentResult> {
  const { signerId, reason, ipAddress, userAgent } = input

  const result: DeclineDocumentResult = {
    success: false,
    document: null,
    signer: null,
    signerRole: 'signer',
    notifyRecipients: [],
  }

  try {
    // Get signer
    const signer = await getSigner(tenantSlug, signerId)
    if (!signer) {
      result.error = ERROR_MESSAGES.SIGNER_NOT_FOUND
      return result
    }

    result.signer = signer
    result.signerRole = signer.role

    // Get document
    const document = await getDocument(tenantSlug, signer.document_id)
    if (!document) {
      result.error = ERROR_MESSAGES.DOCUMENT_NOT_FOUND
      return result
    }

    result.document = document

    // Validate document can be declined
    if (!['pending', 'in_progress'].includes(document.status)) {
      result.error = `Cannot decline document with status: ${document.status}`
      return result
    }

    // Check if signer has already declined or signed
    if (signer.status === 'declined') {
      result.error = 'You have already declined this document'
      return result
    }

    if (signer.status === 'signed') {
      result.error = 'You have already signed this document'
      return result
    }

    // Mark signer as declined
    await markSignerDeclined(tenantSlug, signerId, reason, ipAddress, userAgent)

    // Log the decline
    await logDocumentDeclined(tenantSlug, document.id, signerId, reason, ipAddress, userAgent)

    // If this is a signer (not CC/viewer), mark document as declined
    if (signer.role === 'signer') {
      await markDocumentDeclined(tenantSlug, document.id)

      // Get updated document
      const updatedDoc = await getDocument(tenantSlug, document.id)
      if (updatedDoc) {
        result.document = updatedDoc
      }
    }

    // Get all signers for notification
    const allSigners = await getDocumentSigners(tenantSlug, document.id)

    // Collect recipients who should be notified
    // Notify: document creator, other signers, CC recipients
    const notifyEmails = new Set<string>()

    // Always notify the document creator (if we had their email)
    // In practice, this would come from the users table

    // Notify all signers except the one who declined
    for (const s of allSigners) {
      if (s.id !== signerId && s.email) {
        notifyEmails.add(s.email)
      }
    }

    result.notifyRecipients = Array.from(notifyEmails)
    result.success = true

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

// ============================================================================
// VOID FLOW
// ============================================================================

/**
 * Void a document (admin action)
 * Cancels the document and optionally notifies all signers
 */
export async function voidDocument(
  tenantSlug: string,
  input: VoidDocumentInput
): Promise<VoidDocumentResult> {
  const { documentId, reason, voidedBy, notifySigners = true } = input

  const result: VoidDocumentResult = {
    success: false,
    document: null,
    voidedSigners: [],
  }

  try {
    // Get document
    const document = await getDocument(tenantSlug, documentId)
    if (!document) {
      result.error = ERROR_MESSAGES.DOCUMENT_NOT_FOUND
      return result
    }

    // Can only void pending/in_progress documents
    if (!['pending', 'in_progress', 'draft'].includes(document.status)) {
      result.error = `Cannot void document with status: ${document.status}`
      return result
    }

    // Update document status to voided
    const updatedDoc = await updateDocument(tenantSlug, documentId, {
      status: 'voided',
    })

    if (!updatedDoc) {
      result.error = 'Failed to void document'
      return result
    }

    result.document = updatedDoc

    // Log the void action
    await logDocumentVoided(tenantSlug, documentId, voidedBy, reason)

    // Get signers for notification
    if (notifySigners) {
      const signers = await getDocumentSigners(tenantSlug, documentId)

      for (const signer of signers) {
        // Only notify external signers who were already sent
        if (!signer.is_internal && signer.sent_at) {
          result.voidedSigners.push(signer.email)
        }
      }
    }

    result.success = true
    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

// ============================================================================
// DECLINE VALIDATION
// ============================================================================

/**
 * Validate if a signer can decline a document
 */
export async function canDecline(
  tenantSlug: string,
  signerId: string
): Promise<{ canDecline: boolean; reason?: string }> {
  const signer = await getSigner(tenantSlug, signerId)
  if (!signer) {
    return { canDecline: false, reason: ERROR_MESSAGES.SIGNER_NOT_FOUND }
  }

  const document = await getDocument(tenantSlug, signer.document_id)
  if (!document) {
    return { canDecline: false, reason: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
  }

  if (document.status === 'completed') {
    return { canDecline: false, reason: ERROR_MESSAGES.DOCUMENT_ALREADY_SIGNED }
  }

  if (document.status === 'voided') {
    return { canDecline: false, reason: ERROR_MESSAGES.DOCUMENT_VOIDED }
  }

  if (document.status === 'expired') {
    return { canDecline: false, reason: ERROR_MESSAGES.DOCUMENT_EXPIRED }
  }

  if (signer.status === 'signed') {
    return { canDecline: false, reason: 'You have already signed this document' }
  }

  if (signer.status === 'declined') {
    return { canDecline: false, reason: 'You have already declined this document' }
  }

  // CC and viewer roles cannot decline
  if (signer.role === 'cc' || signer.role === 'viewer') {
    return { canDecline: false, reason: 'Only signers can decline documents' }
  }

  return { canDecline: true }
}

// ============================================================================
// DECLINE STATISTICS
// ============================================================================

/**
 * Get decline statistics for a tenant
 */
export async function getDeclineStats(
  tenantSlug: string,
  _options?: {
    startDate?: Date
    endDate?: Date
  }
): Promise<{
  totalDeclined: number
  declineRate: number
  topReasons: Array<{ reason: string; count: number }>
  recentDeclines: Array<{
    documentId: string
    documentName: string
    signerName: string
    reason: string | null
    declinedAt: Date
  }>
}> {
  return withTenant(tenantSlug, async () => {
    // Not implemented - would query audit log and documents
    // This is a placeholder for the stats structure
    return {
      totalDeclined: 0,
      declineRate: 0,
      topReasons: [],
      recentDeclines: [],
    }
  })
}
