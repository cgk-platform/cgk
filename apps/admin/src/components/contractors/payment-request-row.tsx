'use client'

import { Button, Input, Textarea, cn } from '@cgk/ui'
import { Check, X, ChevronDown, ChevronUp, Paperclip, ExternalLink, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { formatMoney, formatDate } from '@/lib/format'
import { PaymentRequestStatusBadge } from './status-badge'
import { WORK_TYPE_LABELS, type PaymentRequest } from '@/lib/contractors/types'

interface PaymentRequestRowProps {
  request: PaymentRequest
  contractorId: string
}

export function PaymentRequestRow({ request, contractorId }: PaymentRequestRowProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [approvedAmount, setApprovedAmount] = useState(
    (request.amountCents / 100).toFixed(2),
  )
  const [adminNotes, setAdminNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAction = (action: 'approve' | 'reject') => {
    setError(null)

    startTransition(async () => {
      const response = await fetch(
        `/api/admin/contractors/${contractorId}/payments/${request.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            approvedAmountCents:
              action === 'approve' ? Math.round(parseFloat(approvedAmount) * 100) : undefined,
            adminNotes: adminNotes || undefined,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || `Failed to ${action} request`)
        return
      }

      router.refresh()
    })
  }

  const isPendingReview = request.status === 'pending'

  return (
    <div className={cn('rounded-lg border', isPendingReview && 'border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/10')}>
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        {/* Amount */}
        <div className="min-w-[100px]">
          <span className="font-mono text-lg font-semibold">
            {formatMoney(request.amountCents)}
          </span>
        </div>

        {/* Description and work type */}
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{request.description}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {WORK_TYPE_LABELS[request.workType]}
            </span>
            {request.projectTitle && (
              <span className="truncate">
                for <span className="font-medium">{request.projectTitle}</span>
              </span>
            )}
          </div>
        </div>

        {/* Submitted date */}
        <div className="hidden text-sm text-muted-foreground sm:block">
          {formatDate(request.submittedAt)}
        </div>

        {/* Status */}
        <div>
          <PaymentRequestStatusBadge status={request.status} />
        </div>

        {/* Attachments indicator */}
        {request.attachments.length > 0 && (
          <div className="hidden text-muted-foreground sm:block" title={`${request.attachments.length} attachment(s)`}>
            <Paperclip className="h-4 w-4" />
          </div>
        )}

        {/* Actions for pending requests */}
        {isPendingReview && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('approve')}
              disabled={isPending}
              className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('reject')}
              disabled={isPending}
              className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Full description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="mt-1 text-sm">{request.description}</p>
          </div>

          {/* Attachments */}
          {request.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {request.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded border bg-background px-2 py-1 text-sm hover:border-primary"
                  >
                    <Paperclip className="h-3 w-3" />
                    {attachment.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes for reviewed requests */}
          {request.adminNotes && request.status !== 'pending' && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Admin Notes</h4>
              <p className="mt-1 text-sm">{request.adminNotes}</p>
            </div>
          )}

          {/* Approval form for pending requests */}
          {isPendingReview && (
            <div className="space-y-3 rounded-md border bg-background p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Approved Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    disabled={isPending}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Requested: {formatMoney(request.amountCents)}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Add notes about this decision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    disabled={isPending}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleAction('reject')}
                  disabled={isPending}
                  className="text-destructive"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve {formatMoney(Math.round(parseFloat(approvedAmount) * 100))}
                </Button>
              </div>
            </div>
          )}

          {/* Review info for already reviewed requests */}
          {request.reviewedAt && (
            <div className="text-xs text-muted-foreground">
              Reviewed on {formatDate(request.reviewedAt)}
              {request.approvedAmountCents !== null && request.approvedAmountCents !== request.amountCents && (
                <span className="ml-2">
                  (Approved: {formatMoney(request.approvedAmountCents)})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
