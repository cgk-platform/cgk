'use client'

import { Button, Input, Label, Textarea } from '@cgk/ui'
import { Mail, FileText, ExternalLink } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AbandonedCheckout } from '@/lib/abandoned-checkouts/types'

interface CheckoutActionsProps {
  checkout: AbandonedCheckout
}

export function CheckoutActions({ checkout }: CheckoutActionsProps) {
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [isDraftOpen, setIsDraftOpen] = useState(false)

  const canSendRecoveryEmail =
    checkout.status === 'abandoned' &&
    checkout.customerEmail &&
    checkout.recoveryEmailCount < checkout.maxRecoveryEmails

  const canCreateDraftOrder = checkout.status === 'abandoned'

  return (
    <div className="relative flex items-center gap-2">
      {canSendRecoveryEmail && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsRecoveryOpen(true)}
          title="Send Recovery Email"
        >
          <Mail className="h-4 w-4" />
        </Button>
      )}

      {canCreateDraftOrder && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDraftOpen(true)}
          title="Create Draft Order"
        >
          <FileText className="h-4 w-4" />
        </Button>
      )}

      {checkout.recoveryUrl && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          title="View Recovery URL"
        >
          <a href={checkout.recoveryUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}

      {isRecoveryOpen && (
        <SendRecoveryEmailModal
          checkout={checkout}
          onClose={() => setIsRecoveryOpen(false)}
        />
      )}

      {isDraftOpen && (
        <CreateDraftOrderModal
          checkout={checkout}
          onClose={() => setIsDraftOpen(false)}
        />
      )}
    </div>
  )
}

interface SendRecoveryEmailModalProps {
  checkout: AbandonedCheckout
  onClose: () => void
}

function SendRecoveryEmailModal({ checkout, onClose }: SendRecoveryEmailModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [incentiveCode, setIncentiveCode] = useState('')

  const handleSend = async () => {
    setError(null)

    const response = await fetch(`/api/admin/abandoned-checkouts/${checkout.id}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incentiveCode: incentiveCode || undefined,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to send recovery email')
      return
    }

    startTransition(() => {
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Send Recovery Email</h2>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Recipient</Label>
            <p className="text-sm text-muted-foreground">{checkout.customerEmail}</p>
          </div>

          <div>
            <Label>Email #{checkout.recoveryEmailCount + 1} of {checkout.maxRecoveryEmails}</Label>
            <p className="text-xs text-muted-foreground">
              {checkout.recoveryEmailCount > 0
                ? `${checkout.recoveryEmailCount} email(s) already sent`
                : 'First recovery email'}
            </p>
          </div>

          <div>
            <Label htmlFor="incentiveCode">Incentive Code (optional)</Label>
            <Input
              id="incentiveCode"
              placeholder="e.g., COMEBACK10"
              value={incentiveCode}
              onChange={(e) => setIncentiveCode(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Include a discount code to encourage checkout completion
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? 'Sending...' : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface CreateDraftOrderModalProps {
  checkout: AbandonedCheckout
  onClose: () => void
}

function CreateDraftOrderModal({ checkout, onClose }: CreateDraftOrderModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [notes, setNotes] = useState('')

  const handleCreate = async () => {
    setError(null)

    const response = await fetch('/api/admin/draft-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkoutId: checkout.id,
        discountCode: discountCode || undefined,
        notes: notes || undefined,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to create draft order')
      return
    }

    startTransition(() => {
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Create Draft Order</h2>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <p className="text-sm text-muted-foreground">
              {checkout.customerName || checkout.customerEmail || 'Guest'}
            </p>
          </div>

          <div>
            <Label>Cart Total</Label>
            <p className="text-sm font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: checkout.currencyCode,
              }).format(checkout.cartTotalCents / 100)}
            </p>
          </div>

          <div>
            <Label>Items</Label>
            <ul className="mt-1 text-sm text-muted-foreground">
              {checkout.lineItems.map((item) => (
                <li key={item.id}>
                  {item.quantity}x {item.title}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Label htmlFor="discountCode">Discount Code (optional)</Label>
            <Input
              id="discountCode"
              placeholder="e.g., SAVE10"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Internal Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any internal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? 'Creating...' : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Draft Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
