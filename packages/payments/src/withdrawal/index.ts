/**
 * Withdrawal System
 *
 * Creator withdrawal requests, validation, and processing.
 */

import { sql } from '@cgk/db'

import {
  getCreatorBalance,
  MINIMUM_WITHDRAWAL_CENTS,
  STORE_CREDIT_BONUS_PERCENT,
  calculateStoreCreditBonus,
  recordBalanceTransaction,
} from '../balance'

import type {
  WithdrawalRequest,
  WithdrawalStatus,
  PayoutType,
  CreateWithdrawalParams,
  WithdrawalValidationResult,
  WithdrawalBlockingStatus,
  WithdrawalBlocker,
  CreatorWithdrawalStatus,
} from './types'

// Re-export types
export type {
  WithdrawalRequest,
  WithdrawalStatus,
  PayoutType,
  CreateWithdrawalParams,
  WithdrawalValidationResult,
  WithdrawalErrorCode,
  WithdrawalBlockingStatus,
  WithdrawalBlocker,
  CreatorWithdrawalStatus,
} from './types'

interface WithdrawalRow {
  id: string
  creator_id: string
  amount_cents: number
  currency: string
  payout_type: PayoutType
  store_credit_bonus_cents: number | null
  payment_method_id: string | null
  status: WithdrawalStatus
  provider: string | null
  transfer_id: string | null
  external_reference: string | null
  estimated_arrival: string | null
  completed_at: string | null
  failure_reason: string | null
  failure_code: string | null
  retry_count: number
  admin_note: string | null
  processed_by: string | null
  shopify_customer_id: string | null
  shopify_credit_transaction_id: string | null
  created_at: string
  updated_at: string
}

