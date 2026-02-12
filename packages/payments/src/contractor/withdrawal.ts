/**
 * Withdrawal Request Functions
 *
 * Manages contractor/creator withdrawal requests including
 * creation, status tracking, and history.
 */

import { sql, withTenant } from '@cgk/db'

import { getPayeeBalance, recordBalanceTransaction } from './balance'
import { getPayoutMethodById } from './payout-methods'
import { requiresW9 } from './tax'
import type { CreateWithdrawalInput, PayoutMethod, WithdrawalRequest, WithdrawalStatus } from './types'

/**
 * Create a withdrawal request
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param input - Withdrawal data
 */
export async function createWithdrawalRequest(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  input: CreateWithdrawalInput
): Promise<WithdrawalRequest> {
  // Validate amount
  if (input.amountCents <= 0) {
    throw new WithdrawalError('Amount must be greater than zero', 'INVALID_AMOUNT')
  }

  // Check balance
  const balance = await getPayeeBalance(payeeId, tenantSlug)
  if (input.amountCents > balance.availableCents) {
    throw new WithdrawalError(
      'Insufficient balance for withdrawal',
      'INSUFFICIENT_BALANCE'
    )
  }

  // Validate payout method exists and belongs to payee
  const payoutMethod = await getPayoutMethodById(
    input.payoutMethodId,
    payeeId,
    tenantSlug
  )
  if (!payoutMethod) {
    throw new WithdrawalError('Payout method not found', 'METHOD_NOT_FOUND')
  }

  // Check if payout method is ready
  if (payoutMethod.status !== 'active') {
    throw new WithdrawalError(
      'Payout method is not active. Please complete setup first.',
      'METHOD_NOT_ACTIVE'
    )
  }

  // Check if Stripe Connect is fully set up
  if (
    (payoutMethod.type === 'stripe_connect' ||
      payoutMethod.type === 'stripe_connect_standard') &&
    !payoutMethod.stripePayoutsEnabled
  ) {
    throw new WithdrawalError(
      'Stripe Connect payouts are not enabled. Please complete identity verification.',
      'STRIPE_NOT_READY'
    )
  }

  // Check W-9 requirement for US payees
  if (payoutMethod.accountCountry === 'US') {
    const needsW9 = await requiresW9(payeeId, tenantSlug)
    if (needsW9) {
      throw new WithdrawalError(
        'W-9 form required before requesting payout',
        'W9_REQUIRED'
      )
    }
  }

  // Create withdrawal request
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO withdrawal_requests (
        payee_id, tenant_id, amount_cents, payout_method_id, status
      )
      VALUES (
        ${payeeId}, ${tenantId}, ${input.amountCents},
        ${input.payoutMethodId}, 'pending'
      )
      RETURNING *
    `
  })

  const withdrawal = mapRowToWithdrawal(
    result.rows[0] as Record<string, unknown>,
    payoutMethod
  )

  // Record balance transaction
  await recordBalanceTransaction(
    {
      payeeId,
      tenantId,
      type: 'withdrawal_requested',
      amountCents: -input.amountCents, // Negative because it's being withdrawn
      description: `Withdrawal request to ${payoutMethod.type}`,
      referenceType: 'withdrawal',
      referenceId: withdrawal.id,
    },
    tenantSlug
  )

  return withdrawal
}

/**
 * Get withdrawal requests for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param options - Filtering and pagination options
 */
export async function getWithdrawalRequests(
  payeeId: string,
  tenantSlug: string,
  options: {
    status?: WithdrawalStatus
    limit?: number
    offset?: number
  } = {}
): Promise<{ withdrawals: WithdrawalRequest[]; total: number }> {
  const { status, limit = 50, offset = 0 } = options

  const result = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql`
        SELECT w.*, pm.*,
          w.id as withdrawal_id,
          pm.id as method_id,
          w.status as withdrawal_status,
          pm.status as method_status,
          w.created_at as withdrawal_created_at,
          pm.created_at as method_created_at,
          w.updated_at as withdrawal_updated_at,
          pm.updated_at as method_updated_at
        FROM withdrawal_requests w
        LEFT JOIN payout_methods pm ON pm.id = w.payout_method_id
        WHERE w.payee_id = ${payeeId}
          AND w.status = ${status}
        ORDER BY w.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }
    return sql`
      SELECT w.*, pm.*,
        w.id as withdrawal_id,
        pm.id as method_id,
        w.status as withdrawal_status,
        pm.status as method_status,
        w.created_at as withdrawal_created_at,
        pm.created_at as method_created_at,
        w.updated_at as withdrawal_updated_at,
        pm.updated_at as method_updated_at
      FROM withdrawal_requests w
      LEFT JOIN payout_methods pm ON pm.id = w.payout_method_id
      WHERE w.payee_id = ${payeeId}
      ORDER BY w.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantSlug, async () => {
    if (status) {
      return sql`
        SELECT COUNT(*) as total
        FROM withdrawal_requests
        WHERE payee_id = ${payeeId}
          AND status = ${status}
      `
    }
    return sql`
      SELECT COUNT(*) as total
      FROM withdrawal_requests
      WHERE payee_id = ${payeeId}
    `
  })

  return {
    withdrawals: result.rows.map((row) =>
      mapRowToWithdrawalWithMethod(row as Record<string, unknown>)
    ),
    total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
  }
}

/**
 * Get a single withdrawal request by ID
 *
 * @param withdrawalId - Withdrawal request ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getWithdrawalById(
  withdrawalId: string,
  payeeId: string,
  tenantSlug: string
): Promise<WithdrawalRequest | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT w.*, pm.*,
        w.id as withdrawal_id,
        pm.id as method_id,
        w.status as withdrawal_status,
        pm.status as method_status,
        w.created_at as withdrawal_created_at,
        pm.created_at as method_created_at,
        w.updated_at as withdrawal_updated_at,
        pm.updated_at as method_updated_at
      FROM withdrawal_requests w
      LEFT JOIN payout_methods pm ON pm.id = w.payout_method_id
      WHERE w.id = ${withdrawalId}
        AND w.payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToWithdrawalWithMethod(result.rows[0] as Record<string, unknown>)
}

/**
 * Cancel a pending withdrawal request
 *
 * @param withdrawalId - Withdrawal request ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function cancelWithdrawal(
  withdrawalId: string,
  payeeId: string,
  tenantSlug: string
): Promise<WithdrawalRequest> {
  // Get current withdrawal
  const withdrawal = await getWithdrawalById(withdrawalId, payeeId, tenantSlug)
  if (!withdrawal) {
    throw new WithdrawalError('Withdrawal not found', 'NOT_FOUND')
  }

  if (withdrawal.status !== 'pending') {
    throw new WithdrawalError(
      'Only pending withdrawals can be cancelled',
      'INVALID_STATUS'
    )
  }

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      UPDATE withdrawal_requests
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${withdrawalId}
        AND payee_id = ${payeeId}
      RETURNING *
    `
  })

  // Record balance transaction to restore balance
  await recordBalanceTransaction(
    {
      payeeId,
      tenantId: withdrawal.tenantId,
      type: 'withdrawal_failed',
      amountCents: withdrawal.amountCents, // Positive to restore balance
      description: 'Withdrawal cancelled',
      referenceType: 'withdrawal',
      referenceId: withdrawalId,
    },
    tenantSlug
  )

  return mapRowToWithdrawal(
    result.rows[0] as Record<string, unknown>,
    withdrawal.payoutMethod
  )
}

