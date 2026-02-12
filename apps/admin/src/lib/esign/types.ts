/**
 * E-Signature Admin Types
 *
 * Types for the e-signature admin system including documents,
 * templates, bulk sends, webhooks, and in-person signing.
 */

// Document status
export type EsignDocumentStatus =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'expired'

// Signer status
export type EsignSignerStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'

// Signer role
export type EsignSignerRole = 'signer' | 'cc' | 'viewer' | 'approver'

// Template status
export type EsignTemplateStatus = 'draft' | 'active' | 'archived'

// Bulk send status
export type EsignBulkSendStatus =
  | 'queued'
  | 'sending'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'

// Webhook events
export type EsignWebhookEvent =
  | 'document.sent'
  | 'document.viewed'
  | 'document.signed'
  | 'document.completed'
  | 'document.declined'
  | 'document.expired'
  | 'document.voided'

// Field types
export type EsignFieldType =
  | 'signature'
  | 'initial'
  | 'date_signed'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'checkbox_group'
  | 'radio_group'
  | 'dropdown'
  | 'name'
  | 'email'
  | 'company'
  | 'title'
  | 'attachment'
  | 'formula'
  | 'note'

// In-person session status
export type EsignInPersonSessionStatus =
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled'

// Audit action types
export type EsignAuditAction =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'field_filled'
  | 'signed'
  | 'declined'
  | 'voided'
  | 'reminder_sent'
  | 'resent'
  | 'counter_signed'
  | 'in_person_started'
  | 'in_person_completed'
  | 'expired'
  | 'downloaded'
  | 'forwarded'

