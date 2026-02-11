/**
 * Tax-related types for the admin portal
 */

export type W9Status = 'not_submitted' | 'pending_review' | 'approved' | 'rejected' | 'expired'
export type Form1099Status = 'not_required' | 'pending' | 'generated' | 'sent'

export interface CreatorTaxInfo {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  w9_status: W9Status
  w9_submitted_at: string | null
  w9_approved_at: string | null
  tin_last_four: string | null
  business_name: string | null
  tax_classification: string | null
  total_earnings_ytd_cents: number
  threshold_cents: number
  requires_1099: boolean
  form_1099_status: Form1099Status
  form_1099_generated_at: string | null
  form_1099_sent_at: string | null
}

export interface TaxFilters {
  page: number
  limit: number
  offset: number
  w9_status: string
  form_1099_status: string
  tax_year: number
  requires_1099: string
}

export interface TaxYearSummary {
  tax_year: number
  total_creators: number
  w9_approved_count: number
  w9_pending_count: number
  requires_1099_count: number
  forms_generated_count: number
  forms_sent_count: number
  total_reportable_cents: number
}

export const W9_STATUSES: W9Status[] = [
  'not_submitted',
  'pending_review',
  'approved',
  'rejected',
  'expired',
]

export const FORM_1099_STATUSES: Form1099Status[] = [
  'not_required',
  'pending',
  'generated',
  'sent',
]
