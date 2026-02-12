/**
 * E-Signature Types for Creator Portal
 */

export type DocumentStatus =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'expired'

export type SignerStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'

export type SignerRole = 'signer' | 'cc' | 'viewer' | 'approver'

export type FieldType =
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

export type SignatureType = 'drawn' | 'typed' | 'uploaded'

export interface EsignDocument {
  id: string
  templateId: string | null
  creatorId: string | null
  name: string
  fileUrl: string
  signedFileUrl: string | null
  status: DocumentStatus
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

export interface EsignSigner {
  id: string
  documentId: string
  name: string
  email: string
  role: SignerRole
  signingOrder: number
  status: SignerStatus
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

export interface EsignField {
  id: string
  documentId: string
  signerId: string | null
  templateFieldId: string | null
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  placeholder: string | null
  defaultValue: string | null
  options: unknown
  validation: unknown
  groupId: string | null
  formula: string | null
  readOnly: boolean
  value: string | null
  filledAt: Date | null
  createdAt: Date
}

export interface EsignSignature {
  id: string
  signerId: string
  type: SignatureType
  imageUrl: string
  fontName: string | null
  createdAt: Date
}

export interface SigningSession {
  document: EsignDocument
  signer: EsignSigner
  fields: EsignField[]
  existingSignature: EsignSignature | null
}

export interface SignDocumentInput {
  signatureData: string  // Base64 encoded signature image or typed name
  signatureType: SignatureType
  fontName?: string
  fieldValues?: Record<string, string>
}

export type AuditAction =
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
