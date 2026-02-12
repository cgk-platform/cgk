/**
 * Withdrawal Types
 *
 * Types for creator withdrawal requests and processing.
 */

/**
 * Withdrawal status
 */
export type WithdrawalStatus =
  | 'pending'       // Awaiting review/processing
  | 'pending_topup' // Awaiting Wise balance top-up (international)
  | 'processing'    // Transfer initiated
  | 'completed'     // Successfully paid out
  | 'rejected'      // Manually rejected by admin
  | 'failed'        // Transfer failed

/**
 * Payout type selection
 */
export type PayoutType = 'cash' | 'store_credit'

/**
 * Withdrawal request record
 */
export interface WithdrawalRequest {
  /** Request ID */
  id: string
  /** Creator ID */
  creatorId: string
  /** Amount in cents */
  amountCents: number
  /** Currency */
  currency: string
  /** Payout type */
  payoutType: PayoutType
  /** Store credit bonus (10%) if store_credit payout type */
  storeCreditBonusCents?: number
  /** Payment method ID used */
  paymentMethodId?: string
  /** Current status */
  status: WithdrawalStatus
  /** Provider used (stripe/wise) */
  provider?: string
  /** External transfer ID */
  transferId?: string
  /** External reference */
  externalReference?: string
  /** Estimated arrival date */
  estimatedArrival?: Date
  /** Actual completion date */
  completedAt?: Date
  /** Failure reason if failed */
  failureReason?: string
  /** Failure code if failed */
  failureCode?: string
  /** Number of retry attempts */
  retryCount: number
  /** Admin note */
  adminNote?: string
  /** Who processed this (admin user ID) */
  processedBy?: string
  /** Shopify customer ID for store credit */
  shopifyCustomerId?: string
  /** Shopify credit transaction ID */
  shopifyCreditTransactionId?: string
  /** Created timestamp */
  createdAt: Date
  /** Updated timestamp */
  updatedAt: Date
}

/**
 * Parameters for creating a withdrawal request
 */
export interface CreateWithdrawalParams {
  /** Creator ID */
  creatorId: string
  /** Amount in cents */
  amountCents: number
  /** Currency (default USD) */
  currency?: string
  /** Payout type */
  payoutType: PayoutType
  /** Payment method ID (required for cash payouts) */
  paymentMethodId?: string
  /** Shopify customer ID (for store credit) */
  shopifyCustomerId?: string
}

/**
 * Withdrawal validation result
 */
export interface WithdrawalValidationResult {
  /** Whether the withdrawal can proceed */
  valid: boolean
  /** Error message if not valid */
  error?: string
  /** Error code if not valid */
  errorCode?: WithdrawalErrorCode
  /** Warnings (non-blocking) */
  warnings?: string[]
}

/**
 * Withdrawal error codes
 */
export type WithdrawalErrorCode =
  | 'insufficient_balance'
  | 'below_minimum'
  | 'pending_withdrawal_exists'
  | 'payment_method_required'
  | 'payment_method_invalid'
  | 'w9_required'
  | 'contract_unsigned'
  | 'creator_not_found'
  | 'creator_inactive'

/**
 * Withdrawal blocking status
 */
export interface WithdrawalBlockingStatus {
  /** Can the creator withdraw? */
  canWithdraw: boolean
  /** Reasons blocked */
  blockers: WithdrawalBlocker[]
}

/**
 * Individual blocker
 */
export interface WithdrawalBlocker {
  /** Blocker type */
  type: 'w9' | 'contract' | 'payment_method' | 'minimum_balance' | 'pending_withdrawal'
  /** Human-readable message */
  message: string
  /** Action URL to resolve */
  actionUrl?: string
  /** Action label */
  actionLabel?: string
}

/**
 * Creator status for withdrawal eligibility
 */
export interface CreatorWithdrawalStatus {
  /** Creator ID */
  creatorId: string
  /** ISO country code */
  country: string
  /** Is US-based? */
  isUS: boolean
  /** Has W-9 on file? */
  hasW9: boolean
  /** Has unsigned contracts? */
  hasUnsignedContracts: boolean
  /** Number of unsigned contracts */
  unsignedContractCount: number
  /** Has active payment method? */
  hasPaymentMethod: boolean
  /** Default payment method ID */
  defaultPaymentMethodId?: string
}
