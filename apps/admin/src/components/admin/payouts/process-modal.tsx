'use client'

import { Button, Card, CardContent, CardHeader, Textarea } from '@cgk/ui'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { WithdrawalStatusBadge } from '@/components/commerce/status-badge'
import { formatMoney, formatDateTime } from '@/lib/format'
import type { Withdrawal } from '@/lib/payouts/types'

interface ProcessModalProps {
  withdrawal: Withdrawal
  onClose: () => void
}

export function ProcessModal({ withdrawal, onClose }: ProcessModalProps) {
  const router = useRouter()
  const [action, setAction] = useState<'approve' | 'reject' | 'execute' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(selectedAction: 'approve' | 'reject' | 'execute') {
    if (loading) return

    if (selectedAction === 'reject' && !reason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/payouts/${withdrawal.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          reason: selectedAction === 'reject' ? reason.trim() : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal')
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold">Process Withdrawal</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator</span>
              <span className="font-medium">{withdrawal.creator_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {formatMoney(withdrawal.amount_cents, withdrawal.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize">{withdrawal.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <WithdrawalStatusBadge status={withdrawal.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested</span>
              <span>{formatDateTime(withdrawal.requested_at)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {withdrawal.status === 'pending' && (
            <>
              {action === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this withdrawal is being rejected..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && action === 'approve' ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (action === 'reject') {
                      handleAction('reject')
                    } else {
                      setAction('reject')
                    }
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && action === 'reject' ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </>
          )}

          {withdrawal.status === 'approved' && (
            <div className="space-y-4">
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                This withdrawal has been approved. Execute the payout to transfer funds via{' '}
                {withdrawal.method}.
              </div>
              <Button
                onClick={() => handleAction('execute')}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Executing Payout...' : `Execute Payout via ${withdrawal.method}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
