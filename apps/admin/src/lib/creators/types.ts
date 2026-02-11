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
