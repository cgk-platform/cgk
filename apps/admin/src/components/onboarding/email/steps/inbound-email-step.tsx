'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@cgk-platform/ui'
import { Card, CardHeader } from '@cgk-platform/ui'
import { Switch } from '@cgk-platform/ui'
import { Badge } from '@cgk-platform/ui'

import type { SenderAddressWithDomain } from '@cgk-platform/communications'
import type { InboundEmailStepProps } from '../types'

interface InboundAddress {
  address: SenderAddressWithDomain
  defaultPurpose: string
  defaultDescription: string
  currentlyEnabled: boolean
}

/**
 * Step 5d: Inbound Email Setup (Optional)
 *
 * Configure inbound email handling for replies.
 */
export function InboundEmailStep({
  senderAddresses: _senderAddresses,
  onComplete,
  onSkip,
  onBack,
}: InboundEmailStepProps) {
  const [inboundAddresses, setInboundAddresses] = useState<InboundAddress[]>([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localEnabled, setLocalEnabled] = useState<Record<string, boolean>>({})

  // Load inbound configuration
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/admin/onboarding/email/inbound/configure')
        const data = await response.json()

        if (data.addresses) {
          setInboundAddresses(data.addresses)
          // Initialize local state
          const enabled: Record<string, boolean> = {}
          data.addresses.forEach((addr: InboundAddress) => {
            enabled[addr.address.id] = addr.currentlyEnabled
          })
          setLocalEnabled(enabled)
        }

        if (data.webhookInfo?.url) {
          setWebhookUrl(data.webhookInfo.url)
        }
      } catch {
        // Continue with empty
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleToggle = useCallback((addressId: string, enabled: boolean) => {
    setLocalEnabled((prev) => ({ ...prev, [addressId]: enabled }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      const configs = Object.entries(localEnabled).map(([addressId, enabled]) => ({
        senderAddressId: addressId,
        purpose: inboundAddresses.find((a) => a.address.id === addressId)?.defaultPurpose ?? '',
        description: '',
        enabled,
      }))

      const response = await fetch('/api/admin/onboarding/email/inbound/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: configs }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [localEnabled, inboundAddresses, onComplete])

  const handleCopyWebhook = useCallback(() => {
    navigator.clipboard.writeText(webhookUrl)
  }, [webhookUrl])

  if (isLoading) {
    return <div className="text-center py-8">Loading inbound configuration...</div>
  }

  const anyEnabled = Object.values(localEnabled).some(Boolean)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-medium">What is inbound email?</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          Inbound email allows your system to receive and process email replies.
          This is useful for treasury approvals, customer support, and creator communications.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong>This step is optional.</strong> You can configure inbound email later.
        </p>
      </div>

      {/* Webhook URL */}
      {webhookUrl && (
        <div className="space-y-2">
          <h4 className="font-medium">Webhook URL for Resend</h4>
          <p className="text-sm text-muted-foreground">
            Configure this URL in your Resend dashboard for inbound email webhooks:
          </p>
          <div className="flex gap-2">
            <code className="flex-1 rounded border bg-muted p-2 text-sm break-all">
              {webhookUrl}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyWebhook}>
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Inbound-capable addresses */}
      {inboundAddresses.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Configure Inbound Addresses</h4>
          <p className="text-sm text-muted-foreground">
            Enable inbound handling for these addresses:
          </p>

          {inboundAddresses.map(({ address, defaultPurpose, defaultDescription }) => (
            <Card key={address.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{address.emailAddress}</span>
                      <Badge variant="secondary">{defaultPurpose}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {defaultDescription}
                    </p>
                  </div>
                  <Switch
                    checked={localEnabled[address.id] ?? false}
                    onCheckedChange={(checked) => handleToggle(address.id, checked)}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground">
            No inbound-capable addresses available.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Inbound email works with treasury, support, and creator addresses.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip This Step
          </Button>
          {anyEnabled && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </Button>
          )}
          {!anyEnabled && (
            <Button onClick={onComplete}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default InboundEmailStep
