/**
 * E-Sign Signing Session Flow
 * Handles the complete signing flow from token validation to completion
 */

import { sql, withTenant } from '@cgk-platform/db'
import type {
  EsignDocument,
  EsignSigner,
  EsignTemplate,
  SigningSession,
  SignatureData,
  CompleteSigningResult,
} from '../types.js'
import { getDocument, markDocumentInProgress, markDocumentCompleted, checkAllSignersSigned } from './documents.js'
import { getSigner, getSignerByToken, markSignerViewed, markSignerSigned } from './signers.js'
import { getDocumentFields, getSignerFields, setFieldValue, areRequiredFieldsFilled } from './fields.js'
import { getDocumentSigners } from './signers.js'
import { getTemplate } from './templates.js'
import { createSignature, validateSignatureImage, svgToDataUrl, generateTypedSignatureSvg, getSignatureFont } from './signatures.js'
import { logDocumentViewed, logDocumentSigned, logFieldFilled } from './audit.js'
import { finalizeSignedDocument } from './storage.js'
import { ERROR_MESSAGES } from '../constants.js'

// ============================================================================
// SIGNING SESSION
// ============================================================================

/**
 * Get signing session from access token
 * Validates token, document status, and signing order
 */
export async function getSigningSession(
  tenantSlug: string,
  accessToken: string
): Promise<SigningSession | null> {
  const signer = await getSignerByToken(tenantSlug, accessToken)
  if (!signer) return null

  const document = await getDocument(tenantSlug, signer.document_id)
  if (!document) return null

  // Validate document is in signable state
  if (!['pending', 'in_progress'].includes(document.status)) {
    return null
  }

  // Check if document is expired
  if (document.expires_at && new Date(document.expires_at) < new Date()) {
    return null
  }

  // Check if this signer's turn (sequential signing)
  const canSign = await canSignerSign(tenantSlug, document.id, signer.id)
  if (!canSign) {
    return null
  }

  // Get fields for this signer
  const fields = await getSignerFields(tenantSlug, signer.id)

  // Get template if linked
  let template: EsignTemplate | null = null
  if (document.template_id) {
    template = await getTemplate(tenantSlug, document.template_id)
  }

  return {
    document,
    signer,
    fields,
    template,
  }
}

/**
 * Check if a signer can sign based on signing order
 */
export async function canSignerSign(
  tenantSlug: string,
  documentId: string,
  signerId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Get the signer
    const signerResult = await sql`
      SELECT * FROM esign_signers WHERE id = ${signerId}
    `
    const signer = signerResult.rows[0]
    if (!signer) return false

    // Already signed or declined
    if (['signed', 'declined'].includes(signer.status as string)) {
      return false
    }

    // Get the minimum incomplete signing order
    const minOrderResult = await sql`
      SELECT MIN(signing_order) as min_order
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
        AND status NOT IN ('signed', 'declined')
    `

    const minOrder = minOrderResult.rows[0]?.min_order
    if (minOrder === null || minOrder === undefined) {
      // All signers have completed
      return false
    }

    // Signer can sign if their order matches the minimum incomplete order
    return (signer.signing_order as number) <= (minOrder as number)
  })
}

/**
 * Get all signers who can currently sign (for parallel signing at same order)
 */
