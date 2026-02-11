/**
 * Payout-related types for the admin portal
 */

export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected'
export type PayoutMethod = 'stripe' | 'wise' | 'manual'

export interface Withdrawal {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  amount_cents: number
  currency: string
  method: PayoutMethod
  status: WithdrawalStatus
  transfer_id: string | null
  failure_reason: string | null
  notes: string | null
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface WithdrawalFilters {
  page: number
  limit: number
  offset: number
  status: string
  method: string
  search: string
  dateFrom: string
  dateTo: string
}

export interface PayoutSummary {
  pending_count: number
  pending_amount_cents: number
  processing_count: number
  processing_amount_cents: number
  completed_this_month_cents: number
  completed_total_cents: number
}

export const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
]

export const PAYOUT_METHODS: PayoutMethod[] = ['stripe', 'wise', 'manual']
