/**
 * Email Template Types
 *
 * @ai-pattern email-templates
 * @ai-note All template operations must use tenant context
 */

/**
 * Template categories
 */
export type TemplateCategory = 'transactional' | 'marketing'

/**
 * Notification types supported by the system
 */
export type NotificationType =
  | 'review_request'
  | 'review_reminder'
  | 'review_thank_you'
  | 'creator_application_approved'
  | 'creator_application_rejected'
  | 'creator_onboarding_reminder'
  | 'creator_project_assigned'
  | 'creator_revision_requested'
  | 'creator_payment_available'
  | 'creator_monthly_summary'
  | 'esign_signing_request'
  | 'esign_reminder'
  | 'esign_completed'
  | 'esign_void_notification'
  | 'subscription_welcome'
  | 'subscription_renewal_reminder'
  | 'subscription_payment_failed'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'treasury_approval_request'
  | 'treasury_approved'
  | 'treasury_rejected'
  | 'team_invitation'
  | 'team_invitation_reminder'
  | 'password_reset'
  | 'magic_link'

/**
 * Variable types for template placeholders
 */
export type VariableType = 'string' | 'number' | 'date' | 'currency' | 'url'

/**
 * Template variable definition
 */
export interface TemplateVariable {
  key: string
  description: string
  example: string
  type: VariableType
  required?: boolean
}

/**
 * Email template as stored in database
 */
export interface EmailTemplate {
  id: string
  notificationType: NotificationType | string
  templateKey: string
  category: TemplateCategory
  name: string
  description: string | null
  subject: string
  bodyHtml: string
  bodyText: string | null
  senderAddressId: string | null
  senderName: string | null
  senderEmail: string | null
  replyToEmail: string | null
  isActive: boolean
  version: number
  isDefault: boolean
  lastEditedBy: string | null
  lastEditedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Email template version for history
 */
export interface EmailTemplateVersion {
  id: string
  templateId: string
  version: number
  subject: string
  bodyHtml: string
  bodyText: string | null
  changedBy: string | null
  changeNote: string | null
  createdAt: Date
}

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  notificationType: string
  templateKey: string
  category?: TemplateCategory
  name: string
  description?: string
  subject: string
  bodyHtml: string
  bodyText?: string
  senderAddressId?: string
  senderName?: string
  senderEmail?: string
  replyToEmail?: string
  isDefault?: boolean
}

/**
 * Input for updating a template
 */
export interface UpdateTemplateInput {
  name?: string
  description?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
  senderAddressId?: string
  senderName?: string
  senderEmail?: string
  replyToEmail?: string
  isActive?: boolean
  changeNote?: string
}

/**
 * Default template definition (system-provided)
 */
export interface DefaultTemplate {
  notificationType: string
  templateKey: string
  category: TemplateCategory
  name: string
  description: string
  subject: string
  bodyHtml: string
}

/**
 * Render options for template rendering
 */
export interface RenderOptions {
  tenantId: string
  notificationType: string
  templateKey?: string
  variables: Record<string, string | number | Date | undefined>
}

/**
 * Rendered email ready for sending
 */
export interface RenderedEmail {
  subject: string
  bodyHtml: string
  bodyText: string
  senderAddress: string
  senderName: string
  replyTo?: string
}

/**
 * Template preview input
 */
export interface PreviewInput {
  subject: string
  bodyHtml: string
  variables: Record<string, string | number>
}

/**
 * Template test send input
 */
export interface TestSendInput {
  templateId: string
  recipientEmail: string
  variables?: Record<string, string | number>
}

/**
 * Template list filters
 */
export interface TemplateFilters {
  category?: TemplateCategory
  notificationType?: string
  isActive?: boolean
  search?: string
}
