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

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export const WORKFLOW_STATUSES = ['draft', 'active', 'archived'] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const WORKFLOW_STEP_TYPES = ['sequential', 'parallel'] as const
export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number]

export const WORKFLOW_TRIGGER_TYPES = [
  'creator_onboarding',
  'manual',
  'api',
  'scheduled',
] as const
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number]

export const WORKFLOW_CONDITION_TYPES = [
  'all_signed',
  'any_signed',
  'field_value',
  'custom',
] as const
export type WorkflowConditionType = (typeof WORKFLOW_CONDITION_TYPES)[number]

/**
 * Workflow step condition for conditional routing
 */
export interface WorkflowCondition {
  type: WorkflowConditionType
  /** For field_value: field ID to check */
  field_id?: string
  /** For field_value: expected value */
  expected_value?: string
  /** For custom: custom expression */
  expression?: string
}

/**
 * Workflow step configuration
 */
export interface WorkflowStep {
  id: string
  /** Step order (1-based) */
  order: number
  /** Sequential or parallel execution */
  type: WorkflowStepType
  /** Step name for display */
  name: string
  /** Template to use for this step */
  template_id: string
  /** Signers configuration for this step */
  signers: Array<{
    /** Role identifier (e.g., 'creator', 'admin', 'witness') */
    role: string
    /** Is this an internal (counter) signer? */
    is_internal: boolean
    /** Signing order within this step */
    signing_order: number
    /** Email template to use */
    email_template_id?: string
  }>
  /** Condition to proceed to next step (optional) */
  proceed_condition?: WorkflowCondition
  /** Auto-proceed after this many days if condition not met */
  timeout_days?: number
  /** What to do on timeout: skip, remind, or fail */
  timeout_action?: 'skip' | 'remind' | 'fail'
}

/**
 * Workflow template for reusable signing workflows
 */
export interface EsignWorkflow {
  id: string
  name: string
  description: string | null
  trigger_type: WorkflowTriggerType
  status: WorkflowStatus
  /** Ordered steps in the workflow */
  steps: WorkflowStep[]
  /** Default message for all documents */
  default_message: string | null
  /** Default expiration in days */
  default_expires_days: number | null
  /** Reminder settings */
  reminder_enabled: boolean
  reminder_days: number
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  trigger_type: WorkflowTriggerType
  steps: WorkflowStep[]
  default_message?: string
  default_expires_days?: number
  reminder_enabled?: boolean
  reminder_days?: number
  created_by: string
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  status?: WorkflowStatus
  steps?: WorkflowStep[]
  default_message?: string
  default_expires_days?: number
  reminder_enabled?: boolean
  reminder_days?: number
}

/**
 * Workflow execution instance
 */
export interface WorkflowExecution {
  id: string
  workflow_id: string
  /** Current step being executed */
  current_step: number
  /** Overall execution status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  /** Context data for variable replacement */
  context: Record<string, unknown>
  /** Documents created during execution */
  document_ids: string[]
  /** Error message if failed */
  error_message: string | null
  /** User or system that triggered the workflow */
  triggered_by: string
  started_at: Date
  completed_at: Date | null
  created_at: Date
}

export interface CreateWorkflowExecutionInput {
  workflow_id: string
  context: Record<string, unknown>
  triggered_by: string
}

/**
 * Counter-signature pending item for admin queue
 */
export interface CounterSignPending {
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
}

/**
 * Signature data from capture
 */
export interface SignatureData {
  type: SignatureType
  /** Base64 image data or typed text */
  data: string
  /** Font name for typed signatures */
  font_name?: string
}

/**
 * Result of completing a signing
 */
export interface CompleteSigningResult {
  success: boolean
  documentCompleted: boolean
  signedAt: Date
  nextSigners: EsignSigner[]
}
