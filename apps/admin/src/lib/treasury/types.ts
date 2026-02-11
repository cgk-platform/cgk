/**
 * Treasury-related types for the admin portal
 */

// Balance Types
export type BalanceProvider = 'stripe' | 'wise' | 'bank'

export interface ProviderBalance {
  provider: BalanceProvider
  available_cents: number
  pending_cents: number
  currency: string
  last_updated_at: string
}

export interface TreasurySummary {
  total_available_cents: number
  total_pending_cents: number
  pending_payouts_cents: number
  net_available_cents: number
  balances: ProviderBalance[]
}

export interface BalanceHistoryEntry {
  id: string
  provider: BalanceProvider
  available_cents: number
  pending_cents: number
  recorded_at: string
}

export interface LowBalanceAlert {
  provider: BalanceProvider
  current_cents: number
  threshold_cents: number
  triggered_at: string
}

// Draw Request Types
export type DrawRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface DrawRequest {
  id: string
  request_number: string
  description: string
  total_amount_cents: number
  currency: string
  treasurer_name: string
  treasurer_email: string
  signers: string[]
  due_date: string | null
  is_draft: boolean
  pdf_url: string | null
  status: DrawRequestStatus
  approved_at: string | null
  approved_by: string | null
  approval_message: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DrawRequestItem {
  id: string
  request_id: string
  withdrawal_id: string
  creator_name: string
  project_description: string | null
  net_amount_cents: number
  currency: string
  created_at: string
}

export interface DrawRequestWithItems extends DrawRequest {
  items: DrawRequestItem[]
}

export interface DrawRequestWithDetails extends DrawRequestWithItems {
  communications: TreasuryCommunication[]
}

export interface CreateDrawRequestInput {
  description: string
  treasurer_name: string
  treasurer_email: string
  signers?: string[]
  due_date?: string
  is_draft?: boolean
  withdrawal_ids: string[]
}

// Communication Types
export type CommunicationDirection = 'outbound' | 'inbound'
export type ParsedStatus = 'approved' | 'rejected' | 'unclear'
export type ParsedConfidence = 'high' | 'medium' | 'low'

export interface TreasuryCommunication {
  id: string
  request_id: string
  direction: CommunicationDirection
  channel: string
  subject: string | null
  body: string
  from_email: string | null
  to_email: string | null
  parsed_status: ParsedStatus | null
  parsed_confidence: ParsedConfidence | null
  matched_keywords: string[]
  created_at: string
}

export interface CreateCommunicationInput {
  request_id: string
  direction: CommunicationDirection
  channel?: string
  subject?: string
  body: string
  from_email?: string
  to_email?: string
  parsed_status?: ParsedStatus
  parsed_confidence?: ParsedConfidence
  matched_keywords?: string[]
}

// Receipt Types
export type ReceiptStatus = 'pending' | 'processed' | 'archived'

export interface TreasuryReceipt {
  id: string
  file_url: string
  file_name: string
  file_type: string | null
  file_size_bytes: number | null
  vendor_name: string | null
  description: string | null
  amount_cents: number | null
  currency: string
  receipt_date: string | null
  status: ReceiptStatus
  expense_id: string | null
  operating_expense_id: string | null
  ocr_extracted: boolean
  ocr_data: Record<string, unknown> | null
  uploaded_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateReceiptInput {
  file_url: string
  file_name: string
  file_type?: string
  file_size_bytes?: number
  vendor_name?: string
  description?: string
  amount_cents?: number
  currency?: string
  receipt_date?: string
  expense_id?: string
  operating_expense_id?: string
  notes?: string
}

export interface UpdateReceiptInput {
  vendor_name?: string
  description?: string
  amount_cents?: number
  currency?: string
  receipt_date?: string
  status?: ReceiptStatus
  expense_id?: string
  operating_expense_id?: string
  notes?: string
}

// Stripe Topup Types
export type TopupStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | 'reversed'

export interface StripeTopup {
  id: string
  stripe_topup_id: string
  amount_cents: number
  currency: string
  status: TopupStatus
  failure_code: string | null
  failure_message: string | null
  expected_available_at: string | null
  completed_at: string | null
  linked_withdrawal_ids: string[]
  statement_descriptor: string | null
  description: string | null
  source_id: string | null
  source_last4: string | null
  source_bank_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTopupInput {
  amount_cents: number
  currency?: string
  description?: string
  statement_descriptor?: string
  source_id?: string
  linked_withdrawal_ids?: string[]
}

// Settings Types
export interface TopupSettings {
  id: string
  default_source_id: string | null
  default_source_last4: string | null
  default_source_bank_name: string | null
  auto_topup_enabled: boolean
  auto_topup_threshold_cents: number
  auto_topup_amount_cents: number
  created_at: string
  updated_at: string
}

export interface UpdateTopupSettingsInput {
  default_source_id?: string | null
  default_source_last4?: string | null
  default_source_bank_name?: string | null
  auto_topup_enabled?: boolean
  auto_topup_threshold_cents?: number
  auto_topup_amount_cents?: number
}

export interface TreasurySettings {
  id: string
  treasurer_email: string | null
  treasurer_name: string | null
  default_signers: string[]
  auto_send_enabled: boolean
  auto_send_delay_hours: number
  auto_send_max_amount_cents: number | null
  low_balance_alert_threshold_cents: number
  slack_webhook_url: string | null
  slack_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UpdateTreasurySettingsInput {
  treasurer_email?: string | null
  treasurer_name?: string | null
  default_signers?: string[]
  auto_send_enabled?: boolean
  auto_send_delay_hours?: number
  auto_send_max_amount_cents?: number | null
  low_balance_alert_threshold_cents?: number
  slack_webhook_url?: string | null
  slack_notifications_enabled?: boolean
}

// Stripe Balance Types
export interface StripeBalance {
  available: {
    amount: number
    currency: string
  }[]
  pending: {
    amount: number
    currency: string
  }[]
}

export interface FundingSource {
  id: string
  object: string
  bank_name: string
  last4: string
  routing_number: string
  status: string
  country: string
  currency: string
}

// Email Parsing Types
export interface EmailParseResult {
  status: ParsedStatus
  confidence: ParsedConfidence
  matched_keywords: string[]
  extracted_message: string | null
}

// Pending Withdrawal for draw request selection
export interface PendingWithdrawal {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  amount_cents: number
  currency: string
  method: string
  project_description: string | null
  requested_at: string
}