export async function getNextSigners(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner[]> {
  return withTenant(tenantSlug, async () => {
    // Find minimum incomplete signing order
    const minOrderResult = await sql`
      SELECT MIN(signing_order) as min_order
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
        AND status NOT IN ('signed', 'declined')
    `

    const minOrder = minOrderResult.rows[0]?.min_order
    if (minOrder === null || minOrder === undefined) {
      return []
    }

    // Get all signers at that order who haven't completed
    const result = await sql`
      SELECT * FROM esign_signers
      WHERE document_id = ${documentId}
        AND signing_order = ${minOrder}
        AND role = 'signer'
        AND status NOT IN ('signed', 'declined')
      ORDER BY created_at ASC
    `

    return result.rows as EsignSigner[]
  })
}

/**
 * Mark document as viewed by signer
 */
export async function markDocumentViewed(
  tenantSlug: string,
  signerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<EsignSigner | null> {
  const signer = await getSigner(tenantSlug, signerId)
  if (!signer) return null

  // Mark signer as viewed
  const updated = await markSignerViewed(tenantSlug, signerId, ipAddress, userAgent)

  // Update document to in_progress if it was pending
  const document = await getDocument(tenantSlug, signer.document_id)
  if (document && document.status === 'pending') {
    await markDocumentInProgress(tenantSlug, document.id)
  }

  // Log audit event
  await logDocumentViewed(tenantSlug, signer.document_id, signerId, ipAddress, userAgent)

  return updated
}

// ============================================================================
// SIGNATURE SUBMISSION
// ============================================================================

/**
 * Process and save signature data
 */
export async function processSignature(
  tenantSlug: string,
  signerId: string,
  signature: SignatureData
): Promise<string> {
  let imageUrl: string

  if (signature.type === 'typed') {
    // Generate SVG from typed text
    const fontName = signature.font_name || 'Dancing Script'
    const font = getSignatureFont(fontName)
    const fontFamily = font?.family || "'Dancing Script', cursive"

    const svg = generateTypedSignatureSvg(signature.data, fontFamily)
    imageUrl = svgToDataUrl(svg)
  } else if (signature.type === 'uploaded' || signature.type === 'drawn') {
    // Validate the image
    const validation = validateSignatureImage(signature.data)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid signature image')
    }
    imageUrl = signature.data
  } else {
    throw new Error('Invalid signature type')
  }

  // Create signature record
  await createSignature(tenantSlug, {
    signer_id: signerId,
    type: signature.type,
    image_url: imageUrl,
    font_name: signature.font_name,
  })

  return imageUrl
}

/**
 * Complete the signing process for a signer
 */
export async function completeSignerSigning(
  tenantSlug: string,
  signerId: string,
  fieldValues: Array<{ id: string; value: string }>,
  signature: SignatureData,
  ipAddress?: string,
  userAgent?: string
): Promise<CompleteSigningResult> {
  const signer = await getSigner(tenantSlug, signerId)
  if (!signer) {
    throw new Error(ERROR_MESSAGES.SIGNER_NOT_FOUND)
  }

  const document = await getDocument(tenantSlug, signer.document_id)
  if (!document) {
    throw new Error(ERROR_MESSAGES.DOCUMENT_NOT_FOUND)
  }

  // Validate document state
  if (!['pending', 'in_progress'].includes(document.status)) {
    throw new Error(`Cannot sign document with status: ${document.status}`)
  }

  // Check if signer can sign
  const canSign = await canSignerSign(tenantSlug, document.id, signer.id)
  if (!canSign) {
    throw new Error('It is not your turn to sign this document')
  }

  // Save field values
  for (const field of fieldValues) {
    await setFieldValue(tenantSlug, field.id, field.value)

    // Get field type for audit log
    const fieldData = await sql.query(`SELECT type FROM esign_fields WHERE id = $1`, [field.id])
    const fieldType = fieldData.rows[0]?.type || 'unknown'

    await logFieldFilled(
      tenantSlug,
      document.id,
      signerId,
      field.id,
      fieldType,
      ipAddress,
      userAgent
    )
  }

  // Validate all required fields are filled
  const fieldsFilled = await areRequiredFieldsFilled(tenantSlug, signerId)
  if (!fieldsFilled) {
    throw new Error(ERROR_MESSAGES.REQUIRED_FIELD_MISSING)
  }

  // Process and save signature
  const signatureUrl = await processSignature(tenantSlug, signerId, signature)

  // Find and update signature field with the image URL
  const signerFields = await getSignerFields(tenantSlug, signerId)
  const signatureField = signerFields.find((f) => f.type === 'signature')
  if (signatureField) {
    await setFieldValue(tenantSlug, signatureField.id, signatureUrl)
  }

  // Mark signer as signed
  const signedAt = new Date()
  await markSignerSigned(tenantSlug, signerId, ipAddress, userAgent)

  // Log audit event
  await logDocumentSigned(tenantSlug, document.id, signerId, ipAddress, userAgent)

  // Check if all signers have signed
  const allSigned = await checkAllSignersSigned(tenantSlug, document.id)

  let nextSigners: EsignSigner[] = []

  if (allSigned) {
    // Document is complete — generate the final signed PDF
    let signedFileUrl = document.file_url // Fallback to original if finalization fails

    try {
      const [allFields, allSigners] = await Promise.all([
        getDocumentFields(tenantSlug, document.id),
        getDocumentSigners(tenantSlug, document.id),
      ])

      signedFileUrl = await finalizeSignedDocument({
        tenantId: tenantSlug,
        documentId: document.id,
        originalPdfUrl: document.file_url,
        fields: allFields,
        signers: allSigners,
      })
    } catch (finalizationError) {
      console.error('[esign] PDF finalization failed, using original:', finalizationError)
    }

    await markDocumentCompleted(tenantSlug, document.id, signedFileUrl)
  } else {
    // Get next signers to notify
    nextSigners = await getNextSigners(tenantSlug, document.id)
  }

  return {
    success: true,
    documentCompleted: allSigned,
    signedAt,
    nextSigners,
  }
}

// ============================================================================
// SEND TO NEXT SIGNERS
// ============================================================================

/**
 * Send signing requests to the next batch of signers
 * Called after a signer completes and there are more signers
 */
export async function sendToNextSigners(
  tenantSlug: string,
  documentId: string
): Promise<EsignSigner[]> {
  const nextSigners = await getNextSigners(tenantSlug, documentId)

  // Filter to only signers who haven't been sent yet (status = 'pending')
  const signersToSend = nextSigners.filter((s) => s.status === 'pending')

  // Mark them as sent and return
  // Actual email sending would be handled by the calling code or background job
  const sentSigners: EsignSigner[] = []

  for (const signer of signersToSend) {
    // Only send to external signers
    // Internal signers (counter-signatures) don't get emails
    if (!signer.is_internal) {
      await withTenant(tenantSlug, async () => {
        await sql`
          UPDATE esign_signers
          SET status = 'sent', sent_at = NOW()
          WHERE id = ${signer.id}
        `
      })

      // Fetch updated signer
      const updated = await getSigner(tenantSlug, signer.id)
      if (updated) {
        sentSigners.push(updated)
      }
    }
  }

  return sentSigners
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a signing session token
 */
export async function validateSigningToken(
  tenantSlug: string,
  token: string
): Promise<{
  valid: boolean
  error?: string
  signer?: EsignSigner
  document?: EsignDocument
}> {
  const signer = await getSignerByToken(tenantSlug, token)
  if (!signer) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_TOKEN }
  }

  const document = await getDocument(tenantSlug, signer.document_id)
  if (!document) {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_NOT_FOUND }
  }

  // Check document status
  if (document.status === 'completed') {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_ALREADY_SIGNED }
  }

  if (document.status === 'voided') {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_VOIDED }
  }

  if (document.status === 'expired') {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_EXPIRED }
  }

  // Check expiration
  if (document.expires_at && new Date(document.expires_at) < new Date()) {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_EXPIRED }
  }

  // Check if signer has already signed
  if (signer.status === 'signed') {
    return { valid: false, error: ERROR_MESSAGES.DOCUMENT_ALREADY_SIGNED }
  }

  if (signer.status === 'declined') {
    return { valid: false, error: 'You have declined this document' }
  }

  // Check signing order
  const canSign = await canSignerSign(tenantSlug, document.id, signer.id)
  if (!canSign) {
    return { valid: false, error: 'It is not your turn to sign yet. Please wait for previous signers.' }
  }

  return { valid: true, signer, document }
}

/**
 * Get signing progress for a document
 */
export async function getSigningProgress(
  tenantSlug: string,
  documentId: string
): Promise<{
  total: number
  signed: number
  pending: number
  declined: number
  currentOrder: number
  isComplete: boolean
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status IN ('pending', 'sent', 'viewed') THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
        MIN(CASE WHEN status NOT IN ('signed', 'declined') THEN signing_order END) as current_order
      FROM esign_signers
      WHERE document_id = ${documentId}
        AND role = 'signer'
    `

    const row = result.rows[0]
    if (!row) {
      return {
        total: 0,
        signed: 0,
        pending: 0,
        declined: 0,
        currentOrder: 0,
        isComplete: true,
      }
    }
    const total = parseInt(String(row.total ?? '0'), 10)
    const signed = parseInt(String(row.signed ?? '0'), 10)
    const pending = parseInt(String(row.pending ?? '0'), 10)
    const declined = parseInt(String(row.declined ?? '0'), 10)
    const currentOrder = row.current_order ? parseInt(String(row.current_order), 10) : 0

    return {
      total,
      signed,
      pending,
      declined,
      currentOrder,
      isComplete: signed === total,
    }
  })
}
