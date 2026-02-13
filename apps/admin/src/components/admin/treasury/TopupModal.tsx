'use client'

import { Button } from '@cgk-platform/ui'
import { Input } from '@cgk-platform/ui'
import { Label } from '@cgk-platform/ui'
import {
  DollarSign,
  CreditCard,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'

import type { FundingSource, PendingWithdrawal } from '@/lib/treasury/types'

interface TopupModalProps {
  onClose: () => void
  onSuccess: () => void
  pendingWithdrawals?: PendingWithdrawal[]
}

function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

export function TopupModal({ onClose, onSuccess, pendingWithdrawals = [] }: TopupModalProps) {
  const [step, setStep] = useState<'amount' | 'source' | 'confirm'>('amount')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [linkWithdrawals, setLinkWithdrawals] = useState<string[]>([])
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate suggested amount based on pending withdrawals
  const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount_cents, 0)
  const suggestedAmount = Math.ceil(pendingTotal / 100)

  useEffect(() => {
    async function loadSources() {
      try {
        const response = await fetch('/api/admin/stripe/funding-sources')
        if (response.ok) {
          const data = await response.json()
          setFundingSources(data.sources || [])
          if (data.settings?.default_source_id) {
            setSelectedSourceId(data.settings.default_source_id)
          }
        }
      } finally {
        setLoadingSources(false)
      }
    }
    loadSources()
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const amountCents = Math.round(parseFloat(amount) * 100)
      if (isNaN(amountCents) || amountCents <= 0) {
        throw new Error('Please enter a valid amount')
      }

      const response = await fetch('/api/admin/stripe/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          description: description || undefined,
          sourceId: selectedSourceId || undefined,
          linkedWithdrawalIds: linkWithdrawals.length > 0 ? linkWithdrawals : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create top-up')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create top-up')
    } finally {
      setSubmitting(false)
    }
  }

  const amountCents = Math.round((parseFloat(amount) || 0) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Create Top-up</h2>
              <p className="text-sm text-violet-200">
                {step === 'amount' && 'Enter amount'}
                {step === 'source' && 'Select funding source'}
                {step === 'confirm' && 'Review and confirm'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mt-4 flex items-center gap-2">
            {(['amount', 'source', 'confirm'] as const).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    step === s
                      ? 'bg-white text-violet-600'
                      : i < ['amount', 'source', 'confirm'].indexOf(step)
                        ? 'bg-violet-400 text-white'
                        : 'bg-violet-400/50 text-violet-200'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="mx-2 h-0.5 w-8 bg-violet-400/50" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Step 1: Amount */}
          {step === 'amount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 text-2xl font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {/* Suggested Amount */}
              {pendingTotal > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Pending Payouts</p>
                      <p className="text-xs text-amber-700">
                        {pendingWithdrawals.length} withdrawals totaling {formatMoney(pendingTotal)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(suggestedAmount.toString())}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Use Suggested
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Weekly payout funding"
                />
              </div>

              {/* Link to Withdrawals */}
              {pendingWithdrawals.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Pending Withdrawals</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                    {pendingWithdrawals.map((w) => (
                      <label
                        key={w.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-2 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={linkWithdrawals.includes(w.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setLinkWithdrawals([...linkWithdrawals, w.id])
                              } else {
                                setLinkWithdrawals(linkWithdrawals.filter((id) => id !== w.id))
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm font-medium text-slate-900">
                            {w.creator_name}
                          </span>
                        </div>
                        <span className="font-mono text-sm text-slate-600">
                          {formatMoney(w.amount_cents)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              {loadingSources ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : fundingSources.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-2 font-medium text-slate-900">No funding sources</p>
                  <p className="text-sm text-slate-500">
                    Add a bank account in your Stripe dashboard
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fundingSources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`flex w-full items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                        selectedSourceId === source.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            selectedSourceId === source.id
                              ? 'bg-violet-100 text-violet-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900">{source.bank_name}</p>
                          <p className="text-sm text-slate-500">****{source.last4}</p>
                        </div>
                      </div>
                      {selectedSourceId === source.id && (
                        <CheckCircle2 className="h-5 w-5 text-violet-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Amount</span>
                    <span className="font-mono text-xl font-bold text-slate-900">
                      {formatMoney(amountCents)}
                    </span>
                  </div>

                  {description && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Description</span>
                      <span className="text-sm text-slate-900">{description}</span>
                    </div>
                  )}

                  {selectedSourceId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Source</span>
                      <span className="text-sm text-slate-900">
                        {fundingSources.find((s) => s.id === selectedSourceId)?.bank_name ||
                          'Default'}
                      </span>
                    </div>
                  )}

                  {linkWithdrawals.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Linked Withdrawals</span>
                      <span className="text-sm text-slate-900">{linkWithdrawals.length}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Top-ups typically take 2-5 business days to arrive in your
                  Stripe balance.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {step !== 'amount' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'source') setStep('amount')
                  if (step === 'confirm') setStep('source')
                }}
                disabled={submitting}
              >
                Back
              </Button>
            )}

            {step === 'amount' && (
              <Button
                onClick={() => setStep('source')}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {step === 'source' && (
              <Button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {step === 'confirm' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Top-up <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
