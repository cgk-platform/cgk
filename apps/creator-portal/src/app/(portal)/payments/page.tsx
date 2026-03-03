'use client'

/**
 * Creator Payments Dashboard Page
 *
 * Shows balance summary, earnings breakdown, transaction history, and withdrawal options.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

import WithdrawalModal from '@/components/payments/WithdrawalModal'
import WithdrawalTimeline from '@/components/payments/WithdrawalTimeline'
import TransactionList from '@/components/payments/TransactionList'

interface BalanceData {
  balance: {
    available: number
    pending: number
    withdrawn: number
    currency: string
    byBrand?: Array<{
      brandId: string
      brandName: string
      available: number
      pending: number
    }>
  }
  earnings: {
    commissions: number
    projectPayments: number
    bonuses: number
    adjustments: number
    total: number
  }
  upcomingMaturations: Array<{
    date: string
    amount: number
    count: number
  }>
  withdrawal: {
    minimumCents: number
    canWithdraw: boolean
    blockers: Array<{
      type: string
      message: string
      actionUrl?: string
      actionLabel?: string
    }>
  }
}

interface WithdrawalData {
  activeWithdrawal: {
    id: string
    amount: number
    currency: string
    payoutType: 'cash' | 'store_credit'
    storeCreditBonus?: number
    status: string
    provider?: string
    estimatedArrival?: string
    createdAt: string
  } | null
}

interface PaymentMethod {
  id: string
  type: string
  status: string
  isDefault: boolean
  displayName: string | null
}

export default function PaymentsPage(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [balanceRes, withdrawRes, methodsRes] = await Promise.all([
        fetch('/api/creator/payments/balance'),
        fetch('/api/creator/payments/withdraw'),
        fetch('/api/creator/payments/methods'),
      ])

      if (!balanceRes.ok) throw new Error('Failed to load balance')
      if (!withdrawRes.ok) throw new Error('Failed to load withdrawals')
      if (!methodsRes.ok) throw new Error('Failed to load payment methods')

      const [balance, withdraw, methods] = await Promise.all([
        balanceRes.json() as Promise<BalanceData>,
        withdrawRes.json() as Promise<WithdrawalData>,
        methodsRes.json() as Promise<{ methods: PaymentMethod[] }>,
      ])

      setBalanceData(balance)
      setWithdrawalData(withdraw)
      setPaymentMethods(methods.methods)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !balanceData) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-700">
        <p>{error || 'Failed to load payment data'}</p>
        <button onClick={loadData} className="mt-2 underline">
          Try again
        </button>
      </div>
    )
  }

  const { balance, earnings, upcomingMaturations, withdrawal } = balanceData
  const activeWithdrawal = withdrawalData?.activeWithdrawal
  const hasActiveMethod = paymentMethods.some((m) => m.status === 'active')
  const incompleteStripe = paymentMethods.some(
    (m) => m.type === 'stripe_connect' && m.status === 'setup_required'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Available Balance */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(balance.available)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Ready for withdrawal</p>
          {withdrawal.canWithdraw && balance.available >= withdrawal.minimumCents && (
            <button
              onClick={() => setShowWithdrawalModal(true)}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Request Withdrawal
            </button>
          )}
        </div>

        {/* Pending Balance */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Balance</span>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-600">{formatCurrency(balance.pending)}</p>
          <p className="mt-1 text-sm text-muted-foreground">In 30-day hold</p>
        </div>

        {/* Total Paid */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
            <div className="h-2 w-2 rounded-full bg-gray-400" />
          </div>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(balance.withdrawn)}</p>
          <p className="mt-1 text-sm text-muted-foreground">All-time earnings paid</p>
        </div>
      </div>

      {/* Alerts */}
      {(!hasActiveMethod || incompleteStripe) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">
                {incompleteStripe ? 'Complete Stripe Setup' : 'Set Up Payout Method'}
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {incompleteStripe
                  ? 'Please complete your Stripe Connect setup to receive payouts.'
                  : 'Please set up a payout method to receive your earnings.'}
              </p>
              <Link
                href="/settings/payout-methods"
                className="mt-2 inline-block text-sm font-medium text-amber-800 underline"
              >
                {incompleteStripe ? 'Complete Setup' : 'Set Up Now'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Blockers */}
      {withdrawal.blockers.map((blocker, index) => (
        <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-red-800">{blocker.message}</p>
              {blocker.actionUrl && (
                <Link
                  href={blocker.actionUrl}
                  className="mt-2 inline-block text-sm font-medium text-red-800 underline"
                >
                  {blocker.actionLabel || 'Resolve'}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Active Withdrawal */}
      {activeWithdrawal && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Active Withdrawal</h2>
          <WithdrawalTimeline withdrawal={activeWithdrawal} />
        </div>
      )}

      {/* Earnings Summary */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Earnings Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Commissions</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(earnings.commissions)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Project Payments</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(earnings.projectPayments)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Bonuses</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(earnings.bonuses)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Adjustments</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(earnings.adjustments)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="font-medium">Total Earned</span>
          <span className="text-xl font-bold">{formatCurrency(earnings.total)}</span>
        </div>
      </div>

      {/* Upcoming Funds Release */}
      {upcomingMaturations.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Upcoming Funds Release</h2>
          <div className="space-y-3">
            {upcomingMaturations.slice(0, 5).map((maturation, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{formatDate(maturation.date)}</p>
                  <p className="text-sm text-muted-foreground">
                    {maturation.count} commission{maturation.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(maturation.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Hold Explainer */}
      <div className="rounded-lg border bg-blue-50 p-4 text-blue-800">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">About the 30-Day Hold</p>
            <p className="mt-1 text-sm">
              Commission earnings are held for 30 days before becoming available for withdrawal.
              This protects against order cancellations and refunds. Project payments are available immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Transaction History</h2>
        <TransactionList creatorId="" />
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <WithdrawalModal
          availableBalance={balance.available}
          minimumAmount={withdrawal.minimumCents}
          paymentMethods={paymentMethods.filter((m) => m.status === 'active')}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={() => {
            setShowWithdrawalModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
