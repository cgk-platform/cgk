/**
 * Treasury database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type { TreasurySummary, ProviderBalance, BalanceHistoryEntry, LowBalanceAlert } from './types'

export async function getTreasurySummary(tenantSlug: string): Promise<TreasurySummary> {
  return withTenant(tenantSlug, async () => {
    const balancesResult = await sql`
      SELECT
        provider, available_cents, pending_cents, currency, last_updated_at
      FROM provider_balances
      ORDER BY provider ASC
    `

    const payoutsResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint as pending_payouts_cents
      FROM withdrawals
      WHERE status IN ('pending', 'approved', 'processing')
    `

    const balances = balancesResult.rows as ProviderBalance[]
    const pendingPayoutsCents = Number(payoutsResult.rows[0]?.pending_payouts_cents || 0)

    const totalAvailable = balances.reduce((sum, b) => sum + Number(b.available_cents), 0)
    const totalPending = balances.reduce((sum, b) => sum + Number(b.pending_cents), 0)

    return {
      total_available_cents: totalAvailable,
      total_pending_cents: totalPending,
      pending_payouts_cents: pendingPayoutsCents,
      net_available_cents: totalAvailable - pendingPayoutsCents,
      balances,
    }
  })
}

export async function getBalanceHistory(
  tenantSlug: string,
  days = 30,
): Promise<BalanceHistoryEntry[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, provider, available_cents, pending_cents, recorded_at
      FROM balance_history
      WHERE recorded_at >= NOW() - INTERVAL '${days} days'
      ORDER BY recorded_at DESC
    `
    return result.rows as BalanceHistoryEntry[]
  })
}

export async function getLowBalanceAlerts(tenantSlug: string): Promise<LowBalanceAlert[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        pb.provider,
        pb.available_cents as current_cents,
        COALESCE(tc.low_balance_threshold_cents, 100000) as threshold_cents,
        NOW() as triggered_at
      FROM provider_balances pb
      CROSS JOIN tenant_config tc
      WHERE pb.available_cents < COALESCE(tc.low_balance_threshold_cents, 100000)
    `
    return result.rows as LowBalanceAlert[]
  })
}

export async function recordBalanceSnapshot(
  tenantSlug: string,
  provider: string,
  availableCents: number,
  pendingCents: number,
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO balance_history (provider, available_cents, pending_cents)
      VALUES (${provider}::balance_provider, ${availableCents}, ${pendingCents})
    `

    await sql`
      INSERT INTO provider_balances (provider, available_cents, pending_cents, last_updated_at)
      VALUES (${provider}::balance_provider, ${availableCents}, ${pendingCents}, NOW())
      ON CONFLICT (provider)
      DO UPDATE SET
        available_cents = EXCLUDED.available_cents,
        pending_cents = EXCLUDED.pending_cents,
        last_updated_at = NOW()
    `
  })
}
