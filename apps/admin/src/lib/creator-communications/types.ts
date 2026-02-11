/**
 * Creator Communications Types
 * PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS
 */

// ============================================================
// Email Templates
// ============================================================

export type TemplateCategory = 'onboarding' | 'projects' | 'payments' | 'esign' | 'general'

export interface CreatorEmailTemplate {
  id: string
  category: TemplateCategory
  name: string
  slug: string
  description: string | null
  subject: string
  content_html: string
  content_text: string | null
  variables: TemplateVariable[]
  from_address: string | null
  reply_to: string | null
  is_default: boolean
  is_enabled: boolean
  version: number
  created_by: string | null
  last_edited_by: string | null
  last_edited_at: string | null
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  description: string
  example: string
  required?: boolean
}

export interface TemplateVersion {
  id: string
  template_id: string
  version: number
  subject: string
  content_html: string
  content_text: string | null
  variables: TemplateVariable[]
  changed_by: string | null
  change_note: string | null
  created_at: string
}

export interface CreateTemplateInput {
  category: TemplateCategory
  name: string
  slug: string
  description?: string
  subject: string
  content_html: string
  content_text?: string
  variables?: TemplateVariable[]
  from_address?: string
  reply_to?: string
  is_default?: boolean
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  subject?: string
  content_html?: string
  content_text?: string
  variables?: TemplateVariable[]
  from_address?: string
  reply_to?: string
  is_enabled?: boolean
  change_note?: string
}

// ============================================================
// Email Queue
// ============================================================

export type QueueStatus = 'pending' | 'scheduled' | 'processing' | 'sent' | 'failed' | 'bounced' | 'cancelled'