function mapRowToWithdrawal(row: WithdrawalRow): WithdrawalRequest {
  return {
    id: row.id,
    creatorId: row.creator_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    payoutType: row.payout_type,
    storeCreditBonusCents: row.store_credit_bonus_cents ?? undefined,
    paymentMethodId: row.payment_method_id ?? undefined,
    status: row.status,
    provider: row.provider ?? undefined,
    transferId: row.transfer_id ?? undefined,
    externalReference: row.external_reference ?? undefined,
    estimatedArrival: row.estimated_arrival ? new Date(row.estimated_arrival) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    failureReason: row.failure_reason ?? undefined,
    failureCode: row.failure_code ?? undefined,
    retryCount: row.retry_count,
    adminNote: row.admin_note ?? undefined,
    processedBy: row.processed_by ?? undefined,
    shopifyCustomerId: row.shopify_customer_id ?? undefined,
    shopifyCreditTransactionId: row.shopify_credit_transaction_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Get a withdrawal request by ID
 */
export async function getWithdrawalRequest(id: string): Promise<WithdrawalRequest | null> {
  const result = await sql<WithdrawalRow>`
    SELECT * FROM withdrawal_requests WHERE id = ${id}
  `
  if (result.rows.length === 0) {
    return null
  }
  return mapRowToWithdrawal(result.rows[0]!)
}

/**
 * Get active withdrawal request for a creator (pending/processing)
 */
export async function getActiveWithdrawal(creatorId: string): Promise<WithdrawalRequest | null> {
  const result = await sql<WithdrawalRow>`
    SELECT * FROM withdrawal_requests
    WHERE creator_id = ${creatorId}
    AND status IN ('pending', 'pending_topup', 'processing')
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (result.rows.length === 0) {
    return null
  }
  return mapRowToWithdrawal(result.rows[0]!)
}

/**
 * Check if creator has a pending/processing withdrawal
 */
export async function hasPendingWithdrawal(creatorId: string): Promise<boolean> {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM withdrawal_requests
    WHERE creator_id = ${creatorId}
    AND status IN ('pending', 'pending_topup', 'processing')
  `
  return parseInt(result.rows[0]?.count || '0', 10) > 0
}

/**
 * Get creator's withdrawal status (W-9, contracts, payment method)
 */
export async function getCreatorWithdrawalStatus(
  creatorId: string
): Promise<CreatorWithdrawalStatus> {
  // Get creator basic info from public schema
  const creatorResult = await sql<{
    id: string
    country: string | null
    has_w9: boolean | null
  }>`
    SELECT id, country, has_w9
    FROM creators
    WHERE id = ${creatorId}
  `

  if (creatorResult.rows.length === 0) {
    throw new Error('Creator not found')
  }

  const creator = creatorResult.rows[0]!
  const country = creator.country || 'US'
  const isUS = country === 'US'

  // Get active payment method
  const paymentMethodResult = await sql<{
    id: string
    is_default: boolean
  }>`
    SELECT id, is_default FROM creator_payment_methods
    WHERE creator_id = ${creatorId}
    AND status = 'active'
    ORDER BY is_default DESC
    LIMIT 1
  `

  const hasPaymentMethod = paymentMethodResult.rows.length > 0
  const defaultPaymentMethodId = paymentMethodResult.rows[0]?.id

  return {
    creatorId,
    country,
    isUS,
    hasW9: creator.has_w9 ?? false,
    hasUnsignedContracts: false, // Checked at request time with tenant context
    unsignedContractCount: 0,
    hasPaymentMethod,
    defaultPaymentMethodId,
  }
}

/**
 * Get withdrawal blocking status for a creator
 */
export async function getWithdrawalBlockingStatus(
  creatorId: string
): Promise<WithdrawalBlockingStatus> {
  const blockers: WithdrawalBlocker[] = []

  // Get creator status
  const status = await getCreatorWithdrawalStatus(creatorId)

  // Get balance
  const balance = await getCreatorBalance(creatorId)

  // Check minimum balance
  if (balance.availableCents < MINIMUM_WITHDRAWAL_CENTS) {
    blockers.push({
      type: 'minimum_balance',
      message: `Minimum withdrawal is $${(MINIMUM_WITHDRAWAL_CENTS / 100).toFixed(2)}. Your available balance is $${(balance.availableCents / 100).toFixed(2)}.`,
    })
  }

  // Check pending withdrawal
  const hasPending = await hasPendingWithdrawal(creatorId)
  if (hasPending) {
    blockers.push({
      type: 'pending_withdrawal',
      message: 'You have a pending withdrawal request. Please wait for it to complete.',
    })
  }

  // Check payment method
  if (!status.hasPaymentMethod) {
    blockers.push({
      type: 'payment_method',
      message: 'Please set up a payout method to receive payments.',
      actionUrl: '/creator/settings/payout-methods',
      actionLabel: 'Set Up Payout Method',
    })
  }

  // Check W-9 for US creators
  if (status.isUS && !status.hasW9) {
    blockers.push({
      type: 'w9',
      message: 'A W-9 is required for US-based creators before withdrawing.',
      actionUrl: '/creator/settings/tax',
      actionLabel: 'Submit W-9',
    })
  }

  // Check unsigned contracts
  if (status.hasUnsignedContracts) {
    blockers.push({
      type: 'contract',
      message: `You have ${status.unsignedContractCount} unsigned contract${status.unsignedContractCount > 1 ? 's' : ''}. Please sign all contracts before withdrawing.`,
      actionUrl: '/creator/contracts',
      actionLabel: 'View Contracts',
    })
  }

  return {
    canWithdraw: blockers.length === 0,
    blockers,
  }
}

/**
 * Validate a withdrawal request
 */
export async function validateWithdrawal(
  params: CreateWithdrawalParams
): Promise<WithdrawalValidationResult> {
  const { creatorId, amountCents, payoutType, paymentMethodId } = params

  // Get creator status
  let status: CreatorWithdrawalStatus
  try {
    status = await getCreatorWithdrawalStatus(creatorId)
  } catch {
    return {
      valid: false,
      error: 'Creator not found',
      errorCode: 'creator_not_found',
    }
  }

  // Check minimum amount
  if (amountCents < MINIMUM_WITHDRAWAL_CENTS) {
    return {
      valid: false,
      error: `Minimum withdrawal is $${(MINIMUM_WITHDRAWAL_CENTS / 100).toFixed(2)}`,
      errorCode: 'below_minimum',
    }
  }

  // Get balance
  const balance = await getCreatorBalance(creatorId)

  // Check sufficient balance
  if (amountCents > balance.availableCents) {
    return {
      valid: false,
      error: `Insufficient balance. Available: $${(balance.availableCents / 100).toFixed(2)}`,
      errorCode: 'insufficient_balance',
    }
  }

  // Check for pending withdrawal
  const hasPending = await hasPendingWithdrawal(creatorId)
  if (hasPending) {
    return {
      valid: false,
      error: 'You already have a pending withdrawal request',
      errorCode: 'pending_withdrawal_exists',
    }
  }

  // Check payment method for cash payouts
  if (payoutType === 'cash') {
    if (!paymentMethodId && !status.hasPaymentMethod) {
      return {
        valid: false,
        error: 'Please set up a payout method first',
        errorCode: 'payment_method_required',
      }
    }
  }

  // Check W-9 for US creators
  if (status.isUS && !status.hasW9) {
    return {
      valid: false,
      error: 'W-9 required for US-based creators',
      errorCode: 'w9_required',
    }
  }

  // Check unsigned contracts
  if (status.hasUnsignedContracts) {
    return {
      valid: false,
      error: 'Please sign all contracts before withdrawing',
      errorCode: 'contract_unsigned',
    }
  }

  return { valid: true }
}

/**
 * Create a withdrawal request
 */
export async function requestWithdrawal(
  params: CreateWithdrawalParams
): Promise<{ success: boolean; withdrawal?: WithdrawalRequest; error?: string }> {
  const {
    creatorId,
    amountCents,
    currency = 'USD',
    payoutType,
    paymentMethodId,
    shopifyCustomerId,
  } = params

  // Validate first
  const validation = await validateWithdrawal(params)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Calculate store credit bonus if applicable
  const storeCreditBonusCents = payoutType === 'store_credit'
    ? calculateStoreCreditBonus(amountCents)
    : null

  // Get default payment method if not provided
  let effectivePaymentMethodId = paymentMethodId
  if (payoutType === 'cash' && !effectivePaymentMethodId) {
    const status = await getCreatorWithdrawalStatus(creatorId)
    effectivePaymentMethodId = status.defaultPaymentMethodId
  }

  // Create withdrawal request
  const result = await sql<WithdrawalRow>`
    INSERT INTO withdrawal_requests (
      creator_id,
      amount_cents,
      currency,
      payout_type,
      store_credit_bonus_cents,
      payment_method_id,
      shopify_customer_id,
      status
    ) VALUES (
      ${creatorId},
      ${amountCents},
      ${currency},
      ${payoutType},
      ${storeCreditBonusCents},
      ${effectivePaymentMethodId ?? null},
      ${shopifyCustomerId ?? null},
      'pending'
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    return { success: false, error: 'Failed to create withdrawal request' }
  }

  const withdrawal = mapRowToWithdrawal(row)

  // Record balance transaction (debit)
  await recordBalanceTransaction({
    creatorId,
    type: payoutType === 'store_credit' ? 'store_credit' : 'withdrawal',
    amountCents: amountCents,
    withdrawalId: withdrawal.id,
    description: payoutType === 'store_credit'
      ? `Store credit withdrawal (includes ${STORE_CREDIT_BONUS_PERCENT}% bonus)`
      : 'Cash withdrawal',
    metadata: {
      payout_type: payoutType,
      store_credit_bonus_cents: storeCreditBonusCents,
    },
  })

  // Note: Job event should be sent by the caller if needed
  // This avoids the dependency on @cgk/jobs

  return { success: true, withdrawal }
}

/**
 * Update withdrawal status
 */
export async function updateWithdrawalStatus(
  id: string,
  updates: {
    status?: WithdrawalStatus
    provider?: string
    transferId?: string
    externalReference?: string
    estimatedArrival?: Date
    completedAt?: Date
    failureReason?: string
    failureCode?: string
    adminNote?: string
    processedBy?: string
    shopifyCreditTransactionId?: string
  }
): Promise<WithdrawalRequest | null> {
  const estimatedArrivalIso = updates.estimatedArrival?.toISOString() ?? null
  const completedAtIso = updates.completedAt?.toISOString() ?? null

  const result = await sql<WithdrawalRow>`
    UPDATE withdrawal_requests
    SET
      status = COALESCE(${updates.status ?? null}, status),
      provider = COALESCE(${updates.provider ?? null}, provider),
      transfer_id = COALESCE(${updates.transferId ?? null}, transfer_id),
      external_reference = COALESCE(${updates.externalReference ?? null}, external_reference),
      estimated_arrival = COALESCE(${estimatedArrivalIso}::timestamptz, estimated_arrival),
      completed_at = COALESCE(${completedAtIso}::timestamptz, completed_at),
      failure_reason = COALESCE(${updates.failureReason ?? null}, failure_reason),
      failure_code = COALESCE(${updates.failureCode ?? null}, failure_code),
      admin_note = COALESCE(${updates.adminNote ?? null}, admin_note),
      processed_by = COALESCE(${updates.processedBy ?? null}, processed_by),
      shopify_credit_transaction_id = COALESCE(${updates.shopifyCreditTransactionId ?? null}, shopify_credit_transaction_id),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToWithdrawal(result.rows[0]!)
}

/**
 * List withdrawal requests for a creator
 */
export async function listWithdrawalRequests(
  creatorId: string,
  options: {
    status?: WithdrawalStatus | WithdrawalStatus[]
    limit?: number
    offset?: number
  } = {}
): Promise<{ withdrawals: WithdrawalRequest[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options

  let countResult
  let withdrawalsResult

  if (status) {
    if (Array.isArray(status)) {
      // For arrays, we need to use a different approach
      const statusList = status.map(s => `'${s}'`).join(',')
      countResult = await sql<{ count: string }>`
        SELECT COUNT(*) as count FROM withdrawal_requests
        WHERE creator_id = ${creatorId}
        AND status::text IN (${statusList})
      `
      withdrawalsResult = await sql<WithdrawalRow>`
        SELECT * FROM withdrawal_requests
        WHERE creator_id = ${creatorId}
        AND status::text IN (${statusList})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      countResult = await sql<{ count: string }>`
        SELECT COUNT(*) as count FROM withdrawal_requests
        WHERE creator_id = ${creatorId}
        AND status = ${status}
      `
      withdrawalsResult = await sql<WithdrawalRow>`
        SELECT * FROM withdrawal_requests
        WHERE creator_id = ${creatorId}
        AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
  } else {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM withdrawal_requests
      WHERE creator_id = ${creatorId}
    `
    withdrawalsResult = await sql<WithdrawalRow>`
      SELECT * FROM withdrawal_requests
      WHERE creator_id = ${creatorId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  const total = parseInt(countResult.rows[0]?.count || '0', 10)

  return {
    withdrawals: withdrawalsResult.rows.map(mapRowToWithdrawal),
    total,
  }
}
