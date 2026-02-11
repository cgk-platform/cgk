'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@cgk/ui'
import { Input } from '@cgk/ui'
import { Label } from '@cgk/ui'
import { Card, CardContent, CardHeader } from '@cgk/ui'
import { Badge } from '@cgk/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@cgk/ui'

import type { DomainConfigStatus, SenderAddressWithDomain, SenderPurpose } from '@cgk/communications'
import type { SenderAddressStepProps } from '../types'

interface RecommendedSender {
  recommendation: {
    localPart: string
    displayNameTemplate: string
    purpose: SenderPurpose
    description: string
    isDefault: boolean
  }
  suggestedDomainId: string | null
  suggestedEmail: string | null
  suggestedDisplayName: string
}

/**
 * Step 5c: Sender Address Configuration
 *
 * Create sender email addresses for different purposes.
 */
export function SenderAddressStep({
  brandName,
  resendApiKey,
  verifiedDomains,
  onAddressesCreated,
  onBack,
}: SenderAddressStepProps) {
  const [addresses, setAddresses] = useState<SenderAddressWithDomain[]>([])
  const [recommendations, setRecommendations] = useState<RecommendedSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [sendingTestId, setSendingTestId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Custom address form state
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customLocalPart, setCustomLocalPart] = useState('')
  const [customDisplayName, setCustomDisplayName] = useState('')
  const [customDomainId, setCustomDomainId] = useState('')
  const [customPurpose, setCustomPurpose] = useState<SenderPurpose>('transactional')

  // Load recommendations and existing addresses
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/admin/onboarding/email/addresses/create?brandName=${encodeURIComponent(brandName)}`
        )
        const data = await response.json()
        if (data.recommendations) {
          setRecommendations(data.recommendations)
        }

        // Load existing addresses
        const addressResponse = await fetch('/api/admin/settings/email/addresses')
        const addressData = await addressResponse.json()
        if (addressData.addresses) {
          setAddresses(addressData.addresses)
        }
      } catch {
        // Continue with defaults
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [brandName])

  const handleCreateRecommended = useCallback(async (rec: RecommendedSender) => {
    if (!rec.suggestedDomainId) {
      setError('No domain available for this address')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/addresses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: rec.suggestedDomainId,
          localPart: rec.recommendation.localPart,
          displayName: rec.suggestedDisplayName,
          purpose: rec.recommendation.purpose,
          isDefault: rec.recommendation.isDefault,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create address')
      }

      // Reload addresses
      const addressResponse = await fetch('/api/admin/settings/email/addresses')
      const addressData = await addressResponse.json()
      if (addressData.addresses) {
        setAddresses(addressData.addresses)
      }

      setSuccessMessage(`Created ${rec.suggestedEmail}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address')
    } finally {
      setIsCreating(false)
    }
  }, [])

  const handleCreateCustom = useCallback(async () => {
    if (!customDomainId || !customLocalPart || !customDisplayName) {
      setError('Please fill in all fields')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/addresses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: customDomainId,
          localPart: customLocalPart,
          displayName: customDisplayName,
          purpose: customPurpose,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create address')
      }

      // Reload addresses
      const addressResponse = await fetch('/api/admin/settings/email/addresses')
      const addressData = await addressResponse.json()
      if (addressData.addresses) {
        setAddresses(addressData.addresses)
      }

      // Reset form
      setCustomLocalPart('')
      setCustomDisplayName('')
      setShowCustomForm(false)
      setSuccessMessage('Custom address created')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address')
    } finally {
      setIsCreating(false)
    }
  }, [customDomainId, customLocalPart, customDisplayName, customPurpose])

  const handleSendTest = useCallback(async (addressId: string) => {
    if (!testEmail.trim()) {
      setError('Please enter an email address for the test')
      return
    }

    setSendingTestId(addressId)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/addresses/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAddressId: addressId,
          recipientEmail: testEmail,
          brandName,
          resendApiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setSuccessMessage('Test email sent successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setSendingTestId(null)
    }
  }, [testEmail, brandName, resendApiKey])

  const handleContinue = useCallback(() => {
    onAddressesCreated(addresses)
  }, [addresses, onAddressesCreated])

  if (isLoading) {
    return <div className="text-center py-8">Loading sender configuration...</div>
  }

  const hasTransactional = addresses.some((a) => a.purpose === 'transactional')

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      <div className="space-y-4">
        <h4 className="font-medium">Recommended Sender Addresses</h4>
        <p className="text-sm text-muted-foreground">
          Click to create these recommended email addresses:
        </p>

        {recommendations.map((rec) => {
          const isCreated = addresses.some(
            (a) => a.emailAddress === rec.suggestedEmail
          )

          return (
            <Card key={rec.recommendation.localPart}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {rec.suggestedEmail || `${rec.recommendation.localPart}@...`}
                      </span>
                      <Badge variant="secondary">{rec.recommendation.purpose}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rec.recommendation.description}
                    </p>
                  </div>
                  {isCreated ? (
                    <Badge variant="default">Created</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCreateRecommended(rec)}
                      disabled={isCreating || !rec.suggestedDomainId}
                    >
                      Create
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Custom address form */}
      {!showCustomForm ? (
        <Button variant="outline" onClick={() => setShowCustomForm(true)}>
          + Add Custom Sender Address
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <h4 className="font-medium">Add Custom Sender Address</h4>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local Part</Label>
                <Input
                  placeholder="newsletter"
                  value={customLocalPart}
                  onChange={(e) => setCustomLocalPart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={customDomainId} onValueChange={setCustomDomainId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedDomains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder={`${brandName} Newsletter`}
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={customPurpose}
                onValueChange={(v) => setCustomPurpose(v as SenderPurpose)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="treasury">Treasury</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCustom} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Address'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created addresses with test option */}
      {addresses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Your Sender Addresses</h4>
          <div className="space-y-2">
            <Label>Test Email Recipient</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>

          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{address.emailAddress}</span>
                      <Badge variant="secondary">{address.purpose}</Badge>
                      {address.verificationStatus === 'verified' && (
                        <Badge variant="default">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Display: {address.displayName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendTest(address.id)}
                    disabled={
                      sendingTestId === address.id ||
                      !testEmail.trim() ||
                      address.verificationStatus !== 'verified'
                    }
                  >
                    {sendingTestId === address.id ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!hasTransactional}>
          Continue
        </Button>
      </div>

      {!hasTransactional && (
        <p className="text-center text-sm text-muted-foreground">
          Create at least one transactional sender address to continue.
        </p>
      )}
    </div>
  )
}

export default SenderAddressStep
