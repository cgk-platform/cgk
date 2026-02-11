/**
 * Creator-related types for the admin portal
 */

export type CreatorStatus =
  | 'applied'
  | 'reviewing'
  | 'approved'
  | 'onboarding'
  | 'active'
  | 'inactive'
  | 'rejected'

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Creator {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  display_name: string | null
  avatar_url: string | null
  status: CreatorStatus
  tier: CreatorTier | null
  phone: string | null
  bio: string | null
  social_links: Record<string, string> | null
  tags: string[]
  notes: string | null
  applied_at: string
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatorWithEarnings extends Creator {
  total_earned_cents: number
  pending_balance_cents: number
  available_balance_cents: number
  total_projects: number
}

export interface CreatorProject {
  id: string
  creator_id: string
  name: string
  status: string
  deliverables_count: number
  completed_deliverables: number
  total_value_cents: number
  earned_cents: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface CreatorEarning {
  id: string
  creator_id: string
  type: 'commission' | 'bonus' | 'adjustment' | 'payout'
  amount_cents: number
  description: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export interface CreatorFilters {
  page: number
  limit: number
  offset: number
  search: string
  status: string
  tier: string
  sort: string
  dir: 'asc' | 'desc'
}

export const CREATOR_STATUSES: CreatorStatus[] = [
  'applied',
  'reviewing',
  'approved',
  'onboarding',
  'active',
  'inactive',
  'rejected',
]

export const PIPELINE_STAGES: CreatorStatus[] = [
  'applied',
  'reviewing',
  'approved',
  'onboarding',
  'active',
]

export const CREATOR_TIERS: CreatorTier[] = ['bronze', 'silver', 'gold', 'platinum']

// Extended filters for directory with date range and tags
export interface CreatorDirectoryFilters extends CreatorFilters {
  tags: string[]
  dateFrom: string
  dateTo: string
  dateField: 'applied_at' | 'created_at' | 'last_active_at'
}

// Creator profile for create/edit modal
export interface CreatorProfile {
  id?: string
  email: string
  first_name: string
  last_name: string
  display_name?: string | null
  phone?: string | null
  bio?: string | null
  status: CreatorStatus
  tier?: CreatorTier | null
  commission_percent: number
  discount_code?: string | null
  tags: string[]
  shipping_address?: ShippingAddress | null
  social_links?: SocialLinks | null
  internal_notes?: string | null
}

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface SocialLinks {
  instagram?: string
  tiktok?: string
  youtube?: string
  portfolio_url?: string
}

// Creator stats for detail page
export interface CreatorStats {
  lifetime_earnings_cents: number
  this_month_earnings_cents: number
  pending_balance_cents: number
  projects_completed: number
  on_time_delivery_percent: number
  avg_response_hours: number
}

// Creator activity for timeline
export interface CreatorActivity {
  id: string
  type: 'project_submitted' | 'payment_received' | 'contract_signed' | 'message_sent' | 'status_changed'
  title: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// Conversation types for per-creator inbox
export type ConversationStatus = 'active' | 'archived' | 'spam'
export type MessageSenderType = 'creator' | 'admin' | 'system'

export interface CreatorConversation {
  id: string
  creator_id: string
  project_id?: string | null
  subject?: string | null
  status: ConversationStatus
  last_message_at: string
  last_message_preview?: string | null
  unread_creator: number
  unread_admin: number
  assigned_to?: string | null
  created_at: string
  updated_at: string
}

export interface CreatorMessage {
  id: string
  conversation_id: string
  sender_type: MessageSenderType
  sender_id?: string | null
  sender_name: string
  content: string
  content_html?: string | null
  attachments: MessageAttachment[]
  is_internal: boolean
  ai_generated: boolean
  scheduled_for?: string | null
  sent_at?: string | null
  read_at?: string | null
  created_at: string
}

export interface MessageAttachment {
  name: string
  url: string
  size: number
  type: string
}

// Bulk action types
export type BulkActionType = 'status' | 'tags' | 'tier' | 'message' | 'export' | 'deactivate' | 'delete'

export interface BulkAction {
  type: BulkActionType
  creatorIds: string[]
  payload?: {
    status?: CreatorStatus
    tags?: { add?: string[]; remove?: string[] }
    tier?: CreatorTier
    message?: { subject: string; content: string }
    exportFormat?: 'csv' | 'xlsx'
  }
}

// Export configuration
export interface ExportConfig {
  format: 'csv' | 'xlsx'
  fields: ExportField[]
  filters: Partial<CreatorDirectoryFilters>
  selectedIds?: string[]
  includeArchived: boolean
}

export type ExportField =
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'status'
  | 'tier'
  | 'commission_percent'
  | 'discount_code'
  | 'lifetime_earnings'
  | 'projects_completed'
  | 'last_active'
  | 'created_at'
  | 'tags'
  | 'address'

export const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  'name',
  'email',
  'status',
  'tier',
  'commission_percent',
  'discount_code',
  'lifetime_earnings',
  'projects_completed',
  'last_active',
]

export const ALL_EXPORT_FIELDS: { field: ExportField; label: string; default: boolean }[] = [
  { field: 'id', label: 'ID', default: false },
  { field: 'name', label: 'Name', default: true },
  { field: 'email', label: 'Email', default: true },
  { field: 'phone', label: 'Phone', default: false },
  { field: 'status', label: 'Status', default: true },
  { field: 'tier', label: 'Tier', default: true },
  { field: 'commission_percent', label: 'Commission %', default: true },
  { field: 'discount_code', label: 'Discount Code', default: true },
  { field: 'lifetime_earnings', label: 'Lifetime Earnings', default: true },
  { field: 'projects_completed', label: 'Projects Completed', default: true },
  { field: 'last_active', label: 'Last Active', default: true },
  { field: 'created_at', label: 'Created At', default: false },
  { field: 'tags', label: 'Tags', default: false },
  { field: 'address', label: 'Address', default: false },
]
