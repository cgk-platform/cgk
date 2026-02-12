/**
 * E-Sign Email Notifications
 * Email sending functions for signature workflows
 */

import type {
  EsignDocument,
  EsignSigner,
} from '../types.js'
import {
  getNotificationSubject,
  generateSigningUrl,
  generateDownloadUrl,
  daysSinceSent,
} from './notifications.js'

// ============================================================================
// TYPES
// ============================================================================

export interface EmailConfig {
  baseUrl: string
  tenantName: string
  tenantLogo?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
}

export interface SigningRequestParams {
  to: string
  signerName: string
  documentName: string
  message?: string
  signingUrl: string
  expiresAt?: Date | null
  senderName?: string
  creatorId?: string
}

export interface SigningCompleteParams {
  to: string
  signerName: string
  documentName: string
  signedAt: Date
  downloadUrl?: string
  signedPdfUrl?: string
  creatorId?: string
}

export interface DocumentCompleteParams {
  to: string
  recipientName: string
  documentName: string
  completedAt: Date
  downloadUrl: string
  signerCount: number
  attachPdf?: boolean
  creatorId?: string
}

export interface ReminderParams {
  to: string
  signerName: string
  documentName: string
  signingUrl: string
  expiresAt?: Date | null
  daysRemaining?: number
  creatorId?: string
}

export interface VoidNotificationParams {
  to: string
  signerName: string
  documentName: string
  reason?: string
  voidedBy: string
  creatorId?: string
}

export interface DeclineNotificationParams {
  to: string
  recipientName: string
  documentName: string
  declinedBy: string
  declineReason?: string
  creatorId?: string
}