export interface CreatorQueueEntry {
  id: string
  creator_id: string
  creator_email: string
  creator_name: string | null
  template_id: string | null
  template_name: string | null
  subject: string
  status: QueueStatus
  scheduled_for: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  failed_reason: string | null
  retry_count: number
  resend_message_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface QueueStats {
  total_pending: number
  sent_today: number
  failed_count: number
  open_rate_7d: number
  click_rate_7d: number
}

export interface QueueFilters {
  status?: QueueStatus | QueueStatus[]
  creator_id?: string
  template_id?: string
  date_from?: string
  date_to?: string
  page: number
  limit: number
}

// ============================================================
// Notification Settings
// ============================================================

export type NotificationCategory = 'onboarding' | 'projects' | 'payments' | 'esign'

export interface NotificationSetting {
  id: string
  notification_type: string
  display_name: string
  description: string | null
  category: NotificationCategory
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  template_id: string | null
  delay_minutes: number
  subject_override: string | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UpdateNotificationSettingInput {
  email_enabled?: boolean
  sms_enabled?: boolean
  push_enabled?: boolean
  template_id?: string | null
  delay_minutes?: number
  subject_override?: string | null
  is_enabled?: boolean
}

// ============================================================
// Bulk Sends
// ============================================================

export type BulkSendStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled'

export interface BulkSend {
  id: string
  name: string | null
  subject: string
  content_html: string
  content_text: string | null
  recipient_count: number
  recipient_filter: RecipientFilter | null
  recipient_ids: string[] | null
  status: BulkSendStatus
  scheduled_for: string | null
  started_at: string | null
  completed_at: string | null
  sent_count: number
  failed_count: number
  open_count: number
  click_count: number
  personalize: boolean
  include_unsubscribe: boolean
  send_as_separate_threads: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RecipientFilter {
  status?: string[]
  tier?: string[]
  tags?: string[]
  last_activity_days?: number
}

export interface BulkSendRecipient {
  id: string
  bulk_send_id: string
  creator_id: string
  creator_email: string
  creator_name: string | null
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  resend_message_id: string | null
  error_message: string | null
  created_at: string
}

export interface CreateBulkSendInput {
  name?: string
  subject: string
  content_html: string
  content_text?: string
  recipient_filter?: RecipientFilter
  recipient_ids?: string[]
  scheduled_for?: string
  personalize?: boolean
  include_unsubscribe?: boolean
  send_as_separate_threads?: boolean
}

// ============================================================
// Inbox / Conversations
// ============================================================

export type ThreadStatus = 'open' | 'pending' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'

export interface Conversation {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  creator_avatar_url: string | null
  subject: string | null
  status: ThreadStatus
  unread_count: number
  message_count: number
  last_message_at: string | null
  last_message_preview: string | null
  assigned_to: string | null
  assigned_name: string | null
  project_id: string | null
  project_name: string | null
  is_starred: boolean
  is_archived: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  thread_id: string
  direction: MessageDirection
  from_address: string
  to_address: string | null
  subject: string | null
  body_text: string | null
  body_html: string | null
  attachments: MessageAttachment[]
  is_internal: boolean
  scheduled_for: string | null
  sender_user_id: string | null
  sender_name: string | null
  status: 'received' | 'sent' | 'failed' | 'scheduled'
  read_at: string | null
  created_at: string
}

export interface MessageAttachment {
  filename: string
  content_type: string
  size_bytes: number
  blob_url: string
}

export interface ConversationFilters {
  status?: ThreadStatus
  assigned_to?: string
  creator_id?: string
  project_id?: string
  has_attachments?: boolean
  is_starred?: boolean
  is_archived?: boolean
  search?: string
  date_from?: string
  date_to?: string
  page: number
  limit: number
}

export interface SendMessageInput {
  thread_id: string
  content: string
  is_internal?: boolean
  scheduled_for?: string
  attachments?: File[]
}

export interface ComposeMessageInput {
  creator_id: string
  subject?: string
  content: string
  is_internal?: boolean
}

// ============================================================
// Global Settings
// ============================================================

export interface CommunicationSettings {
  id: string
  default_from_address: string | null
  default_reply_to: string | null
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_timezone: string
  unsubscribe_footer_enabled: boolean
  unsubscribe_url: string | null
  max_emails_per_day: number
  max_bulk_recipients: number
  bulk_send_rate_per_minute: number
  created_at: string
  updated_at: string
}

// ============================================================
// Template Variables Reference
// ============================================================

export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  creator: [
    { key: 'creator_name', description: 'Creator full name', example: 'Jane Doe', required: true },
    { key: 'creator_first_name', description: 'Creator first name', example: 'Jane' },
    { key: 'creator_email', description: 'Creator email address', example: 'jane@example.com' },
    { key: 'discount_code', description: 'Creator discount code', example: 'JANE20' },
    { key: 'commission_rate', description: 'Commission percentage', example: '15' },
    { key: 'portal_url', description: 'Link to creator portal', example: 'https://portal.brand.com' },
  ],
  project: [
    { key: 'project_name', description: 'Project title', example: 'Summer Campaign 2026' },
    { key: 'project_due_date', description: 'Project deadline', example: 'March 15, 2026' },
    { key: 'project_value', description: 'Project payment amount', example: '$500.00' },
    { key: 'project_url', description: 'Link to project in portal', example: 'https://portal.brand.com/projects/123' },
  ],
  payment: [
    { key: 'payment_amount', description: 'Payment amount', example: '$250.00' },
    { key: 'payment_method', description: 'Payment method used', example: 'PayPal' },
    { key: 'payment_date', description: 'Payment processing date', example: 'February 10, 2026' },
    { key: 'available_balance', description: 'Current available balance', example: '$1,250.00' },
  ],
  esign: [
    { key: 'document_name', description: 'Document title', example: 'Creator Agreement 2026' },
    { key: 'signing_url', description: 'Unique signing link', example: 'https://sign.brand.com/abc123' },
    { key: 'expiry_date', description: 'Signature deadline', example: 'February 20, 2026' },
  ],
  brand: [
    { key: 'brand_name', description: 'Tenant brand name', example: 'RAWDOG' },
    { key: 'support_email', description: 'Support email address', example: 'support@rawdog.com' },
    { key: 'website_url', description: 'Brand website URL', example: 'https://rawdog.com' },
  ],
  system: [
    { key: 'current_date', description: "Today's date", example: 'February 10, 2026' },
    { key: 'current_year', description: 'Current year', example: '2026' },
  ],
}

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'projects', label: 'Projects' },
  { value: 'payments', label: 'Payments' },
  { value: 'esign', label: 'E-Sign' },
  { value: 'general', label: 'General' },
]

export const NOTIFICATION_TYPES = [
  'application_received',
  'application_approved',
  'application_rejected',
  'project_assigned',
  'deadline_reminder',
  'revision_requested',
  'project_approved',
  'payment_available',
  'withdrawal_processed',
  'payment_failed',
  'esign_request',
  'esign_reminder',
  'document_completed',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
