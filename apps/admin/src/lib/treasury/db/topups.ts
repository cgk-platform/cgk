/**
 * Stripe Topup database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  StripeTopup,
  TopupStatus,
} from '../types'

/**
 * Get all topups with optional filters
 */
export async function getTopups(
  tenantSlug: string,
  options?: {
    status?: TopupStatus
    limit?: number
    offset?: number
  }
): Promise<{ topups: StripeTopup[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::topup_status`)
      values.push(options.status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM stripe_topups ${whereClause}`,
      values
    )
    const totalCount = Number(countResult.rows[0]?.count || 0)

    // Get paginated results
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const result = await sql.query(
      `SELECT * FROM stripe_topups
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    return {
      topups: result.rows as StripeTopup[],
      totalCount,
    }
  })
}

/**
 * Get a single topup by ID
 */
export async function getTopup(
  tenantSlug: string,
  topupId: string
): Promise<StripeTopup | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM stripe_topups
      WHERE id = ${topupId}
    `
    return (result.rows[0] as StripeTopup) || null
  })
}

/**
 * Get topup by Stripe ID
 */
export async function getTopupByStripeId(
  tenantSlug: string,
  stripeTopupId: string
): Promise<StripeTopup | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM stripe_topups
      WHERE stripe_topup_id = ${stripeTopupId}
    `
    return (result.rows[0] as StripeTopup) || null
  })
}

/**
 * Create a new topup record
 */
export async function createTopup(
  tenantSlug: string,
  input: {
    stripe_topup_id: string
    amount_cents: number
    currency?: string
    status: TopupStatus
    expected_available_at?: string
    statement_descriptor?: string
    description?: string
    source_id?: string
    source_last4?: string
    source_bank_name?: string
    linked_withdrawal_ids?: string[]
  },
  createdBy: string
): Promise<StripeTopup> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO stripe_topups (
        stripe_topup_id, amount_cents, currency, status,
        expected_available_at, statement_descriptor, description,
        source_id, source_last4, source_bank_name,
        linked_withdrawal_ids, created_by
      ) VALUES (
        ${input.stripe_topup_id},
        ${input.amount_cents},
        ${input.currency || 'usd'},
        ${input.status}::topup_status,
        ${input.expected_available_at || null},
        ${input.statement_descriptor || null},
        ${input.description || null},
        ${input.source_id || null},
        ${input.source_last4 || null},
        ${input.source_bank_name || null},
        ${input.linked_withdrawal_ids || []},
        ${createdBy}
      )
      RETURNING *
    `
    return result.rows[0] as StripeTopup
  })
}

/**
 * Update topup status
 */
export async function updateTopupStatus(
  tenantSlug: string,
  topupId: string,
  status: TopupStatus,
  failureInfo?: { code?: string; message?: string }
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE stripe_topups
      SET
        status = ${status}::topup_status,
        failure_code = ${failureInfo?.code || null},
        failure_message = ${failureInfo?.message || null},
        completed_at = ${status === 'succeeded' ? 'NOW()' : null},
        updated_at = NOW()
      WHERE id = ${topupId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Update topup status by Stripe ID
 */
export async function updateTopupStatusByStripeId(
  tenantSlug: string,
  stripeTopupId: string,
  status: TopupStatus,
  failureInfo?: { code?: string; message?: string }
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const completedAt = status === 'succeeded' ? 'NOW()' : null

    const result = await sql`
      UPDATE stripe_topups
      SET
        status = ${status}::topup_status,
        failure_code = ${failureInfo?.code || null},
        failure_message = ${failureInfo?.message || null},
        completed_at = ${completedAt},
        updated_at = NOW()
      WHERE stripe_topup_id = ${stripeTopupId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get pending topups
 */
export async function getPendingTopups(
  tenantSlug: string
): Promise<StripeTopup[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM stripe_topups
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `
    return result.rows as StripeTopup[]
  })
}

/**
 * Get topup summary statistics
 */
export async function getTopupSummary(
  tenantSlug: string
): Promise<{
  pending_count: number
  pending_amount_cents: number
  succeeded_this_month_cents: number
  succeeded_total_cents: number
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint as pending_amount_cents,
        COALESCE(SUM(amount_cents) FILTER (
          WHERE status = 'succeeded'
          AND completed_at >= date_trunc('month', NOW())
        ), 0)::bigint as succeeded_this_month_cents,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'succeeded'), 0)::bigint as succeeded_total_cents
      FROM stripe_topups
    `
    return result.rows[0] as {
      pending_count: number
      pending_amount_cents: number
      succeeded_this_month_cents: number
      succeeded_total_cents: number
    }
  })
}

/**
 * Link withdrawals to a topup
 */
export async function linkWithdrawalsToTopup(
  tenantSlug: string,
  topupId: string,
  withdrawalIds: string[]
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE stripe_topups
      SET
        linked_withdrawal_ids = linked_withdrawal_ids || ${withdrawalIds}::text[],
        updated_at = NOW()
      WHERE id = ${topupId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get topups linked to specific withdrawals
 */
export async function getTopupsForWithdrawals(
  tenantSlug: string,
  withdrawalIds: string[]
): Promise<StripeTopup[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM stripe_topups
      WHERE linked_withdrawal_ids && ${withdrawalIds}::text[]
      ORDER BY created_at DESC
    `
    return result.rows as StripeTopup[]
  })
}
