/**
 * E-Signature System Types
 * Core type definitions for templates, documents, signers, and fields
 */

// ============================================================================
// ENUMS / CONSTANTS
// ============================================================================

export const TEMPLATE_STATUSES = ['draft', 'active', 'archived'] as const
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]

export const DOCUMENT_STATUSES = [
  'draft',
  'pending',
  'in_progress',
  'completed',
  'declined',
  'voided',
  'expired',
] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const SIGNER_STATUSES = ['pending', 'sent', 'viewed', 'signed', 'declined'] as const
export type SignerStatus = (typeof SIGNER_STATUSES)[number]

export const SIGNER_ROLES = ['signer', 'cc', 'viewer', 'approver'] as const
export type SignerRole = (typeof SIGNER_ROLES)[number]

export const FIELD_TYPES = [
  'signature',
  'initial',
  'date_signed',
  'text',
  'textarea',
  'number',
  'date',
  'checkbox',
  'checkbox_group',
  'radio_group',
  'dropdown',
  'name',
  'email',
  'company',
  'title',
  'attachment',
  'formula',
  'note',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const SIGNATURE_TYPES = ['drawn', 'typed', 'uploaded'] as const
export type SignatureType = (typeof SIGNATURE_TYPES)[number]

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface FieldValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  decimals?: number
  minDate?: string
  maxDate?: string
  format?: string
  minSelected?: number
  maxSelected?: number
  expression?: string
  allowedTypes?: string[]
  maxSizeMB?: number
}

export interface FieldOption {
  label: string
  value: string
}

// ============================================================================
// TEMPLATES
// ============================================================================

export interface EsignTemplate {
  id: string
  name: string
  description: string | null
  file_url: string
  file_size: number | null
  page_count: number | null
  thumbnail_url: string | null
  status: TemplateStatus
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface CreateTemplateInput {
  name: string
  description?: string
  file_url: string
  file_size?: number
  page_count?: number
  thumbnail_url?: string
  created_by: string
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  status?: TemplateStatus
  page_count?: number
  thumbnail_url?: string
}

// ============================================================================
// TEMPLATE FIELDS
// ============================================================================

export interface EsignTemplateField {
  id: string
  template_id: string
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  placeholder: string | null
  default_value: string | null
  options: FieldOption[] | null
  validation: FieldValidation
  group_id: string | null
  formula: string | null
  read_only: boolean
  signer_order: number
  created_at: Date
}

export interface CreateTemplateFieldInput {
  template_id: string
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required?: boolean
  placeholder?: string
  default_value?: string
  options?: FieldOption[]
  validation?: FieldValidation
  group_id?: string
  formula?: string
  read_only?: boolean
  signer_order?: number
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export interface EsignDocument {
  id: string
  template_id: string | null
  creator_id: string | null
  name: string
  file_url: string
  signed_file_url: string | null
  status: DocumentStatus
  expires_at: Date | null
  reminder_enabled: boolean
  reminder_days: number
  last_reminder_at: Date | null
  message: string | null
  created_by: string
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

export interface CreateDocumentInput {
  template_id?: string
  creator_id?: string
  name: string
  file_url: string
  expires_at?: Date
  reminder_enabled?: boolean
  reminder_days?: number
  message?: string
  created_by: string
}

export interface UpdateDocumentInput {
  name?: string
  status?: DocumentStatus
  signed_file_url?: string
  expires_at?: Date
  reminder_enabled?: boolean
  reminder_days?: number
  message?: string
  completed_at?: Date
}

// ============================================================================
// SIGNERS
// ============================================================================

export interface EsignSigner {
  id: string
  document_id: string
  name: string
  email: string
  role: SignerRole
  signing_order: number
  status: SignerStatus
  access_token: string | null
  is_internal: boolean
  ip_address: string | null
  user_agent: string | null
  sent_at: Date | null
  viewed_at: Date | null
  signed_at: Date | null
  declined_at: Date | null
  decline_reason: string | null
  created_at: Date
}

export interface CreateSignerInput {
  document_id: string
  name: string
  email: string
  role?: SignerRole
  signing_order?: number
  access_token?: string
  is_internal?: boolean
}

export interface UpdateSignerInput {
  name?: string
  email?: string
  role?: SignerRole
  signing_order?: number
  status?: SignerStatus
  ip_address?: string
  user_agent?: string
  signed_at?: Date
  declined_at?: Date
  decline_reason?: string
  viewed_at?: Date
  sent_at?: Date
}

// ============================================================================
// DOCUMENT FIELDS
// ============================================================================

export interface EsignField {
  id: string
  document_id: string
  signer_id: string | null
  template_field_id: string | null
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  placeholder: string | null
  default_value: string | null
  options: FieldOption[] | null
  validation: FieldValidation
  group_id: string | null
  formula: string | null
  read_only: boolean
  value: string | null
  filled_at: Date | null
  created_at: Date
}

export interface CreateFieldInput {
  document_id: string
  signer_id?: string
  template_field_id?: string
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  required?: boolean
  placeholder?: string
  default_value?: string
  options?: FieldOption[]
  validation?: FieldValidation
  group_id?: string
  formula?: string
  read_only?: boolean
}

export interface UpdateFieldInput {
  signer_id?: string
  type?: FieldType
  page?: number
  x?: number
  y?: number
  width?: number
  height?: number
  required?: boolean
  placeholder?: string
  default_value?: string
  options?: FieldOption[]
  validation?: FieldValidation
  group_id?: string
  formula?: string
  read_only?: boolean
  value?: string
  filled_at?: Date
}

// ============================================================================
// SIGNATURES
// ============================================================================

export interface EsignSignature {
  id: string
  signer_id: string
  type: SignatureType
  image_url: string
  font_name: string | null
  created_at: Date
}

export interface CreateSignatureInput {
  signer_id: string
  type: SignatureType
  image_url: string
  font_name?: string
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

export interface TemplateWithFields extends EsignTemplate {
  fields: EsignTemplateField[]
}

export interface DocumentWithSigners extends EsignDocument {
  signers: EsignSigner[]
  fields: EsignField[]
  template: EsignTemplate | null
}

export interface SigningSession {
  document: EsignDocument
  signer: EsignSigner
  fields: EsignField[]
  template: EsignTemplate | null
}

// ============================================================================
// LIST OPTIONS
// ============================================================================

export interface ListTemplatesOptions {
  status?: TemplateStatus | 'all'
  limit?: number
  offset?: number
  search?: string
}

export interface ListDocumentsOptions {
  status?: DocumentStatus | 'all'
  creatorId?: string
  createdBy?: string
  limit?: number
  offset?: number
  search?: string
}
