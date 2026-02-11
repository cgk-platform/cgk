/**
 * Creator Admin Operations Types
 * Types for commissions, applications, onboarding, and samples
 */

// ============================================================================
// Commission Types
// ============================================================================

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface Commission {
  id: string
  order_id: string
  order_number: string | null
  order_date: string
  creator_id: string
  creator_name: string
  creator_email: string
  promo_code: string | null
  net_sales_cents: number
  commission_percent: number
  commission_cents: number
  currency: string
  status: CommissionStatus
  approved_by: string | null
  approved_at: string | null
  payout_id: string | null
  paid_at: string | null
  rejected_reason: string | null
  created_at: string
  updated_at: string
}

export interface CommissionSummary {
  pending_count: number
  pending_cents: number
  approved_count: number
  approved_cents: number
  paid_count: number
  paid_cents: number
  total_ytd_count: number
  total_ytd_cents: number
}

export interface CommissionFilters {
  page: number
  limit: number
  offset: number
  status: string
  creatorId: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface CommissionConfig {
  id: string
  default_rate_percent: number
  tier_rates: TierRate[]
  auto_retroactive: boolean
  retroactive_lookback_days: number
  created_at: string
  updated_at: string
}

export interface TierRate {
  tier: string
  min_lifetime_cents: number
  rate_percent: number
}

export const COMMISSION_STATUSES: CommissionStatus[] = ['pending', 'approved', 'paid', 'rejected']

export const DEFAULT_TIER_RATES: TierRate[] = [
  { tier: 'Bronze', min_lifetime_cents: 0, rate_percent: 10 },
  { tier: 'Silver', min_lifetime_cents: 100000, rate_percent: 12 },
  { tier: 'Gold', min_lifetime_cents: 500000, rate_percent: 15 },
  { tier: 'Platinum', min_lifetime_cents: 1500000, rate_percent: 18 },
  { tier: 'Diamond', min_lifetime_cents: 5000000, rate_percent: 20 },
]

// ============================================================================
// Application Types
// ============================================================================

export type ApplicationStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'waitlisted'

export interface CreatorApplication {
  id: string
  name: string
  email: string
  phone: string | null
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  other_social: Record<string, string>
  follower_count: number | null
  engagement_rate: number | null
  bio: string | null
  why_interested: string | null
  previous_partnerships: string | null
  content_categories: string[]
  source: string | null
  referrer_code: string | null
  status: ApplicationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  internal_notes: string | null
  creator_id: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationFilters {
  page: number
  limit: number
  offset: number
  status: string
  source: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface ApprovalAction {
  applicationId: string
  action: 'approve' | 'reject' | 'waitlist'
  commissionPercent?: number
  discountCode?: string
  tier?: string
  notes?: string
  rejectionReason?: string
  sendNotification: boolean
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'new',
  'in_review',
  'approved',
  'rejected',
  'waitlisted',
]

export const REJECTION_TEMPLATES = [
  "Thank you for your interest. At this time, we're not accepting new creators.",
  "We're looking for creators with more engagement in skincare content.",
  "Your application is on our waitlist. We'll reach out when spots open.",
]

// ============================================================================
// Onboarding Types
// ============================================================================

export interface OnboardingStep {
  id: string
  name: string
  required: boolean
  order: number
  reminderDays: number[]
}

export interface OnboardingConfig {
  id: string
  steps: OnboardingStep[]
  max_completion_days: number
  auto_deactivate: boolean
  default_commission_percent: number
  auto_generate_code: boolean
  code_format: string
  welcome_template_id: string | null
  created_at: string
  updated_at: string
}

export interface CreatorOnboardingProgress {
  id: string
  creator_id: string
  step_id: string
  completed: boolean
  completed_at: string | null
  reminder_count: number
  last_reminder_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface OnboardingMetrics {
  applications_received: number
  approval_rate: number
  onboarding_started_count: number
  onboarding_started_rate: number
  onboarding_completed_count: number
  onboarding_completed_rate: number
  first_project_count: number
  first_project_rate: number
  active_30d_count: number
  active_30d_rate: number
  avg_completion_days: number
}

export interface StepCompletionMetric {
  step_id: string
  step_name: string
  completed_count: number
  pending_count: number
  avg_days: number
}

export interface StuckCreator {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  step_id: string
  step_name: string
  days_stuck: number
  reminder_count: number
  last_reminder_at: string | null
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'accept_terms', name: 'Accept Terms & Conditions', required: true, order: 1, reminderDays: [] },
  { id: 'complete_profile', name: 'Complete Profile', required: true, order: 2, reminderDays: [3, 7, 14] },
  { id: 'sign_agreement', name: 'Sign Creator Agreement', required: true, order: 3, reminderDays: [3, 7] },
  { id: 'submit_tax_info', name: 'Submit W-9 / Tax Info', required: true, order: 4, reminderDays: [7, 14, 21] },
  { id: 'setup_payout', name: 'Set Up Payout Method', required: true, order: 5, reminderDays: [7, 14] },
  { id: 'complete_training', name: 'Complete Training Module', required: false, order: 6, reminderDays: [7] },
  { id: 'receive_samples', name: 'Receive Sample Products', required: false, order: 7, reminderDays: [] },
]

// ============================================================================
// Sample Types
// ============================================================================

export type SampleStatus =
  | 'requested'
  | 'approved'
  | 'pending'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export type SamplePriority = 'normal' | 'rush'

export interface SampleProduct {
  productId: string
  productName: string
  variant?: string
  quantity: number
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
}

export interface SampleRequest {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  products: SampleProduct[]
  shipping_address: ShippingAddress
  priority: SamplePriority
  status: SampleStatus
  tracking_carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  estimated_delivery: string | null
  actual_delivery: string | null
  delivery_confirmed: boolean
  cost_cents: number | null
  notes: string | null
  internal_notes: string | null
  approved_by: string | null
  approved_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  requested_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface SampleFilters {
  page: number
  limit: number
  offset: number
  status: string
  creatorId: string
  dateFrom: string
  dateTo: string
  search: string
}

export interface SampleStats {
  pending_count: number
  shipped_count: number
  delivered_count: number
  this_month_count: number
}

export const SAMPLE_STATUSES: SampleStatus[] = [
  'requested',
  'approved',
  'pending',
  'shipped',
  'in_transit',
  'delivered',
  'cancelled',
]

export const SAMPLE_PRIORITIES: SamplePriority[] = ['normal', 'rush']

export const SAMPLE_CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] as const
