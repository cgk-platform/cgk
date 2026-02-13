/**
 * Balance System
 *
 * Creator balance tracking, transactions, and earnings management.
 * Works with the public.creator_balance_transactions table.
 */

import { sql } from '@cgk-platform/db'

import type {
  CreatorBalance,
  BrandBalance,
  EarningsBreakdown,
  UpcomingMaturation,
  BalanceTransaction,
  RecordTransactionParams,
  TransactionListFilters,
  TransactionListResult,
  BalanceTransactionType,
} from './types'

// Re-export types
export type {
  CreatorBalance,
  BrandBalance,
  EarningsBreakdown,
  UpcomingMaturation,
  BalanceTransaction,
  RecordTransactionParams,
  TransactionListFilters,
  TransactionListResult,
  BalanceTransactionType,
} from './types'

/**
 * Days to hold commissions before they become available
 */
export const COMMISSION_HOLD_DAYS = 30

/**
 * Minimum withdrawal amount in cents ($25)
 */
export const MINIMUM_WITHDRAWAL_CENTS = 2500

/**
 * Store credit bonus percentage (10%)
 */
export const STORE_CREDIT_BONUS_PERCENT = 10

/**
 * Get creator's unified balance across all brands
 */
export async function getCreatorBalance(
  creatorId: string,
  brandId?: string
): Promise<CreatorBalance> {
  const nowIso = new Date().toISOString()

  // Get available balance
  let availableResult
  if (brandId) {
    availableResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(
        CASE
          WHEN type IN ('commission_available', 'project_payment', 'bonus', 'adjustment') THEN amount_cents
          WHEN type IN ('withdrawal', 'store_credit') THEN -amount_cents
          ELSE 0
        END
      ), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND brand_id = ${brandId}
    `
  } else {
    availableResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(
        CASE
          WHEN type IN ('commission_available', 'project_payment', 'bonus', 'adjustment') THEN amount_cents
          WHEN type IN ('withdrawal', 'store_credit') THEN -amount_cents
          ELSE 0
        END
      ), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
    `
  }

  // Get pending balance
  let pendingResult
  if (brandId) {
    pendingResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type = 'commission_pending'
      AND brand_id = ${brandId}
      AND (available_at IS NULL OR available_at > ${nowIso}::timestamptz)
    `
  } else {
    pendingResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type = 'commission_pending'
      AND (available_at IS NULL OR available_at > ${nowIso}::timestamptz)
    `
  }

  // Get total withdrawn
  let withdrawnResult
  if (brandId) {
    withdrawnResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type IN ('withdrawal', 'store_credit')
      AND brand_id = ${brandId}
    `
  } else {
    withdrawnResult = await sql<{ total: string | null }>`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type IN ('withdrawal', 'store_credit')
    `
  }

  // Get breakdown by brand if not filtering
  let byBrand: BrandBalance[] | undefined

  if (!brandId) {
    const brandBreakdown = await sql<{
      brand_id: string
      available: string
      pending: string
    }>`
      SELECT
        brand_id,
        COALESCE(SUM(
          CASE
            WHEN type IN ('commission_available', 'project_payment', 'bonus', 'adjustment') THEN amount_cents
            WHEN type IN ('withdrawal', 'store_credit') THEN -amount_cents
            ELSE 0
          END
        ), 0) as available,
        COALESCE(SUM(
          CASE
            WHEN type = 'commission_pending' AND (available_at IS NULL OR available_at > ${nowIso}::timestamptz)
            THEN amount_cents
            ELSE 0
          END
        ), 0) as pending
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND brand_id IS NOT NULL
      GROUP BY brand_id
    `

    byBrand = brandBreakdown.rows.map(row => ({
      brandId: row.brand_id,
      availableCents: parseInt(row.available, 10),
      pendingCents: parseInt(row.pending, 10),
    }))
  }

  return {
    creatorId,
    availableCents: parseInt(availableResult.rows[0]?.total || '0', 10),
    pendingCents: parseInt(pendingResult.rows[0]?.total || '0', 10),
    withdrawnCents: parseInt(withdrawnResult.rows[0]?.total || '0', 10),
    currency: 'USD',
    byBrand,
  }
}

/**
 * Get earnings breakdown by type
 */
export async function getEarningsBreakdown(
  creatorId: string,
  brandId?: string
): Promise<EarningsBreakdown> {
  let result
  if (brandId) {
    result = await sql<{ type: BalanceTransactionType; total: string }>`
      SELECT type, COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type IN ('commission_pending', 'commission_available', 'project_payment', 'bonus', 'adjustment')
      AND brand_id = ${brandId}
      GROUP BY type
    `
  } else {
    result = await sql<{ type: BalanceTransactionType; total: string }>`
      SELECT type, COALESCE(SUM(amount_cents), 0) as total
      FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      AND type IN ('commission_pending', 'commission_available', 'project_payment', 'bonus', 'adjustment')
      GROUP BY type
    `
  }

  const totals: Record<string, number> = {}
  for (const row of result.rows) {
    totals[row.type] = parseInt(row.total, 10)
  }

  const commissionsCents = (totals['commission_pending'] || 0) + (totals['commission_available'] || 0)
  const projectPaymentsCents = totals['project_payment'] || 0
  const bonusesCents = totals['bonus'] || 0
  const adjustmentsCents = totals['adjustment'] || 0

  return {
    commissionsCents,
    projectPaymentsCents,
    bonusesCents,
    adjustmentsCents,
    totalCents: commissionsCents + projectPaymentsCents + bonusesCents + adjustmentsCents,
  }
}

/**
 * Get upcoming fund maturations (pending commissions becoming available)
 */
export async function getUpcomingMaturations(
  creatorId: string,
  days: number = 30
): Promise<UpcomingMaturation[]> {
  const nowIso = new Date().toISOString()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureIso = futureDate.toISOString()

  const result = await sql<{
    maturation_date: string
    total_cents: string
    count: string
  }>`
    SELECT
      DATE(available_at)::text as maturation_date,
      COALESCE(SUM(amount_cents), 0) as total_cents,
      COUNT(*) as count
    FROM creator_balance_transactions
    WHERE creator_id = ${creatorId}
    AND type = 'commission_pending'
    AND available_at > ${nowIso}::timestamptz
    AND available_at <= ${futureIso}::timestamptz
    GROUP BY DATE(available_at)
    ORDER BY maturation_date
    LIMIT 10
  `

  return result.rows.map(row => ({
    date: new Date(row.maturation_date),
    amountCents: parseInt(row.total_cents, 10),
    count: parseInt(row.count, 10),
  }))
}

/**
 * Record a balance transaction
 */
export async function recordBalanceTransaction(
  params: RecordTransactionParams
): Promise<BalanceTransaction> {
  const {
    creatorId,
    brandId,
    type,
    amountCents,
    currency = 'USD',
    availableAt,
    orderId,
    commissionId,
    projectId,
    withdrawalId,
    description,
    metadata = {},
  } = params

  // Get current balance to calculate balance_after
  const balance = await getCreatorBalance(creatorId)
  const currentBalance = balance.availableCents

  // Calculate new balance based on transaction type
  let balanceAfter: number
  if (type === 'withdrawal' || type === 'store_credit') {
    balanceAfter = currentBalance - Math.abs(amountCents)
  } else if (type === 'commission_pending') {
    balanceAfter = currentBalance
  } else {
    balanceAfter = currentBalance + amountCents
  }

  const availableAtIso = availableAt ? availableAt.toISOString() : null

  const result = await sql<{
    id: string
    creator_id: string
    brand_id: string | null
    type: BalanceTransactionType
    amount_cents: number
    currency: string
    balance_after_cents: number
    available_at: string | null
    order_id: string | null
    commission_id: string | null
    project_id: string | null
    withdrawal_id: string | null
    description: string | null
    metadata: Record<string, unknown>
    created_at: string
  }>`
    INSERT INTO creator_balance_transactions (
      creator_id,
      brand_id,
      type,
      amount_cents,
      currency,
      balance_after_cents,
      available_at,
      order_id,
      commission_id,
      project_id,
      withdrawal_id,
      description,
      metadata
    ) VALUES (
      ${creatorId},
      ${brandId ?? null},
      ${type},
      ${amountCents},
      ${currency},
      ${balanceAfter},
      ${availableAtIso}::timestamptz,
      ${orderId ?? null},
      ${commissionId ?? null},
      ${projectId ?? null},
      ${withdrawalId ?? null},
      ${description ?? null},
      ${JSON.stringify(metadata)}::jsonb
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to insert balance transaction')
  }

  return {
    id: row.id,
    creatorId: row.creator_id,
    brandId: row.brand_id ?? undefined,
    type: row.type,
    amountCents: row.amount_cents,
    currency: row.currency,
    balanceAfterCents: row.balance_after_cents,
    availableAt: row.available_at ? new Date(row.available_at) : undefined,
    orderId: row.order_id ?? undefined,
    commissionId: row.commission_id ?? undefined,
    projectId: row.project_id ?? undefined,
    withdrawalId: row.withdrawal_id ?? undefined,
    description: row.description ?? undefined,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
  }
}

/**
 * Record a pending commission (with 30-day hold)
 */
export async function recordPendingCommission(params: {
  creatorId: string
  brandId: string
  amountCents: number
  orderId: string
  commissionId?: string
  description?: string
}): Promise<BalanceTransaction> {
  const availableAt = new Date()
  availableAt.setDate(availableAt.getDate() + COMMISSION_HOLD_DAYS)

  return recordBalanceTransaction({
    creatorId: params.creatorId,
    brandId: params.brandId,
    type: 'commission_pending',
    amountCents: params.amountCents,
    availableAt,
    orderId: params.orderId,
    commissionId: params.commissionId,
    description: params.description || `Commission for order ${params.orderId}`,
  })
}

/**
 * Mature pending commissions (convert to available)
 */
export async function maturePendingCommissions(creatorId?: string): Promise<number> {
  const nowIso = new Date().toISOString()

  // Find pending commissions ready to mature
  let pendingResult
  if (creatorId) {
    pendingResult = await sql<{
      id: string
      creator_id: string
      brand_id: string | null
      amount_cents: number
      order_id: string | null
      commission_id: string | null
    }>`
      SELECT id, creator_id, brand_id, amount_cents, order_id, commission_id
      FROM creator_balance_transactions
      WHERE type = 'commission_pending'
      AND available_at <= ${nowIso}::timestamptz
      AND creator_id = ${creatorId}
    `
  } else {
    pendingResult = await sql<{
      id: string
      creator_id: string
      brand_id: string | null
      amount_cents: number
      order_id: string | null
      commission_id: string | null
    }>`
      SELECT id, creator_id, brand_id, amount_cents, order_id, commission_id
      FROM creator_balance_transactions
      WHERE type = 'commission_pending'
      AND available_at <= ${nowIso}::timestamptz
    `
  }

  let maturedCount = 0

  for (const pending of pendingResult.rows) {
    await recordBalanceTransaction({
      creatorId: pending.creator_id,
      brandId: pending.brand_id ?? undefined,
      type: 'commission_available',
      amountCents: pending.amount_cents,
      orderId: pending.order_id ?? undefined,
      commissionId: pending.commission_id ?? undefined,
      description: `Commission matured from order ${pending.order_id}`,
      metadata: { matured_from: pending.id },
    })

    await sql`
      UPDATE creator_balance_transactions
      SET metadata = metadata || '{"matured": true}'::jsonb
      WHERE id = ${pending.id}
    `

    maturedCount++
  }

  return maturedCount
}

/**
 * List balance transactions with filtering and pagination
 */
export async function listBalanceTransactions(
  creatorId: string,
  filters: TransactionListFilters = {}
): Promise<TransactionListResult> {
  const {
    type,
    brandId,
    startDate,
    endDate,
    limit = 20,
    offset = 0,
  } = filters

  const startIso = startDate ? startDate.toISOString() : null
  const endIso = endDate ? endDate.toISOString() : null

  // Build separate queries based on which filters are provided
  // This avoids the need for dynamic SQL
  let countResult
  let transactionResult

  if (type && brandId && startIso && endIso) {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type} AND brand_id = ${brandId}
      AND created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz
    `
    transactionResult = await sql<TransactionRow>`
      SELECT * FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type} AND brand_id = ${brandId}
      AND created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
  } else if (type && brandId) {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type} AND brand_id = ${brandId}
    `
    transactionResult = await sql<TransactionRow>`
      SELECT * FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type} AND brand_id = ${brandId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
  } else if (type) {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type}
    `
    transactionResult = await sql<TransactionRow>`
      SELECT * FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND type = ${type}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
  } else if (brandId) {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND brand_id = ${brandId}
    `
    transactionResult = await sql<TransactionRow>`
      SELECT * FROM creator_balance_transactions
      WHERE creator_id = ${creatorId} AND brand_id = ${brandId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
  } else {
    countResult = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
    `
    transactionResult = await sql<TransactionRow>`
      SELECT * FROM creator_balance_transactions
      WHERE creator_id = ${creatorId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
  }

  const total = parseInt(countResult.rows[0]?.count || '0', 10)

  const transactions: BalanceTransaction[] = transactionResult.rows.map(row => ({
    id: row.id,
    creatorId: row.creator_id,
    brandId: row.brand_id ?? undefined,
    type: row.type,
    amountCents: row.amount_cents,
    currency: row.currency,
    balanceAfterCents: row.balance_after_cents,
    availableAt: row.available_at ? new Date(row.available_at) : undefined,
    orderId: row.order_id ?? undefined,
    commissionId: row.commission_id ?? undefined,
    projectId: row.project_id ?? undefined,
    withdrawalId: row.withdrawal_id ?? undefined,
    description: row.description ?? undefined,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
  }))

  return {
    transactions,
    total,
    offset,
    limit,
    hasMore: offset + transactions.length < total,
  }
}

/**
 * Calculate store credit bonus amount
 */
export function calculateStoreCreditBonus(amountCents: number): number {
  return Math.round(amountCents * (STORE_CREDIT_BONUS_PERCENT / 100))
}

// Internal type for database row
interface TransactionRow {
  id: string
  creator_id: string
  brand_id: string | null
  type: BalanceTransactionType
  amount_cents: number
  currency: string
  balance_after_cents: number
  available_at: string | null
  order_id: string | null
  commission_id: string | null
  project_id: string | null
  withdrawal_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}
