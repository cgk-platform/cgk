/**
 * Balance System Types
 *
 * Types for creator balance tracking and management.
 */

/**
 * Balance transaction types
 */
export type BalanceTransactionType =
  | 'commission_pending'
  | 'commission_available'
  | 'project_payment'
  | 'bonus'
  | 'adjustment'
  | 'withdrawal'
  | 'store_credit'

/**
 * Creator balance summary
 */
export interface CreatorBalance {
  /** Creator ID */
  creatorId: string
  /** Available balance in cents */
  availableCents: number
  /** Pending balance in cents (30-day hold) */
  pendingCents: number
  /** Total withdrawn all-time in cents */
  withdrawnCents: number
  /** Currency */
  currency: string
  /** Breakdown by brand (tenant) */
  byBrand?: BrandBalance[]
}

/**
 * Per-brand balance breakdown
 */
export interface BrandBalance {
  /** Brand/tenant ID */
  brandId: string
  /** Brand name */
  brandName?: string
  /** Available balance from this brand */
  availableCents: number
  /** Pending balance from this brand */
  pendingCents: number
}

/**
 * Earnings breakdown by type
 */
export interface EarningsBreakdown {
  /** Total earnings from commissions */
  commissionsCents: number
  /** Total earnings from project payments */
  projectPaymentsCents: number
  /** Total earnings from bonuses */
  bonusesCents: number
  /** Total adjustments (can be negative) */
  adjustmentsCents: number
  /** Grand total */
  totalCents: number
}

/**
 * Upcoming fund maturation (pending -> available)
 */
export interface UpcomingMaturation {
  /** Date when funds become available */
  date: Date
  /** Amount becoming available in cents */
  amountCents: number
  /** Number of commissions maturing */
  count: number
}

/**
 * Balance transaction record
 */
export interface BalanceTransaction {
  /** Transaction ID */
  id: string
  /** Creator ID */
  creatorId: string
  /** Brand/tenant ID (if applicable) */
  brandId?: string
  /** Transaction type */
  type: BalanceTransactionType
  /** Amount in cents (positive = credit, negative = debit) */
  amountCents: number
  /** Currency */
  currency: string
  /** Balance after this transaction */
  balanceAfterCents: number
  /** When funds become available (for pending commissions) */
  availableAt?: Date
  /** Related order ID */
  orderId?: string
  /** Related commission ID */
  commissionId?: string
  /** Related project ID */
  projectId?: string
  /** Related withdrawal ID */
  withdrawalId?: string
  /** Description */
  description?: string
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Created timestamp */
  createdAt: Date
}

/**
 * Parameters for recording a balance transaction
 */
export interface RecordTransactionParams {
  /** Creator ID */
  creatorId: string
  /** Brand/tenant ID */
  brandId?: string
  /** Transaction type */
  type: BalanceTransactionType
  /** Amount in cents */
  amountCents: number
  /** Currency */
  currency?: string
  /** When funds become available (for commission_pending) */
  availableAt?: Date
  /** Related order ID */
  orderId?: string
  /** Related commission ID */
  commissionId?: string
  /** Related project ID */
  projectId?: string
  /** Related withdrawal ID */
  withdrawalId?: string
  /** Description */
  description?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Transaction list filters
 */
export interface TransactionListFilters {
  /** Filter by type */
  type?: BalanceTransactionType
  /** Filter by brand */
  brandId?: string
  /** Start date */
  startDate?: Date
  /** End date */
  endDate?: Date
  /** Pagination limit */
  limit?: number
  /** Pagination offset */
  offset?: number
}

/**
 * Paginated transaction result
 */
export interface TransactionListResult {
  /** Transactions */
  transactions: BalanceTransaction[]
  /** Total count (for pagination) */
  total: number
  /** Pagination offset */
  offset: number
  /** Pagination limit */
  limit: number
  /** Has more results */
  hasMore: boolean
}
