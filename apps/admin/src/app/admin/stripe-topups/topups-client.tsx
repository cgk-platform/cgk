'use client'

/**
 * Stripe Top-ups Client Component
 * Interactive top-up management with create modal and settings
 */

import { Badge, Button, Card, cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Plus,
  Settings,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'

import type {
  PendingWithdrawal,
  StripeTopup,
  TopupStats,
  TopupStatus,
} from '@/lib/admin-utilities/types'

interface TopupsClientProps {
  initialTopups: StripeTopup[]
  initialStats: TopupStats
  initialWithdrawals: PendingWithdrawal[]
}

type FilterStatus = 'all' | TopupStatus

export function TopupsClient({
  initialTopups,
  initialStats: _initialStats,
  initialWithdrawals,
}: TopupsClientProps) {
  const [topups, setTopups] = useState(initialTopups)
  const [withdrawals] = useState(initialWithdrawals)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Calculate stats from current topups
  const stats: TopupStats = {
    pending: topups.filter((t) => t.status === 'pending').length,
    succeeded: topups.filter((t) => t.status === 'succeeded').length,
    failed: topups.filter((t) => t.status === 'failed').length,
    canceled: topups.filter((t) => t.status === 'canceled').length,
  }

  // Filter topups
  const filteredTopups =
    activeFilter === 'all'
      ? topups
      : topups.filter((t) => t.status === activeFilter)

  const handleCreateTopup = useCallback(
    async (amountCents: number, description?: string) => {
      startTransition(async () => {
        try {
          const res = await fetch('/api/admin/stripe/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountCents, description }),
          })

          if (res.ok) {
            // Refetch topups
            const topupsRes = await fetch('/api/admin/stripe/topups')
            if (topupsRes.ok) {
              const { topups: newTopups } = await topupsRes.json()
              setTopups(newTopups)
            }
            setShowCreateModal(false)
          }
        } catch (error) {
          console.error('Failed to create top-up:', error)
        }
      })
    },
    []
  )

  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Top-up
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1">
            {(['all', 'pending', 'succeeded', 'failed', 'canceled'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    activeFilter === status
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== 'all' && (
                    <span className="ml-1.5 text-xs text-slate-500">
                      {stats[status as keyof TopupStats]}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Pending Withdrawals Section */}
        {withdrawals.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Pending Withdrawals
              <Badge variant="warning">{withdrawals.length}</Badge>
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {withdrawals.slice(0, 6).map((withdrawal) => (
                <Card
                  key={withdrawal.id}
                  className="border-amber-500/20 bg-amber-500/5 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-amber-200">
                        {withdrawal.creatorName}
                      </p>
                      <p className="font-mono text-lg font-semibold text-white">
                        {formatCents(withdrawal.amountCents)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => {
                        setShowCreateModal(true)
                        // Pre-fill amount
                      }}
                    >
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      Top-up
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-amber-400/70">
                    Requested {new Date(withdrawal.requestedAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Top-ups Table */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Top-up History</h2>
          {filteredTopups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-16 text-center">
              <CreditCard className="mb-4 h-12 w-12 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-300">No top-ups yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create your first top-up to add funds to your balance
              </p>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Top-up
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50 text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Description
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Expected
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredTopups.map((topup) => (
                    <tr
                      key={topup.id}
                      className="transition-colors hover:bg-slate-700/20"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-lg font-semibold text-white">
                          {formatCents(topup.amountCents)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <TopupStatusBadge status={topup.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-300">
                          {topup.description || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-400">
                          {new Date(topup.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-400">
                          {topup.expectedAvailableAt
                            ? new Date(topup.expectedAvailableAt).toLocaleDateString()
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Create Top-up Modal */}
      {showCreateModal && (
        <CreateTopupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTopup}
          isPending={isPending}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </main>
  )
}

// ============================================================================
// Create Top-up Modal
// ============================================================================

interface CreateTopupModalProps {
  onClose: () => void
  onSubmit: (amountCents: number, description?: string) => void
  isPending: boolean
}

function CreateTopupModal({ onClose, onSubmit, isPending }: CreateTopupModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const amountCents = Math.round(parseFloat(amount || '0') * 100)
  const isValid = amountCents >= 100 // Minimum $1.00

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onSubmit(amountCents, description || undefined)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Top-up</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Amount (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 py-3 pl-10 pr-4 font-mono text-xl text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Weekly payout funding"
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {isValid && (
            <div className="rounded-lg bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-300">
                This will initiate a transfer of{' '}
                <span className="font-mono font-semibold">
                  {formatCents(amountCents)}
                </span>{' '}
                from your connected bank account. Funds typically arrive within 1-2
                business days.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={!isValid || isPending}
            >
              {isPending ? 'Creating...' : 'Create Top-up'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Settings Modal
// ============================================================================

interface SettingsModalProps {
  onClose: () => void
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false)
  const [threshold, setThreshold] = useState('')
  const [autoAmount, setAutoAmount] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Top-up Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Auto Top-up Toggle */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-white">Auto Top-up</p>
              <p className="text-sm text-slate-400">
                Automatically top-up when balance falls below threshold
              </p>
            </div>
            <button
              onClick={() => setAutoTopupEnabled(!autoTopupEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                autoTopupEnabled ? 'bg-emerald-600' : 'bg-slate-600'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  autoTopupEnabled && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {autoTopupEnabled && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Threshold (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="1,000.00"
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 py-2.5 pl-9 pr-4 font-mono text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Trigger auto top-up when balance drops below this amount
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Auto Top-up Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={autoAmount}
                    onChange={(e) => setAutoAmount(e.target.value)}
                    placeholder="5,000.00"
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/50 py-2.5 pl-9 pr-4 font-mono text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Funding Source */}
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-300">Default Funding Source</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="rounded-md bg-slate-700 p-2">
                <CreditCard className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-white">Chase ****6789</p>
                <p className="text-xs text-slate-500">Verified bank account</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function TopupStatusBadge({ status }: { status: TopupStatus }) {
  const config: Record<
    TopupStatus,
    { icon: React.ReactNode; className: string; label: string }
  > = {
    pending: {
      icon: <Clock className="mr-1 h-3 w-3" />,
      className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      label: 'Pending',
    },
    succeeded: {
      icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
      className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      label: 'Succeeded',
    },
    failed: {
      icon: <XCircle className="mr-1 h-3 w-3" />,
      className: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      label: 'Failed',
    },
    canceled: {
      icon: <X className="mr-1 h-3 w-3" />,
      className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      label: 'Canceled',
    },
    reversed: {
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
      className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      label: 'Reversed',
    },
  }

  const { icon, className, label } = config[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {icon}
      {label}
    </span>
  )
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
