/**
 * Payout database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type { Withdrawal, WithdrawalFilters, PayoutSummary } from './types'

export async function getWithdrawals(
  tenantSlug: string,
  filters: WithdrawalFilters,
): Promise<{ rows: Withdrawal[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`w.status = $${paramIndex}::withdrawal_status`)
      values.push(filters.status)
    }

    if (filters.method) {
      paramIndex++
      conditions.push(`w.method = $${paramIndex}::payout_method`)
      values.push(filters.method)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(`(c.email ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    if (filters.dateFrom) {
      paramIndex++
      conditions.push(`w.requested_at >= $${paramIndex}::timestamptz`)
      values.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      paramIndex++
      conditions.push(`w.requested_at <= $${paramIndex}::timestamptz`)
      values.push(filters.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        w.id, w.creator_id, w.amount_cents, w.currency, w.method, w.status,
        w.transfer_id, w.failure_reason, w.notes, w.requested_at,
        w.approved_at, w.approved_by, w.processed_at, w.created_at, w.updated_at,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email
      FROM withdrawals w
      JOIN creators c ON c.id = w.creator_id
      ${whereClause}
      ORDER BY w.requested_at DESC NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM withdrawals w
       JOIN creators c ON c.id = w.creator_id
       ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as Withdrawal[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getWithdrawal(
  tenantSlug: string,
  withdrawalId: string,
): Promise<Withdrawal | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        w.id, w.creator_id, w.amount_cents, w.currency, w.method, w.status,
        w.transfer_id, w.failure_reason, w.notes, w.requested_at,
        w.approved_at, w.approved_by, w.processed_at, w.created_at, w.updated_at,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email
      FROM withdrawals w
      JOIN creators c ON c.id = w.creator_id
      WHERE w.id = ${withdrawalId}
      LIMIT 1
    `
    return (result.rows[0] as Withdrawal) || null
  })
}

export async function getPayoutSummary(tenantSlug: string): Promise<PayoutSummary> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint as pending_amount_cents,
        COUNT(*) FILTER (WHERE status = 'processing')::int as processing_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'processing'), 0)::bigint as processing_amount_cents,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'completed' AND processed_at >= date_trunc('month', NOW())), 0)::bigint as completed_this_month_cents,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'completed'), 0)::bigint as completed_total_cents
      FROM withdrawals
    `
    return result.rows[0] as PayoutSummary
  })
}

export async function approveWithdrawal(
  tenantSlug: string,
  withdrawalId: string,
  approvedBy: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = 'approved'::withdrawal_status, approved_at = NOW(), approved_by = ${approvedBy}, updated_at = NOW()
      WHERE id = ${withdrawalId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function rejectWithdrawal(
  tenantSlug: string,
  withdrawalId: string,
  reason: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = 'rejected'::withdrawal_status, failure_reason = ${reason}, updated_at = NOW()
      WHERE id = ${withdrawalId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function processWithdrawal(
  tenantSlug: string,
  withdrawalId: string,
  transferId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = 'completed'::withdrawal_status, transfer_id = ${transferId}, processed_at = NOW(), updated_at = NOW()
      WHERE id = ${withdrawalId} AND status IN ('approved', 'processing')
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function markWithdrawalProcessing(
  tenantSlug: string,
  withdrawalId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = 'processing'::withdrawal_status, updated_at = NOW()
      WHERE id = ${withdrawalId} AND status = 'approved'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function failWithdrawal(
  tenantSlug: string,
  withdrawalId: string,
  reason: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE withdrawals
      SET status = 'failed'::withdrawal_status, failure_reason = ${reason}, updated_at = NOW()
      WHERE id = ${withdrawalId} AND status = 'processing'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}
