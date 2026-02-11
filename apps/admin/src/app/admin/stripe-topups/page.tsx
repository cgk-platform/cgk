/**
 * Stripe Top-ups Management Page
 * Platform balance management for creator/vendor payouts
 */

import { sql, withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { TopupsClient } from './topups-client'

import type { PendingWithdrawal, StripeBalance, StripeTopup, TopupStats } from '@/lib/admin-utilities/types'

export default function StripeTopupsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header with Balance */}
      <header className="border-b border-slate-700/50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Treasury Management
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Balance & Top-ups
              </h1>
              <p className="mt-1 text-slate-400">
                Manage platform balance for processing payouts
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Balance Cards */}
      <Suspense fallback={<BalanceCardsSkeleton />}>
        <BalanceCardsLoader />
      </Suspense>

      {/* Main Content */}
      <Suspense fallback={<TopupsTableSkeleton />}>
        <TopupsContentLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function BalanceCardsLoader() {
  // Mock balance data (would come from Stripe API in production)
  const balance: StripeBalance = {
    available: {
      usd: 2500000,
      usdFormatted: '$25,000.00',
    },
    pending: {
      usd: 150000,
      usdFormatted: '$1,500.00',
    },
  }

  return <BalanceDisplay balance={balance} />
}

function BalanceDisplay({ balance }: { balance: StripeBalance }) {
  return (
    <section className="border-b border-slate-700/50 px-6 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        {/* Available Balance */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-6 ring-1 ring-emerald-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                Available Balance
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-white">
                {balance.available.usdFormatted}
              </p>
              <p className="mt-1 text-sm text-emerald-300/70">
                Ready for payouts
              </p>
            </div>
            <div className="rounded-full bg-emerald-500/20 p-3">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="rounded-xl bg-slate-800/50 p-6 ring-1 ring-slate-700/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Pending Balance
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-200">
                {balance.pending.usdFormatted}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Arriving soon
              </p>
            </div>
            <div className="rounded-full bg-slate-700/50 p-3">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

async function TopupsContentLoader() {
  const tenantSlug = await getTenantSlug()

  let topups: StripeTopup[] = []
  let stats: TopupStats = { pending: 0, succeeded: 0, failed: 0, canceled: 0 }
  let pendingWithdrawals: PendingWithdrawal[] = []

  if (tenantSlug) {
    // Fetch topups
    topups = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT
          id,
          stripe_topup_id as "stripeTopupId",
          stripe_source_id as "stripeSourceId",
          amount_cents as "amountCents",
          currency,
          status,
          failure_code as "failureCode",
          failure_message as "failureMessage",
          expected_available_at as "expectedAvailableAt",
          completed_at as "completedAt",
          linked_withdrawal_ids as "linkedWithdrawalIds",
          statement_descriptor as "statementDescriptor",
          description,
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM stripe_topups
        ORDER BY created_at DESC
        LIMIT 50
      `
      return result.rows as StripeTopup[]
    })

    // Calculate stats
    stats = {
      pending: topups.filter((t) => t.status === 'pending').length,
      succeeded: topups.filter((t) => t.status === 'succeeded').length,
      failed: topups.filter((t) => t.status === 'failed').length,
      canceled: topups.filter((t) => t.status === 'canceled').length,
    }

    // Fetch pending withdrawals
    pendingWithdrawals = await withTenant(tenantSlug, async () => {
      const result = await sql`
        SELECT
          p.id,
          c.name as "creatorName",
          p.amount as "amountCents",
          p.status,
          p.created_at as "requestedAt"
        FROM payouts p
        LEFT JOIN creators c ON c.id = p.creator_id
        WHERE p.status IN ('pending', 'processing')
        ORDER BY p.created_at ASC
        LIMIT 20
      `
      return result.rows.map((row) => ({
        id: row.id as string,
        creatorName: (row.creatorName as string) || 'Unknown Creator',
        amountCents: Number(row.amountCents || 0),
        status: row.status as string,
        requestedAt: row.requestedAt as string,
        linkedTopupId: null,
      })) as PendingWithdrawal[]
    })
  }

  return (
    <TopupsClient
      initialTopups={topups}
      initialStats={stats}
      initialWithdrawals={pendingWithdrawals}
    />
  )
}

function BalanceCardsSkeleton() {
  return (
    <section className="border-b border-slate-700/50 px-6 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-slate-800/50"
          />
        ))}
      </div>
    </section>
  )
}

function TopupsTableSkeleton() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-96 animate-pulse rounded-xl bg-slate-800/50" />
      </div>
    </main>
  )
}
