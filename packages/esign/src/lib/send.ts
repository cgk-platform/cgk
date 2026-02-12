/**
 * E-Sign Document Sending Workflow
 * Handles the complete flow of creating and sending documents for signature
 */

import type {
  EsignDocument,
  EsignSigner,
  EsignField,
  TemplateWithFields,
} from '../types.js'
import { createDocument, getDocument, markDocumentPending } from './documents.js'
import { createSigner, getDocumentSigners, markSignerSent } from './signers.js'
import { copyFieldsFromTemplate } from './fields.js'
import { getTemplateWithFields } from './templates.js'
import { logDocumentCreated, logDocumentSent } from './audit.js'
import { replaceVariables, type VariableContext } from './variables.js'
import { DOCUMENT_DEFAULTS } from '../constants.js'

// ============================================================================
// TYPES
// ============================================================================

export interface SendDocumentInput {
  template_id: string
  name?: string
  signers: Array<{
    name: string
    email: string
    role?: 'signer' | 'cc' | 'viewer' | 'approver'
    signing_order?: number
    is_internal?: boolean
  }>
  message?: string
  expires_in_days?: number
  reminder_enabled?: boolean
  reminder_days?: number
  creator_id?: string
  created_by: string
}

export interface SendDocumentResult {
  document: EsignDocument
  signers: EsignSigner[]
  fields: EsignField[]
}

export interface ResendDocumentInput {
  document_id: string
  signer_id?: string // If not provided, resend to all pending signers
  new_message?: string
}

export interface ResendDocumentResult {
  success: boolean
  signers_notified: string[]
  errors: string[]
}

// ============================================================================
// SEND DOCUMENT WORKFLOW
// ============================================================================

/**
 * Create a document from template and prepare for sending
 * This creates the document, signers, and fields but does NOT send yet
 */
export async function prepareDocument(
  tenantSlug: string,
  input: SendDocumentInput
): Promise<SendDocumentResult> {
  // Get template
  const template = await getTemplateWithFields(tenantSlug, input.template_id)
  if (!template) {
    throw new Error('Template not found')
  }

  if (template.status !== 'active') {
    throw new Error('Template is not active')
  }

  // Validate signers
  if (input.signers.length === 0) {
    throw new Error('At least one signer is required')
  }

  // Calculate expiration date
  let expiresAt: Date | undefined
  if (input.expires_in_days) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + input.expires_in_days)
  }

  // Build document name with variable replacement if needed
  const firstSigner = input.signers[0]
  const documentName = input.name || `${template.name} - ${firstSigner?.name || 'Unknown'}`

  // Create document
  const document = await createDocument(tenantSlug, {
    template_id: input.template_id,
    creator_id: input.creator_id,
    name: documentName,
    file_url: template.file_url,
    expires_at: expiresAt,
    reminder_enabled: input.reminder_enabled ?? true,
    reminder_days: input.reminder_days ?? DOCUMENT_DEFAULTS.REMINDER_DAYS,
    message: input.message,
    created_by: input.created_by,
  })

  // Create signers
  const signers: EsignSigner[] = []
  const signerMapping: Record<number, string> = {}

  for (let i = 0; i < input.signers.length; i++) {
    const signerInput = input.signers[i]
    if (!signerInput) continue

    const signingOrder = signerInput.signing_order ?? i + 1

    const signer = await createSigner(tenantSlug, {
      document_id: document.id,
      name: signerInput.name,
      email: signerInput.email,
      role: signerInput.role || 'signer',
      signing_order: signingOrder,
      is_internal: signerInput.is_internal ?? false,
    })

    signers.push(signer)
    signerMapping[signingOrder] = signer.id
  }

  // Copy fields from template and assign to signers
  const fields = await copyFieldsFromTemplate(
    tenantSlug,
    input.template_id,
    document.id,
    signerMapping
  )

  // Log creation
  await logDocumentCreated(tenantSlug, document.id, input.created_by, {
    template_id: input.template_id,
    signer_count: signers.length,
    field_count: fields.length,
  })

  return { document, signers, fields }
}

/**
 * Send a prepared document to signers
 * Marks document as pending and updates signer sent status
 */
