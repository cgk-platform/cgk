import { Card, CardContent, CardHeader } from '@cgk/ui'
import {
  AlertTriangle,
  Banknote,
  FileText,
  Settings,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { formatMoney, formatDateTime } from '@/lib/format'
import { getTreasurySummary, getLowBalanceAlerts } from '@/lib/treasury/db'
import { getDrawRequests } from '@/lib/treasury/db/requests'
import { getReceipts, getReceiptSummary } from '@/lib/treasury/db/receipts'
import type { DrawRequestStatus, ReceiptStatus } from '@/lib/treasury/types'

export default async function TreasuryPage() {
  return (
    <div className="min-h-screen">
      {/* Header with gradient border */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Treasury
                  </h1>
                  <p className="text-sm text-slate-500">Financial oversight and cash management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/treasury/settings"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href="/admin/stripe-topups"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-emerald-800"
              >
                <Plus className="h-4 w-4" />
                New Top-up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Suspense fallback={<TreasurySkeleton />}>
          <TreasuryDashboard />
        </Suspense>
      </div>
    </div>
  )
}

async function TreasuryDashboard() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <Banknote className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg font-medium text-slate-900">No tenant configured</p>
        <p className="text-sm text-slate-500">Please configure your tenant to view treasury data.</p>
      </div>
    )
  }

  const [summary, alerts, drawRequests, { receipts, totalCount: receiptCount }, receiptSummary] =
    await Promise.all([
      getTreasurySummary(tenantSlug),
      getLowBalanceAlerts(tenantSlug),
      getDrawRequests(tenantSlug, { status: undefined }).catch(() => []),
      getReceipts(tenantSlug, { limit: 5 }).catch(() => ({ receipts: [], totalCount: 0 })),
      getReceiptSummary(tenantSlug).catch(() => ({
        pending_count: 0,
        processed_count: 0,
        archived_count: 0,
        total_amount_cents: 0,
      })),
    ])

  const pendingRequests = drawRequests.filter((r) => r.status === 'pending')
  const recentRequests = drawRequests.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Low Balance Alerts */}
      {alerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <div className="border-b border-amber-200/50 bg-amber-100/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">Low Balance Alert</span>
            </div>
          </div>
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((alert) => (
                <div
                  key={alert.provider}
                  className="flex items-center justify-between rounded-lg border border-amber-200/50 bg-white/80 px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium capitalize text-slate-900">
                      {alert.provider}
                    </span>
                    <div className="text-xs text-slate-500">
                      Threshold: {formatMoney(Number(alert.threshold_cents))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-semibold text-amber-700">
                      {formatMoney(Number(alert.current_cents))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Available"
          value={formatMoney(summary.total_available_cents)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
          subtitle={`Across ${summary.balances.length} provider${summary.balances.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          label="Pending (In Transit)"
          value={formatMoney(summary.total_pending_cents)}
          icon={<Clock className="h-5 w-5" />}
          accent="blue"
          subtitle="Expected soon"
        />
        <SummaryCard
          label="Pending Payouts"
          value={formatMoney(summary.pending_payouts_cents)}
          icon={<FileText className="h-5 w-5" />}
          accent="amber"
          subtitle={`${pendingRequests.length} request${pendingRequests.length !== 1 ? 's' : ''} pending`}
        />
        <SummaryCard
          label="Net Available"
          value={formatMoney(summary.net_available_cents)}
          icon={<Banknote className="h-5 w-5" />}
          accent={summary.net_available_cents >= 0 ? 'slate' : 'red'}
          subtitle="After pending payouts"
          highlight
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provider Balances */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Balances by Provider</h3>
              <Link
                href="/admin/stripe-topups"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Manage Top-ups
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summary.balances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <Banknote className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No providers configured</p>
                <p className="text-xs text-slate-500">Connect payment providers to see balances</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.balances.map((balance) => (
                  <div
                    key={balance.provider}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          balance.provider === 'stripe'
                            ? 'bg-violet-100 text-violet-600'
                            : balance.provider === 'wise'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ProviderIcon provider={balance.provider} />
                      </div>
                      <div>
                        <span className="font-medium capitalize text-slate-900">
                          {balance.provider}
                        </span>
                        <div className="text-xs text-slate-500">
                          Updated {formatDateTime(balance.last_updated_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-emerald-600">
                        {formatMoney(Number(balance.available_cents), balance.currency)}
                      </div>
                      {Number(balance.pending_cents) > 0 && (
                        <div className="font-mono text-xs text-slate-500">
                          +{formatMoney(Number(balance.pending_cents), balance.currency)} pending
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Draw Requests */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Draw Requests</h3>
              <Link
                href="/admin/treasury/requests"
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No draw requests</p>
                <p className="text-xs text-slate-500">Create a request to bundle pending payouts</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/admin/treasury/requests?id=${request.id}`}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={request.status} />
                      <div>
                        <span className="font-medium text-slate-900">
                          {request.request_number}
                        </span>
                        <div className="text-xs text-slate-500">
                          {request.items.length} item{request.items.length !== 1 ? 's' : ''} &bull;{' '}
                          {request.treasurer_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-900">
                        {formatMoney(request.total_amount_cents)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(request.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipts Section */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Receipts & Invoices</h3>
              <p className="text-xs text-slate-500">
                {receiptSummary.pending_count} pending &bull;{' '}
                {receiptSummary.processed_count} processed
              </p>
            </div>
            <Link
              href="/admin/treasury/receipts"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Manage receipts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-3">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">No receipts uploaded</p>
              <p className="text-xs text-slate-500">Upload receipts and invoices for tracking</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {receipt.vendor_name || receipt.file_name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ReceiptStatusBadge status={receipt.status} />
                      {receipt.amount_cents && (
                        <span className="font-mono">
                          {formatMoney(receipt.amount_cents)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
  subtitle,
  highlight,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'emerald' | 'blue' | 'amber' | 'slate' | 'red'
  subtitle?: string
  highlight?: boolean
}) {
  const accentStyles = {
    emerald: {
      bg: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    blue: {
      bg: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    amber: {
      bg: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/20',
      text: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    slate: {
      bg: 'from-slate-600 to-slate-700',
      shadow: 'shadow-slate-500/20',
      text: 'text-slate-900',
      iconBg: 'bg-slate-100',
    },
    red: {
      bg: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/20',
      text: 'text-red-600',
      iconBg: 'bg-red-100',
    },
  }

  const style = accentStyles[accent]

  return (
    <Card
      className={`relative overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md ${highlight ? 'ring-2 ring-emerald-500/20' : ''}`}
    >
      <div
        className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${style.bg}`}
      />
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-1 font-mono text-2xl font-bold tracking-tight ${style.text}`}>
              {value}
            </p>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`rounded-lg ${style.iconBg} p-2 ${style.text}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: DrawRequestStatus }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      {status}
    </span>
  )
}

function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const styles = {
    pending: 'text-amber-600',
    processed: 'text-emerald-600',
    archived: 'text-slate-500',
  }

  return <span className={`capitalize ${styles[status]}`}>{status}</span>
}

function ProviderIcon({ provider }: { provider: string }) {
  // Simple initials-based icon
  return (
    <span className="text-sm font-bold uppercase">{provider.charAt(0)}</span>
  )
}

function TreasurySkeleton() {
  return (
    <div className="space-y-8">
      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-200">
            <div className="absolute left-0 top-0 h-1 w-full animate-pulse bg-slate-200" />
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
                      <div className="space-y-1">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                      </div>
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
