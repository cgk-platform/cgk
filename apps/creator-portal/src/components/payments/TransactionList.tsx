'use client'

/**
 * Transaction List Component
 *
 * Displays a filterable, paginated list of balance transactions.
 */

import { useEffect, useState, useCallback } from 'react'

type TransactionType =
  | 'commission_pending'
  | 'commission_available'
  | 'project_payment'
  | 'bonus'
  | 'adjustment'
  | 'withdrawal'
  | 'store_credit'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  balanceAfter: number
  description: string | null
  brandId: string | null
  orderId: string | null
  projectId: string | null
  withdrawalId: string | null
  availableAt: string | null
  createdAt: string
}

interface TransactionListProps {
  creatorId: string
  brandId?: string
}

const FILTER_OPTIONS: Array<{ value: TransactionType | 'all'; label: string }> = [
  { value: 'all', label: 'All Transactions' },
  { value: 'commission_pending', label: 'Commission (Pending)' },
  { value: 'commission_available', label: 'Commission (Available)' },
  { value: 'project_payment', label: 'Project Payment' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'adjustment', label: 'Adjustment' },
]

export default function TransactionList({ brandId }: TransactionListProps): React.JSX.Element {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TransactionType | 'all'>('all')
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: false,
  })

  const loadTransactions = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      const offset = reset ? 0 : pagination.offset

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      })

      if (filter !== 'all') {
        params.set('type', filter)
      }
      if (brandId) {
        params.set('brandId', brandId)
      }

      const response = await fetch(`/api/creator/payments/transactions?${params}`)
      if (!response.ok) throw new Error('Failed to load transactions')

      const data = await response.json() as {
        transactions: Transaction[]
        pagination: typeof pagination
      }

      if (reset) {
        setTransactions(data.transactions)
      } else {
        setTransactions((prev) => [...prev, ...data.transactions])
      }
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [filter, brandId, pagination.limit, pagination.offset])

  useEffect(() => {
    loadTransactions(true)
  }, [filter, brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  function formatCurrency(cents: number): string {
    const prefix = cents >= 0 ? '+' : ''
    return prefix + new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getTypeBadge(type: TransactionType): React.ReactNode {
    const styles: Record<TransactionType, { bg: string; text: string; label: string }> = {
      commission_pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Commission (Pending)' },
      commission_available: { bg: 'bg-green-100', text: 'text-green-700', label: 'Commission' },
      project_payment: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Project Payment' },
      bonus: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Bonus' },
      adjustment: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Adjustment' },
      withdrawal: { bg: 'bg-red-100', text: 'text-red-700', label: 'Withdrawal' },
      store_credit: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Store Credit' },
    }

    const style = styles[type]
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  function loadMore(): void {
    setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
    loadTransactions(false)
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as TransactionType | 'all')}
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {pagination.total} transaction{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transactions */}
      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No transactions found</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-sm text-primary underline"
            >
              Show all transactions
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                {getTypeBadge(tx.type)}
                <div>
                  <p className="font-medium">
                    {tx.description || getDefaultDescription(tx)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-medium ${
                    tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(tx.amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Balance: {formatCurrency(tx.balanceAfter).replace('+', '')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border px-6 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}

function getDefaultDescription(tx: Transaction): string {
  switch (tx.type) {
    case 'commission_pending':
      return tx.orderId ? `Commission for order ${tx.orderId}` : 'Commission earned'
    case 'commission_available':
      return tx.orderId ? `Commission matured from order ${tx.orderId}` : 'Commission available'
    case 'project_payment':
      return tx.projectId ? `Payment for project ${tx.projectId}` : 'Project payment'
    case 'bonus':
      return 'Bonus payment'
    case 'adjustment':
      return 'Balance adjustment'
    case 'withdrawal':
      return 'Withdrawal to bank account'
    case 'store_credit':
      return 'Store credit withdrawal'
    default:
      return 'Transaction'
  }
}