export async function sendDocument(
  tenantSlug: string,
  documentId: string,
  performedBy: string
): Promise<{
  success: boolean
  signers_to_notify: EsignSigner[]
}> {
  // Get document
  const document = await getDocument(tenantSlug, documentId)
  if (!document) {
    throw new Error('Document not found')
  }

  if (document.status !== 'draft') {
    throw new Error(`Document is already ${document.status}`)
  }

  // Get signers
  const signers = await getDocumentSigners(tenantSlug, documentId)
  if (signers.length === 0) {
    throw new Error('No signers found')
  }

  // Mark document as pending
  await markDocumentPending(tenantSlug, documentId)

  // Get signers to notify (first in sequence for sequential signing, all for parallel)
  const minOrder = Math.min(...signers.filter(s => s.role === 'signer').map(s => s.signing_order))
  const signersToNotify = signers.filter(
    s => s.role === 'signer' && s.signing_order === minOrder
  )

  // Mark signers as sent
  const updatedSigners: EsignSigner[] = []
  for (const signer of signersToNotify) {
    const updated = await markSignerSent(tenantSlug, signer.id)
    if (updated) {
      updatedSigners.push(updated)
    }
  }

  // Log send action
  await logDocumentSent(
    tenantSlug,
    documentId,
    performedBy,
    updatedSigners.map(s => s.email)
  )

  return {
    success: true,
    signers_to_notify: updatedSigners,
  }
}

/**
 * Prepare and send document in one step
 */
export async function prepareAndSendDocument(
  tenantSlug: string,
  input: SendDocumentInput
): Promise<SendDocumentResult & { signers_to_notify: EsignSigner[] }> {
  const prepared = await prepareDocument(tenantSlug, input)

  const { signers_to_notify } = await sendDocument(
    tenantSlug,
    prepared.document.id,
    input.created_by
  )

  // Get updated document with pending status
  const updatedDocument = await getDocument(tenantSlug, prepared.document.id)

  return {
    ...prepared,
    document: updatedDocument || prepared.document,
    signers_to_notify,
  }
}

// ============================================================================
// RESEND DOCUMENT
// ============================================================================

/**
 * Resend document to pending signers
 */
export async function resendDocument(
  tenantSlug: string,
  input: ResendDocumentInput,
  _performedBy: string
): Promise<ResendDocumentResult> {
  const document = await getDocument(tenantSlug, input.document_id)
  if (!document) {
    throw new Error('Document not found')
  }

  if (!['pending', 'in_progress'].includes(document.status)) {
    throw new Error(`Cannot resend document with status: ${document.status}`)
  }

  const signers = await getDocumentSigners(tenantSlug, input.document_id)
  const signersNotified: string[] = []
  const errors: string[] = []

  // Filter signers to resend
  let signersToResend = signers.filter(s =>
    s.role === 'signer' &&
    ['pending', 'sent', 'viewed'].includes(s.status)
  )

  if (input.signer_id) {
    signersToResend = signersToResend.filter(s => s.id === input.signer_id)
  }

  for (const signer of signersToResend) {
    try {
      // Update signer with new token and sent timestamp
      await markSignerSent(tenantSlug, signer.id)

      signersNotified.push(signer.email)
    } catch (error) {
      errors.push(`Failed to resend to ${signer.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: signersNotified.length > 0,
    signers_notified: signersNotified,
    errors,
  }
}

// ============================================================================
// DOCUMENT NAME GENERATION
// ============================================================================

/**
 * Generate document name from template and context
 */
export function generateDocumentName(
  template: TemplateWithFields,
  context: VariableContext
): string {
  // If template name has variables, replace them
  let name = template.name

  if (name.includes('{{')) {
    name = replaceVariables(name, context)
  }

  // Add signer name if available and not already in name
  if (context.signer?.name && !name.toLowerCase().includes(context.signer.name.toLowerCase())) {
    name = `${name} - ${context.signer.name}`
  }

  // Add date if not already present
  const today = new Date().toISOString().split('T')[0] || ''
  if (today && !name.includes(today)) {
    name = `${name} (${today})`
  }

  return name
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate document is ready to send
 */
export async function validateDocumentForSending(
  tenantSlug: string,
  documentId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  const document = await getDocument(tenantSlug, documentId)
  if (!document) {
    return { valid: false, errors: ['Document not found'] }
  }

  if (document.status !== 'draft') {
    errors.push(`Document has status "${document.status}", expected "draft"`)
  }

  const signers = await getDocumentSigners(tenantSlug, documentId)
  if (signers.length === 0) {
    errors.push('No signers added to document')
  }

  const actualSigners = signers.filter(s => s.role === 'signer')
  if (actualSigners.length === 0) {
    errors.push('At least one signer with role "signer" is required')
  }

  // Check for valid emails
  for (const signer of signers) {
    if (!isValidEmail(signer.email)) {
      errors.push(`Invalid email for signer "${signer.name}": ${signer.email}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