export interface ExpirationWarningParams {
  to: string
  signerName: string
  documentName: string
  signingUrl: string
  expiresAt: Date
  daysRemaining: number
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// EMAIL BUILDING HELPERS
// ============================================================================

/**
 * Format date for email display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date with time
 */
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Calculate days remaining until expiration
 */
function getDaysRemaining(expiresAt: Date | null | undefined): number | null {
  if (!expiresAt) return null
  const now = new Date()
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const diffMs = expiry.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================================================
// EMAIL DATA BUILDERS
// ============================================================================

/**
 * Build signing request email data
 */
export function buildSigningRequestEmail(
  params: SigningRequestParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  const daysRemaining = getDaysRemaining(params.expiresAt)

  return {
    to: params.to,
    subject: getNotificationSubject('signature_request', params.documentName, config.tenantName),
    templateId: 'esign-signature-request',
    data: {
      signer_name: params.signerName,
      document_name: params.documentName,
      sender_name: params.senderName || config.tenantName,
      message: params.message,
      signing_url: params.signingUrl,
      expires_at: params.expiresAt ? formatDate(params.expiresAt) : null,
      days_remaining: daysRemaining,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build signing complete email data
 */
export function buildSigningCompleteEmail(
  params: SigningCompleteParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  return {
    to: params.to,
    subject: getNotificationSubject('document_signed', params.documentName, config.tenantName),
    templateId: 'esign-signing-complete',
    data: {
      signer_name: params.signerName,
      document_name: params.documentName,
      signed_at: formatDateTime(params.signedAt),
      download_url: params.downloadUrl,
      signed_pdf_url: params.signedPdfUrl,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build document complete email data
 */
export function buildDocumentCompleteEmail(
  params: DocumentCompleteParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  return {
    to: params.to,
    subject: getNotificationSubject('document_completed', params.documentName, config.tenantName),
    templateId: 'esign-document-complete',
    data: {
      recipient_name: params.recipientName,
      document_name: params.documentName,
      completed_at: formatDateTime(params.completedAt),
      download_url: params.downloadUrl,
      signer_count: params.signerCount,
      attach_pdf: params.attachPdf,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build reminder email data
 */
export function buildReminderEmail(
  params: ReminderParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  const daysRemaining = params.daysRemaining ?? getDaysRemaining(params.expiresAt)

  return {
    to: params.to,
    subject: getNotificationSubject('signature_reminder', params.documentName, config.tenantName),
    templateId: 'esign-reminder',
    data: {
      signer_name: params.signerName,
      document_name: params.documentName,
      signing_url: params.signingUrl,
      expires_at: params.expiresAt ? formatDate(params.expiresAt) : null,
      days_remaining: daysRemaining,
      is_urgent: daysRemaining !== null && daysRemaining <= 2,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build void notification email data
 */
export function buildVoidNotificationEmail(
  params: VoidNotificationParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  return {
    to: params.to,
    subject: getNotificationSubject('document_voided', params.documentName, config.tenantName),
    templateId: 'esign-document-voided',
    data: {
      signer_name: params.signerName,
      document_name: params.documentName,
      reason: params.reason,
      voided_by: params.voidedBy,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build decline notification email data
 */
export function buildDeclineNotificationEmail(
  params: DeclineNotificationParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  return {
    to: params.to,
    subject: getNotificationSubject('document_declined', params.documentName, config.tenantName),
    templateId: 'esign-document-declined',
    data: {
      recipient_name: params.recipientName,
      document_name: params.documentName,
      declined_by: params.declinedBy,
      decline_reason: params.declineReason,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build expiration warning email data
 */
export function buildExpirationWarningEmail(
  params: ExpirationWarningParams,
  config: EmailConfig
): {
  to: string
  subject: string
  templateId: string
  data: Record<string, unknown>
} {
  return {
    to: params.to,
    subject: `Urgent: ${params.documentName} expires in ${params.daysRemaining} day${params.daysRemaining === 1 ? '' : 's'}`,
    templateId: 'esign-expiration-warning',
    data: {
      signer_name: params.signerName,
      document_name: params.documentName,
      signing_url: params.signingUrl,
      expires_at: formatDate(params.expiresAt),
      days_remaining: params.daysRemaining,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

// ============================================================================
// EMAIL QUEUE HELPERS
// ============================================================================

/**
 * Build email job payload for signing request
 */
export function buildSigningRequestJobPayload(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  config: EmailConfig
): {
  tenantId: string
  to: string
  templateId: string
  data: Record<string, unknown>
} {
  const signingUrl = signer.access_token
    ? generateSigningUrl(config.baseUrl, signer.access_token)
    : ''

  return {
    tenantId: tenantSlug,
    to: signer.email,
    templateId: 'esign-signature-request',
    data: {
      signer_name: signer.name,
      document_name: document.name,
      sender_name: document.created_by,
      message: document.message,
      signing_url: signingUrl,
      expires_at: document.expires_at ? formatDate(document.expires_at) : null,
      days_remaining: getDaysRemaining(document.expires_at),
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build email job payload for reminder
 */
export function buildReminderJobPayload(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner,
  config: EmailConfig
): {
  tenantId: string
  to: string
  templateId: string
  data: Record<string, unknown>
} {
  const signingUrl = signer.access_token
    ? generateSigningUrl(config.baseUrl, signer.access_token)
    : ''

  const daysSent = daysSinceSent(signer.sent_at)
  const daysRemaining = getDaysRemaining(document.expires_at)

  return {
    tenantId: tenantSlug,
    to: signer.email,
    templateId: 'esign-reminder',
    data: {
      signer_name: signer.name,
      document_name: document.name,
      signing_url: signingUrl,
      days_since_sent: daysSent,
      expires_at: document.expires_at ? formatDate(document.expires_at) : null,
      days_remaining: daysRemaining,
      is_urgent: daysRemaining !== null && daysRemaining <= 2,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

/**
 * Build email job payload for document completion
 */
export function buildCompletionJobPayload(
  tenantSlug: string,
  document: EsignDocument,
  recipient: EsignSigner,
  signerCount: number,
  config: EmailConfig
): {
  tenantId: string
  to: string
  templateId: string
  data: Record<string, unknown>
} {
  const downloadUrl = generateDownloadUrl(config.baseUrl, document.id, true)

  return {
    tenantId: tenantSlug,
    to: recipient.email,
    templateId: 'esign-document-complete',
    data: {
      recipient_name: recipient.name,
      document_name: document.name,
      completed_at: document.completed_at ? formatDateTime(document.completed_at) : formatDateTime(new Date()),
      download_url: downloadUrl,
      signed_pdf_url: document.signed_file_url,
      signer_count: signerCount,
      tenant_name: config.tenantName,
      tenant_logo: config.tenantLogo,
    },
  }
}

// ============================================================================
// BATCH EMAIL HELPERS
// ============================================================================

/**
 * Get all recipients who should receive completion notification
 */
export function getCompletionRecipients(signers: EsignSigner[]): EsignSigner[] {
  // All signers (not CC) receive completion notification
  return signers.filter((s) => s.role === 'signer')
}

/**
 * Get all CC recipients
 */
export function getCCRecipients(signers: EsignSigner[]): EsignSigner[] {
  return signers.filter((s) => s.role === 'cc')
}

/**
 * Get signers pending reminder
 */
export function getSignersPendingReminder(
  signers: EsignSigner[],
  document: EsignDocument,
  maxReminders: number = 5
): EsignSigner[] {
  if (!document.reminder_enabled) return []

  return signers.filter((s) => {
    // Only pending/sent/viewed signers
    if (!['pending', 'sent', 'viewed'].includes(s.status)) return false
    // Must be a signer role
    if (s.role !== 'signer') return false
    // Must not be internal
    if (s.is_internal) return false
    // Must have been sent
    if (!s.sent_at) return false

    // Check if reminder is due
    const daysSent = daysSinceSent(s.sent_at)
    const reminderCount = Math.floor(daysSent / document.reminder_days)

    // Don't exceed max reminders
    return reminderCount > 0 && reminderCount <= maxReminders
  })
}
