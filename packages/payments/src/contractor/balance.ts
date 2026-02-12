/**
 * Payee Balance Functions
 *
 * Manages contractor/creator balance tracking including
 * pending, available, and paid amounts.
 */

import { sql, withTenant } from '@cgk/db'

import type {
  BalanceTransaction,
  BalanceTransactionType,
  PayeeBalance,
} from './types'

/**
 * Get payee balance (pending, available, paid)
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getPayeeBalance(
  payeeId: string,
  tenantSlug: string
): Promise<PayeeBalance> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0) as pending_cents,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_cents ELSE 0 END), 0) as available_cents,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0) as paid_cents
      FROM payment_requests
      WHERE payee_id = ${payeeId}
    `
  })

  const row = result.rows[0]

  // Also check for any pending withdrawals to subtract from available
  const withdrawalResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT COALESCE(SUM(amount_cents), 0) as pending_withdrawal
      FROM withdrawal_requests
      WHERE payee_id = ${payeeId}
        AND status IN ('pending', 'processing')
    `
  })

  const pendingWithdrawal = parseInt(
    withdrawalResult.rows[0]?.pending_withdrawal as string,
    10
  ) || 0

  // Get tenant ID from organizations table
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenantId = tenantResult.rows[0]?.id as string || tenantSlug

  return {
    payeeId,
    tenantId,
    pendingCents: parseInt(row?.pending_cents as string, 10) || 0,
    availableCents:
      (parseInt(row?.available_cents as string, 10) || 0) - pendingWithdrawal,
    paidCents: parseInt(row?.paid_cents as string, 10) || 0,
    lastUpdatedAt: new Date(),
  }
}

/**
 * Get balance transaction history
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param options - Pagination and filtering options
 */
export async function getBalanceTransactions(
  payeeId: string,
  tenantSlug: string,
  options: {
    limit?: number
    offset?: number
    type?: BalanceTransactionType
  } = {}
): Promise<{ transactions: BalanceTransaction[]; total: number }> {
  const { limit = 50, offset = 0, type } = options

  const result = await withTenant(tenantSlug, async () => {
    if (type) {
      return sql`
        SELECT *
        FROM balance_transactions
        WHERE payee_id = ${payeeId}
          AND type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }
    return sql`
      SELECT *
      FROM balance_transactions
      WHERE payee_id = ${payeeId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantSlug, async () => {
    if (type) {
      return sql`
        SELECT COUNT(*) as total
        FROM balance_transactions
        WHERE payee_id = ${payeeId}
          AND type = ${type}
      `
    }
    return sql`
      SELECT COUNT(*) as total
      FROM balance_transactions
      WHERE payee_id = ${payeeId}
    `
  })

  return {
    transactions: result.rows.map(mapRowToTransaction),
    total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
  }
}

/**
 * Record a balance transaction
 *
 * @param data - Transaction data
 * @param tenantSlug - Tenant slug for schema access
 */
export async function recordBalanceTransaction(
  data: {
    payeeId: string
    tenantId: string
    type: BalanceTransactionType
    amountCents: number
    description: string
    referenceType?: 'payment_request' | 'withdrawal' | 'adjustment'
    referenceId?: string
    metadata?: Record<string, unknown>
  },
  tenantSlug: string
): Promise<BalanceTransaction> {
  // Get current balance to calculate balance after
  const balance = await getPayeeBalance(data.payeeId, tenantSlug)
  const balanceAfterCents = balance.availableCents + data.amountCents

  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO balance_transactions (
        payee_id, tenant_id, type, amount_cents, balance_after_cents,
        description, reference_type, reference_id, metadata
      )
      VALUES (
        ${data.payeeId}, ${data.tenantId}, ${data.type}, ${data.amountCents},
        ${balanceAfterCents}, ${data.description}, ${data.referenceType || null},
        ${data.referenceId || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}
      )
      RETURNING *
    `
  })

  return mapRowToTransaction(result.rows[0] as Record<string, unknown>)
}

/**
 * Map database row to BalanceTransaction
 */
function mapRowToTransaction(row: Record<string, unknown>): BalanceTransaction {
  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    type: row.type as BalanceTransactionType,
    amountCents: parseInt(row.amount_cents as string, 10),
    balanceAfterCents: parseInt(row.balance_after_cents as string, 10),
    description: row.description as string,
    referenceType: row.reference_type as
      | 'payment_request'
      | 'withdrawal'
      | 'adjustment'
      | null,
    referenceId: (row.reference_id as string) || null,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: new Date(row.created_at as string),
  }
}
