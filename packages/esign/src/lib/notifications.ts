/**
 * E-Sign Email Notifications
 * Handles sending signature request and status emails
 */

import type { EsignDocument, EsignSigner } from '../types.js'

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type EsignNotificationType =
  | 'signature_request'
  | 'signature_reminder'
  | 'document_signed'
  | 'document_completed'
  | 'document_declined'
  | 'document_voided'
  | 'document_expired'
  | 'counter_sign_needed'

export interface EsignNotificationPayload {
  type: EsignNotificationType
  document: EsignDocument
  signer: EsignSigner
  signingUrl?: string
  downloadUrl?: string
  customMessage?: string
  tenantName?: string
  tenantLogo?: string
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface NotificationConfig {
  baseUrl: string
  tenantName: string
  tenantLogo?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
}

// ============================================================================
// NOTIFICATION CONTENT GENERATION
// ============================================================================

/**
 * Generate email subject for notification type
 */
export function getNotificationSubject(
  type: EsignNotificationType,
  documentName: string,
  tenantName?: string
): string {
  const prefix = tenantName ? `[${tenantName}] ` : ''

  switch (type) {
    case 'signature_request':
      return `${prefix}Signature requested: ${documentName}`
    case 'signature_reminder':
      return `${prefix}Reminder: Please sign ${documentName}`
    case 'document_signed':
      return `${prefix}${documentName} has been signed`
    case 'document_completed':
      return `${prefix}${documentName} - All signatures complete`
    case 'document_declined':
      return `${prefix}${documentName} was declined`
    case 'document_voided':
      return `${prefix}${documentName} has been voided`
    case 'document_expired':
      return `${prefix}${documentName} has expired`
    case 'counter_sign_needed':
      return `${prefix}Counter-signature needed: ${documentName}`
    default:
      return `${prefix}Update on ${documentName}`
  }
}

/**
 * Generate signing URL for a signer
 */
export function generateSigningUrl(
  baseUrl: string,
  accessToken: string
): string {
  // Remove trailing slash from baseUrl if present
  const normalizedBase = baseUrl.replace(/\/$/, '')
  return `${normalizedBase}/sign/${accessToken}`
}

/**
 * Generate document download URL
 */
export function generateDownloadUrl(
  baseUrl: string,
  documentId: string,
  signed: boolean = false
): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const suffix = signed ? '?signed=true' : ''
  return `${normalizedBase}/documents/${documentId}/download${suffix}`
}

// ============================================================================
// EMAIL TEMPLATE DATA
// ============================================================================

export interface SignatureRequestEmailData {
  recipientName: string
  recipientEmail: string
  senderName: string
  documentName: string
  message?: string
  signingUrl: string
  expiresAt?: string
  tenantName: string
  tenantLogo?: string
}

export interface DocumentCompletedEmailData {
  recipientName: string
  recipientEmail: string
  documentName: string
  downloadUrl: string
  completedAt: string
  signers: Array<{
    name: string
    signedAt: string
  }>
  tenantName: string
  tenantLogo?: string
}

export interface ReminderEmailData {
  recipientName: string
  recipientEmail: string
  documentName: string
  signingUrl: string
  daysSent: number
  expiresAt?: string
  tenantName: string
}

/**
 * Build signature request email data
 */
export function buildSignatureRequestEmailData(
  payload: EsignNotificationPayload,
  config: NotificationConfig
): SignatureRequestEmailData {
  const signingUrl = payload.signingUrl || (
    payload.signer.access_token
      ? generateSigningUrl(config.baseUrl, payload.signer.access_token)
      : ''
  )

  return {
    recipientName: payload.signer.name,
    recipientEmail: payload.signer.email,
    senderName: payload.document.created_by,
    documentName: payload.document.name,
    message: payload.customMessage || payload.document.message || undefined,
    signingUrl,
    expiresAt: payload.document.expires_at
      ? formatDate(payload.document.expires_at)
      : undefined,
    tenantName: config.tenantName,
    tenantLogo: config.tenantLogo,
  }
}

/**
 * Build document completed email data
 */
