/**
 * Treasury-related types for the admin portal
 */

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
