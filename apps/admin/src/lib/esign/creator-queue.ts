/**
 * E-Signature Creator Queue Integration
 *
 * Logs e-sign emails to the creator communications queue when the recipient
 * is a known creator. This allows tracking all creator communications in one place.
 */

import { sql, withTenant } from '@cgk-platform/db'
import type { EsignDocument, EsignSigner } from './types'

/**
 * E-sign email types for creator queue
 */
export type EsignEmailType =
  | 'contract_signing_request'
  | 'contract_signed'
  | 'contract_reminder'
  | 'contract_voided'
  | 'contract_completed'
  | 'contract_declined'
  | 'contract_expired'

/**
 * Input for logging to creator queue
 */
export interface LogToCreatorQueueInput {
  creatorId: string
  creatorEmail: string
  creatorName: string
  emailType: EsignEmailType
  subject: string
  htmlContent: string
  metadata?: Record<string, unknown>
}

/**
 * Log an e-sign email to the creator communications queue
 *
 * This is a fire-and-forget operation - failures are logged but don't
 * propagate to the caller, since the primary email sending should not fail
 * due to queue logging issues.
 */
export async function logToCreatorQueue(
  tenantSlug: string,
  input: LogToCreatorQueueInput
): Promise<void> {
  try {
    await withTenant(tenantSlug, async () => {
      // Check if creator_email_queue table exists and creator is valid
      const creatorResult = await sql`
        SELECT id FROM creators WHERE id = ${input.creatorId}
      `

      if (creatorResult.rows.length === 0) {
        // Creator doesn't exist, skip logging
        return
      }

      // Log to creator email queue (if the table exists)
      try {
        await sql`
          INSERT INTO creator_email_queue (
            creator_id,
            creator_email,
            creator_name,
            email_type,
            subject,
            html_content,
            scheduled_for,
            metadata,
            status
          ) VALUES (
            ${input.creatorId},
            ${input.creatorEmail},
            ${input.creatorName},
            ${input.emailType},
            ${input.subject},
            ${input.htmlContent},
            NOW(),
            ${JSON.stringify({
              source: 'esign',
              ...input.metadata,
            })},
            'sent'
          )
        `
      } catch {
        // Table might not exist yet - silently skip
        // This is expected in early stages before creator_email_queue is created
      }
    })
  } catch (error) {
    // Don't throw - this is supplementary logging
    console.error('Failed to log to creator queue:', error)
  }
}

/**
 * Build email subject and content for logging
 */
function buildSigningRequestEmail(
  document: EsignDocument,
  signer: EsignSigner,
  _signingUrl: string
): { subject: string; htmlContent: string } {
  return {
    subject: `Please sign: ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>You have been requested to sign the document "${document.name}".</p>
      ${document.message ? `<p>Message: ${document.message}</p>` : ''}
      <p>Please click the link in the email to review and sign.</p>
    `,
  }
}

function buildReminderEmail(
  document: EsignDocument,
  signer: EsignSigner
): { subject: string; htmlContent: string } {
  return {
    subject: `Reminder: Please sign ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>This is a friendly reminder to sign the document "${document.name}".</p>
      <p>Please click the link in the email to review and sign.</p>
    `,
  }
}

function buildCompletedEmail(
  document: EsignDocument,
  signer: EsignSigner
): { subject: string; htmlContent: string } {
  return {
    subject: `Completed: ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>All parties have signed "${document.name}". You can download the completed document from the link in the email.</p>
    `,
  }
}

/**
 * Log signing request to creator queue
 */
export async function logSigningRequestToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  signingUrl: string,
  creatorId: string
): Promise<void> {
  const { subject, htmlContent } = buildSigningRequestEmail(document, signer, signingUrl)

  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_signing_request',
    subject,
    htmlContent,
    metadata: {
      documentId: document.id,
      documentName: document.name,
      signingUrl,
    },
  })
}

/**
 * Log reminder to creator queue
 */
export async function logReminderToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  creatorId: string
): Promise<void> {
  const { subject, htmlContent } = buildReminderEmail(document, signer)

  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_reminder',
    subject,
    htmlContent,
    metadata: {
      documentId: document.id,
      documentName: document.name,
    },
  })
}

/**
 * Log completion to creator queue
 */
export async function logCompletionToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  creatorId: string
): Promise<void> {
  const { subject, htmlContent } = buildCompletedEmail(document, signer)

  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_completed',
    subject,
    htmlContent,
    metadata: {
      documentId: document.id,
      documentName: document.name,
      signedFileUrl: document.signedFileUrl,
    },
  })
}

/**
 * Log voided document to creator queue
 */
export async function logVoidedToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  creatorId: string,
  reason?: string
): Promise<void> {
  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_voided',
    subject: `Document Voided: ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>The document "${document.name}" has been voided and is no longer valid.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
    `,
    metadata: {
      documentId: document.id,
      documentName: document.name,
      reason,
    },
  })
}

/**
 * Log expired document to creator queue
 */
export async function logExpiredToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  creatorId: string
): Promise<void> {
  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_expired',
    subject: `Document Expired: ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>The document "${document.name}" has expired and is no longer valid for signing.</p>
      <p>Please contact the sender if you still need to sign this document.</p>
    `,
    metadata: {
      documentId: document.id,
      documentName: document.name,
      expiresAt: document.expiresAt,
    },
  })
}

/**
 * Log declined document to creator queue
 */
export async function logDeclinedToCreatorQueue(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  creatorId: string,
  reason?: string
): Promise<void> {
  await logToCreatorQueue(tenantSlug, {
    creatorId,
    creatorEmail: signer.email,
    creatorName: signer.name,
    emailType: 'contract_declined',
    subject: `Document Declined: ${document.name}`,
    htmlContent: `
      <p>Hi ${signer.name},</p>
      <p>A signer has declined the document "${document.name}".</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
    `,
    metadata: {
      documentId: document.id,
      documentName: document.name,
      reason,
    },
  })
}
