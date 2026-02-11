/**
 * Admin Utilities Types
 * Types for gallery, stripe top-ups, sync operations, and changelog
 */

// ============================================================================
// UGC Gallery Types
// ============================================================================

export type UGCSubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface UGCSubmission {
  id: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  beforeImageUrl: string
  afterImageUrl: string
  testimonial: string | null
  productsUsed: string[]
  durationDays: number | null
  consentMarketing: boolean
  consentTerms: boolean
  status: UGCSubmissionStatus
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  source: string
  createdAt: string
  updatedAt: string
}

export interface UGCGalleryStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface UGCModerationAction {
  action: 'approve' | 'reject'
  notes?: string
}

// ============================================================================
// Stripe Top-up Types
// ============================================================================

export type TopupStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | 'reversed'

export interface StripeTopup {
  id: string
  stripeTopupId: string
  stripeSourceId: string | null
  amountCents: number
  currency: string
  status: TopupStatus
  failureCode: string | null
  failureMessage: string | null
  expectedAvailableAt: string | null
  completedAt: string | null
  linkedWithdrawalIds: string[]
  statementDescriptor: string | null
  description: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface StripeTopupSettings {
  id: string
  defaultSourceId: string | null
  defaultSourceLast4: string | null
  defaultSourceBankName: string | null
  autoTopupEnabled: boolean
  autoTopupThresholdCents: number | null
  autoTopupAmountCents: number | null
  createdAt: string
  updatedAt: string
}

export interface StripeBalance {
  available: {
    usd: number
    usdFormatted: string
  }
  pending: {
    usd: number
    usdFormatted: string
  }
}

export interface StripeFundingSource {
  id: string
  last4: string
  bankName: string
  status: string
  type: string
}

export interface TopupStats {
  pending: number
  succeeded: number
  failed: number
  canceled: number
}

export interface CreateTopupRequest {
  amountCents: number
  description?: string
  sourceId?: string
  linkedWithdrawalIds?: string[]
}

export interface PendingWithdrawal {
  id: string
  creatorName: string
  amountCents: number
  status: string
  requestedAt: string
  linkedTopupId: string | null
}

// ============================================================================
// Sync Operations Types
// ============================================================================

export type SyncOperationType =
  | 'commission_balance_sync'
  | 'project_payment_sync'
  | 'conversation_merge'
  | 'mature_commissions'

export type SyncOperationStatus = 'pending' | 'running' | 'success' | 'error'

export interface SyncOperation {
  id: string
  operationType: SyncOperationType
  status: SyncOperationStatus
  previewData: Record<string, unknown> | null
  resultData: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  runBy: string | null
  createdAt: string
}

export interface SyncOperationPreview {
  operationType: SyncOperationType
  itemsToProcess: number
  details: Record<string, unknown>
}

export interface SyncOperationResult {
  operationType: SyncOperationType
  processed: number
  errors: number
  details: Record<string, unknown>
}

// ============================================================================
// Changelog Types
// ============================================================================

export type ChangeSource = 'admin' | 'api' | 'webhook' | 'job' | 'system' | 'user'

export interface ChangelogEntry {
  id: string
  timestamp: string
  source: ChangeSource
  action: string
  entityType: string
  entityId: string
  summary: string
  details?: Record<string, unknown>
  userId?: string
  userEmail?: string
  metadata?: Record<string, unknown>
}

export interface ChangelogStats {
  bySource: Record<ChangeSource, number>
  byDay: Array<{ date: string; count: number }>
}

export interface LogChangeParams {
  source: ChangeSource
  action: string
  entityType: string
  entityId: string
  summary: string
  details?: Record<string, unknown>
  userId?: string
  userEmail?: string
  metadata?: Record<string, unknown>
}
