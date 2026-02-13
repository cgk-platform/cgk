'use client'

import { Button, Card, CardContent, Input, Label, Select, SelectOption, Spinner, Switch } from '@cgk-platform/ui'
import { useState } from 'react'

import type { SenderPurpose } from '@cgk-platform/communications'

interface AddSenderAddressModalProps {
  open: boolean
  domainId: string
  domainName: string
  onClose: () => void
  onSuccess: () => void
}

const purposes: Array<{ value: SenderPurpose; label: string; description: string }> = [
  {
    value: 'transactional',
    label: 'Transactional',
    description: 'Order confirmations, shipping updates, review requests',
  },
  {
    value: 'creator',
    label: 'Creator',
    description: 'Creator onboarding, project updates, payout notifications',
  },
  {
    value: 'support',
    label: 'Support',
    description: 'Customer support communications',
  },
  {
    value: 'treasury',
    label: 'Treasury',
    description: 'Approval requests, payment notifications',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Team invitations, system alerts',
  },
]

export function AddSenderAddressModal({
  open,
  domainId,
  domainName,
  onClose,
  onSuccess,
}: AddSenderAddressModalProps) {
  const [localPart, setLocalPart] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [purpose, setPurpose] = useState<SenderPurpose>('transactional')
  const [isDefault, setIsDefault] = useState(false)
  const [replyToAddress, setReplyToAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/settings/email/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          localPart: localPart.toLowerCase().trim(),
          displayName: displayName.trim(),
          purpose,
          isDefault,
          replyToAddress: replyToAddress.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add sender address')
      }

      setLocalPart('')
      setDisplayName('')
      setPurpose('transactional')
      setIsDefault(false)
      setReplyToAddress('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sender address')
    } finally {
      setLoading(false)
    }
  }

  const previewEmail = `${localPart || 'example'}@${domainName}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Add Sender Address</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="localPart">Email Address</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="localPart"
                  type="text"
                  placeholder="orders"
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value)}
                  required
                  className="flex-1"
                />
                <span className="text-muted-foreground">@{domainName}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Preview: {previewEmail}
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="ACME Orders"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Shown as: "{displayName || 'Display Name'}" &lt;{previewEmail}&gt;
              </p>
            </div>

            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Select
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as SenderPurpose)}
              >
                {purposes.map((p) => (
                  <SelectOption key={p.value} value={p.value}>
                    {p.label}
                  </SelectOption>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {purposes.find((p) => p.value === purpose)?.description}
              </p>
            </div>

            <div>
              <Label htmlFor="replyTo">Reply-To Address (optional)</Label>
              <Input
                id="replyTo"
                type="email"
                placeholder="support@example.com"
                value={replyToAddress}
                onChange={(e) => setReplyToAddress(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Replies will go to this address instead
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Set as default for this purpose</p>
                <p className="text-xs text-muted-foreground">
                  Used when no specific sender is configured for a notification
                </p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !localPart || !displayName}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-1" />
                    Adding...
                  </>
                ) : (
                  'Add Address'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