export function buildDocumentCompletedEmailData(
  payload: EsignNotificationPayload,
  signers: Array<{ name: string; signed_at: Date | null }>,
  config: NotificationConfig
): DocumentCompletedEmailData {
  const downloadUrl = payload.downloadUrl || generateDownloadUrl(
    config.baseUrl,
    payload.document.id,
    true
  )

  return {
    recipientName: payload.signer.name,
    recipientEmail: payload.signer.email,
    documentName: payload.document.name,
    downloadUrl,
    completedAt: payload.document.completed_at
      ? formatDate(payload.document.completed_at)
      : formatDate(new Date()),
    signers: signers.map((s) => ({
      name: s.name,
      signedAt: s.signed_at ? formatDate(s.signed_at) : 'Pending',
    })),
    tenantName: config.tenantName,
    tenantLogo: config.tenantLogo,
  }
}

/**
 * Build reminder email data
 */
export function buildReminderEmailData(
  payload: EsignNotificationPayload,
  daysSent: number,
  config: NotificationConfig
): ReminderEmailData {
  const signingUrl = payload.signingUrl || (
    payload.signer.access_token
      ? generateSigningUrl(config.baseUrl, payload.signer.access_token)
      : ''
  )

  return {
    recipientName: payload.signer.name,
    recipientEmail: payload.signer.email,
    documentName: payload.document.name,
    signingUrl,
    daysSent,
    expiresAt: payload.document.expires_at
      ? formatDate(payload.document.expires_at)
      : undefined,
    tenantName: config.tenantName,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format date for display in emails
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate days since document was sent
 */
export function daysSinceSent(sentAt: Date | null): number {
  if (!sentAt) return 0
  const now = new Date()
  const sent = typeof sentAt === 'string' ? new Date(sentAt) : sentAt
  const diffMs = now.getTime() - sent.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if document is due for reminder
 */
export function isDueForReminder(
  document: EsignDocument,
  signer: EsignSigner
): boolean {
  if (!document.reminder_enabled) return false
  if (signer.status !== 'sent' && signer.status !== 'viewed') return false
  if (!signer.sent_at) return false

  const lastAction = document.last_reminder_at || signer.sent_at
  const lastActionDate = typeof lastAction === 'string' ? new Date(lastAction) : lastAction
  const daysSince = Math.floor(
    (Date.now() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSince >= document.reminder_days
}

/**
 * Get CC recipients for a document
 */
export function getCCRecipientsForNotification(
  signers: EsignSigner[],
  notificationType: EsignNotificationType
): EsignSigner[] {
  // CC recipients only receive completion and decline notifications
  const ccNotificationTypes: EsignNotificationType[] = [
    'document_completed',
    'document_declined',
    'document_voided',
  ]

  if (!ccNotificationTypes.includes(notificationType)) {
    return []
  }

  return signers.filter((s) => s.role === 'cc')
}

// ============================================================================
// NOTIFICATION QUEUE INTEGRATION
// ============================================================================

/**
 * Queue entry data for esign notifications
 * Compatible with @cgk-platform/communications queue
 */
export interface EsignQueueEntryData {
  type: EsignNotificationType
  document_id: string
  signer_id: string
  tenant_slug: string
  payload: Record<string, unknown>
}

/**
 * Build queue entry for signature request
 */
export function buildSignatureRequestQueueEntry(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner
): EsignQueueEntryData {
  return {
    type: 'signature_request',
    document_id: document.id,
    signer_id: signer.id,
    tenant_slug: tenantSlug,
    payload: {
      document_name: document.name,
      signer_name: signer.name,
      signer_email: signer.email,
      access_token: signer.access_token,
      message: document.message,
      expires_at: document.expires_at?.toISOString(),
    },
  }
}

/**
 * Build queue entry for reminder
 */
export function buildReminderQueueEntry(
  tenantSlug: string,
  document: EsignDocument,
  signer: EsignSigner
): EsignQueueEntryData {
  return {
    type: 'signature_reminder',
    document_id: document.id,
    signer_id: signer.id,
    tenant_slug: tenantSlug,
    payload: {
      document_name: document.name,
      signer_name: signer.name,
      signer_email: signer.email,
      access_token: signer.access_token,
      days_since_sent: daysSinceSent(signer.sent_at),
      expires_at: document.expires_at?.toISOString(),
    },
  }
}

/**
 * Build queue entry for completion notification
 */
export function buildCompletionQueueEntry(
  tenantSlug: string,
  document: EsignDocument,
  recipient: EsignSigner
): EsignQueueEntryData {
  return {
    type: 'document_completed',
    document_id: document.id,
    signer_id: recipient.id,
    tenant_slug: tenantSlug,
    payload: {
      document_name: document.name,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      completed_at: document.completed_at?.toISOString(),
      signed_file_url: document.signed_file_url,
    },
  }
}