// Base document type
export interface EsignDocument {
  id: string
  templateId: string | null
  creatorId: string | null
  name: string
  fileUrl: string
  signedFileUrl: string | null
  status: EsignDocumentStatus
  expiresAt: Date | null
  reminderEnabled: boolean
  reminderDays: number
  lastReminderAt: Date | null
  message: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

// Signer type
export interface EsignSigner {
  id: string
  documentId: string
  name: string
  email: string
  role: EsignSignerRole
  signingOrder: number
  status: EsignSignerStatus
  accessToken: string | null
  isInternal: boolean
  ipAddress: string | null
  userAgent: string | null
  sentAt: Date | null
  viewedAt: Date | null
  signedAt: Date | null
  declinedAt: Date | null
  declineReason: string | null
  createdAt: Date
}

// Document with signers
export interface EsignDocumentWithSigners extends EsignDocument {
  signers: EsignSigner[]
  templateName?: string
  creatorName?: string
  creatorEmail?: string
}

// Template type
export interface EsignTemplate {
  id: string
  name: string
  description: string | null
  fileUrl: string
  fileSize: number | null
  pageCount: number | null
  thumbnailUrl: string | null
  status: EsignTemplateStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Template field type
export interface EsignTemplateField {
  id: string
  templateId: string
  type: EsignFieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  placeholder: string | null
  defaultValue: string | null
  options: Record<string, unknown> | null
  validation: Record<string, unknown>
  groupId: string | null
  formula: string | null
  readOnly: boolean
  signerOrder: number
  createdAt: Date
}

// Template with fields
export interface EsignTemplateWithFields extends EsignTemplate {
  fields: EsignTemplateField[]
}

// Document field type
export interface EsignField {
  id: string
  documentId: string
  signerId: string | null
  templateFieldId: string | null
  type: EsignFieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  placeholder: string | null
  defaultValue: string | null
  options: Record<string, unknown> | null
  validation: Record<string, unknown>
  groupId: string | null
  formula: string | null
  readOnly: boolean
  value: string | null
  filledAt: Date | null
  createdAt: Date
}

// Bulk send type
export interface EsignBulkSend {
  id: string
  templateId: string | null
  name: string | null
  recipientCount: number
  status: EsignBulkSendStatus
  scheduledFor: Date | null
  startedAt: Date | null
  completedAt: Date | null
  sentCount: number
  failedCount: number
  csvData: Record<string, unknown> | null
  errorLog: Array<{
    recipientEmail: string
    error: string
    timestamp: string
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Bulk send recipient type
export interface EsignBulkSendRecipient {
  id: string
  bulkSendId: string
  documentId: string | null
  name: string
  email: string
  customFields: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed'
  errorMessage: string | null
  sentAt: Date | null
  createdAt: Date
}

// Webhook type
export interface EsignWebhook {
  id: string
  name: string
  endpointUrl: string
  secretKey: string
  events: EsignWebhookEvent[]
  isActive: boolean
  lastTriggeredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Webhook delivery type
export interface EsignWebhookDelivery {
  id: string
  webhookId: string
  documentId: string | null
  event: EsignWebhookEvent
  payload: Record<string, unknown>
  requestHeaders: Record<string, string> | null
  responseStatus: number | null
  responseBody: string | null
  responseHeaders: Record<string, string> | null
  success: boolean
  durationMs: number | null
  retryCount: number
  nextRetryAt: Date | null
  deliveredAt: Date
}

// In-person session type
export interface EsignInPersonSession {
  id: string
  documentId: string
  signerId: string
  sessionToken: string
  pinHash: string | null
  status: EsignInPersonSessionStatus
  startedBy: string
  deviceInfo: Record<string, unknown> | null
  startedAt: Date
  completedAt: Date | null
  expiresAt: Date
}

// Audit log entry type
export interface EsignAuditLogEntry {
  id: string
  documentId: string
  signerId: string | null
  action: EsignAuditAction
  details: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  performedBy: string
  createdAt: Date
}

// Reminder config type
export interface EsignReminderConfig {
  id: string
  documentId: string
  reminderEnabled: boolean
  reminderFrequencyDays: number
  maxReminders: number
  reminderCount: number
  nextReminderAt: Date | null
  lastReminderAt: Date | null
  customMessage: string | null
  createdAt: Date
  updatedAt: Date
}

// Dashboard stats type
export interface EsignDashboardStats {
  pendingSignatures: number
  inProgress: number
  completedThisMonth: number
  counterSignQueue: number
  documentsByStatus: Record<EsignDocumentStatus, number>
  completionRate: number
  avgTimeToComplete: number // in hours
  recentDocuments: EsignDocumentWithSigners[]
}

// Report data type
export interface EsignReportData {
  period: {
    start: Date
    end: Date
  }
  documentsSent: number
  completionRate: number
  avgTimeToComplete: number
  declineRate: number
  expirationRate: number
  topTemplates: Array<{
    templateId: string
    templateName: string
    documentCount: number
  }>
  documentsByStatus: Record<EsignDocumentStatus, number>
  completionTrend: Array<{
    date: string
    sent: number
    completed: number
  }>
  timeToCompleteDistribution: Array<{
    bucket: string
    count: number
  }>
}

// Filter options for documents list
export interface EsignDocumentFilters {
  status?: EsignDocumentStatus
  templateId?: string
  creatorId?: string
  dateFrom?: Date
  dateTo?: Date
  expiresWithinDays?: number
  search?: string
}

// Pending documents by category
export interface EsignPendingDocuments {
  awaitingYourSignature: EsignDocumentWithSigners[]
  overdue: EsignDocumentWithSigners[]
  expiringSoon: EsignDocumentWithSigners[]
  stale: EsignDocumentWithSigners[]
}

// Create document input
export interface CreateEsignDocumentInput {
  templateId: string
  creatorId?: string
  signers: Array<{
    name: string
    email: string
    role?: EsignSignerRole
    signingOrder?: number
    isInternal?: boolean
  }>
  message?: string
  expiresAt?: Date
  reminderEnabled?: boolean
  reminderDays?: number
}

// Create bulk send input
export interface CreateBulkSendInput {
  templateId: string
  name?: string
  recipients: Array<{
    name: string
    email: string
    customFields?: Record<string, string>
  }>
  message?: string
  expiresInDays?: number
  scheduledFor?: Date
}

// Create webhook input
export interface CreateWebhookInput {
  name: string
  endpointUrl: string
  events: EsignWebhookEvent[]
}

// Update webhook input
export interface UpdateWebhookInput {
  name?: string
  endpointUrl?: string
  events?: EsignWebhookEvent[]
  isActive?: boolean
}

// Counter-sign input
export interface CounterSignInput {
  fields: Array<{
    fieldId: string
    value: string
  }>
  signatureData: string // Base64 encoded signature
}

// In-person sign input
export interface InPersonSignInput {
  fields: Array<{
    fieldId: string
    value: string
  }>
  signatureData: string
}

// Webhook payload structure
export interface EsignWebhookPayload {
  event: EsignWebhookEvent
  timestamp: string
  data: {
    documentId: string
    documentName: string
    templateId: string | null
    creatorId: string | null
    signers: Array<{
      email: string
      name: string
      status: EsignSignerStatus
      signedAt: string | null
    }>
    signedPdfUrl?: string
  }
  signature?: string
}
