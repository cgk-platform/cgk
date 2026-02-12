'use client'

/**
 * Withdrawal Request Modal
 *
 * Allows creators to request a cash or store credit withdrawal.
 */

import { useState } from 'react'

interface PaymentMethod {
  id: string
  type: string
  status: string
  isDefault: boolean
  displayName: string | null
}

interface WithdrawalModalProps {
  availableBalance: number
  minimumAmount: number
  paymentMethods: PaymentMethod[]
  onClose: () => void
  onSuccess: () => void
}

const STORE_CREDIT_BONUS_PERCENT = 10

export default function WithdrawalModal({
  availableBalance,
  minimumAmount,
  paymentMethods,
  onClose,
  onSuccess,
}: WithdrawalModalProps): React.JSX.Element {
  const [amount, setAmount] = useState<string>('')
  const [payoutType, setPayoutType] = useState<'cash' | 'store_credit'>('cash')
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods.find((m) => m.isDefault)?.id || paymentMethods[0]?.id || ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountCents = Math.round(parseFloat(amount || '0') * 100)
  const isValidAmount = amountCents >= minimumAmount && amountCents <= availableBalance
  const storeCreditBonus = Math.round(amountCents * (STORE_CREDIT_BONUS_PERCENT / 100))
  const totalStoreCredit = amountCents + storeCreditBonus

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!isValidAmount) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/creator/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          payoutType,
          paymentMethodId: payoutType === 'cash' ? selectedMethodId : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create withdrawal')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create withdrawal')
    } finally {
      setLoading(false)
    }
  }

  function handleAmountChange(value: string): void {
    // Only allow valid decimal numbers
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(cleaned)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Request Withdrawal</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Available Balance */}
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-center">
          <p className="text-sm text-green-700">Available Balance</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-medium">
              Withdrawal Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background py-3 pl-8 pr-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum: {formatCurrency(minimumAmount)}
            </p>
            {amountCents > availableBalance && (
              <p className="mt-1 text-sm text-red-600">
                Amount exceeds available balance
              </p>
            )}
          </div>

          {/* Payout Type Toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium">Payout Type</label>
            <div className="flex rounded-lg border">
              <button
                type="button"
                onClick={() => setPayoutType('cash')}
                className={`flex-1 rounded-l-lg px-4 py-3 text-sm font-medium transition-colors ${
                  payoutType === 'cash'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPayoutType('store_credit')}
                className={`flex-1 rounded-r-lg px-4 py-3 text-sm font-medium transition-colors ${
                  payoutType === 'store_credit'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                Store Credit (+{STORE_CREDIT_BONUS_PERCENT}%)
              </button>
            </div>
          </div>

          {/* Store Credit Bonus Preview */}
          {payoutType === 'store_credit' && amountCents > 0 && (
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Base amount</span>
                <span className="font-medium">{formatCurrency(amountCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">{STORE_CREDIT_BONUS_PERCENT}% bonus</span>
                <span className="font-medium text-green-600">+{formatCurrency(storeCreditBonus)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-green-200 pt-2">
                <span className="font-medium text-green-700">Total Store Credit</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(totalStoreCredit)}</span>
              </div>
            </div>
          )}

          {/* Payment Method Selection (for cash) */}
          {payoutType === 'cash' && paymentMethods.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium">Payment Method</label>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedMethodId === method.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedMethodId === method.id}
                      onChange={() => setSelectedMethodId(method.id)}
                      className="h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium capitalize">{method.type.replace('_', ' ')}</p>
                      {method.displayName && (
                        <p className="text-sm text-muted-foreground">{method.displayName}</p>
                      )}
                    </div>
                    {method.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Default
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* No Payment Methods Warning */}
          {payoutType === 'cash' && paymentMethods.length === 0 && (
            <div className="rounded-lg bg-amber-50 p-4 text-amber-800">
              <p className="font-medium">No payment method configured</p>
              <p className="mt-1 text-sm">
                Please{' '}
                <a href="/settings/payout-methods" className="underline">
                  set up a payment method
                </a>{' '}
                to receive cash withdrawals.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValidAmount || loading || (payoutType === 'cash' && !selectedMethodId)}
            className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Withdraw ${isValidAmount ? formatCurrency(amountCents) : ''}`
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