/**
 * Map database row to WithdrawalRequest
 */
function mapRowToWithdrawal(
  row: Record<string, unknown>,
  payoutMethod: PayoutMethod | null
): WithdrawalRequest {
  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    amountCents: parseInt(row.amount_cents as string, 10),
    payoutMethodId: row.payout_method_id as string,
    payoutMethod,
    status: row.status as WithdrawalStatus,
    processedAt: row.processed_at
      ? new Date(row.processed_at as string)
      : null,
    failureReason: (row.failure_reason as string) || null,
    externalTransferId: (row.external_transfer_id as string) || null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row with joined payout method to WithdrawalRequest
 */
function mapRowToWithdrawalWithMethod(
  row: Record<string, unknown>
): WithdrawalRequest {
  // Extract payout method from joined data
  let payoutMethod: PayoutMethod | null = null
  if (row.method_id) {
    payoutMethod = {
      id: row.method_id as string,
      payeeId: row.payee_id as string,
      tenantId: row.tenant_id as string,
      type: row.type as PayoutMethod['type'],
      isDefault: Boolean(row.is_default),
      status: row.method_status as PayoutMethod['status'],
      stripeAccountId: (row.stripe_account_id as string) || null,
      stripeAccountStatus:
        (row.stripe_account_status as PayoutMethod['stripeAccountStatus']) ||
        null,
      stripeOnboardingComplete: Boolean(row.stripe_onboarding_complete),
      stripePayoutsEnabled: Boolean(row.stripe_payouts_enabled),
      stripeChargesEnabled: Boolean(row.stripe_charges_enabled),
      stripeDetailsSubmitted: Boolean(row.stripe_details_submitted),
      stripeCapabilities: row.stripe_capabilities as Record<string, string> | null,
      stripeRequirementsDue: (row.stripe_requirements_due as string[]) || [],
      stripeRequirementsErrors:
        (row.stripe_requirements_errors as PayoutMethod['stripeRequirementsErrors']) ||
        [],
      stripeAccessToken: (row.stripe_access_token as string) || null,
      stripeRefreshToken: (row.stripe_refresh_token as string) || null,
      accountCountry: (row.account_country as string) || null,
      accountCurrency: (row.account_currency as string) || null,
      paypalEmail: (row.paypal_email as string) || null,
      venmoHandle: (row.venmo_handle as string) || null,
      checkAddress: row.check_address as PayoutMethod['checkAddress'],
      bankName: (row.bank_name as string) || null,
      accountLastFour: (row.account_last_four as string) || null,
      verificationStatus:
        (row.verification_status as PayoutMethod['verificationStatus']) || null,
      verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
      createdAt: new Date(row.method_created_at as string),
      updatedAt: new Date(row.method_updated_at as string),
    }
  }

  return {
    id: row.withdrawal_id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    amountCents: parseInt(row.amount_cents as string, 10),
    payoutMethodId: row.payout_method_id as string,
    payoutMethod,
    status: row.withdrawal_status as WithdrawalStatus,
    processedAt: row.processed_at
      ? new Date(row.processed_at as string)
      : null,
    failureReason: (row.failure_reason as string) || null,
    externalTransferId: (row.external_transfer_id as string) || null,
    createdAt: new Date(row.withdrawal_created_at as string),
    updatedAt: new Date(row.withdrawal_updated_at as string),
  }
}

/**
 * Withdrawal error class
 */
export class WithdrawalError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'WithdrawalError'
    this.code = code
  }
}
