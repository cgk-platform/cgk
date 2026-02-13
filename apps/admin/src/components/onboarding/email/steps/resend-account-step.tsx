'use client'

import { useState, useCallback } from 'react'
import { Button } from '@cgk-platform/ui'
import { Input } from '@cgk-platform/ui'
import { Label } from '@cgk-platform/ui'

import type { ResendAccountStepProps } from '../types'

/**
 * Step 5a: Resend Account Setup
 *
 * Guides user to create/connect their Resend account and verify API key.
 */
export function ResendAccountStep({ onApiKeyVerified, onBack: _onBack }: ResendAccountStepProps) {
  const [apiKey, setApiKey] = useState('')
  const [fullAccessKey, setFullAccessKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasResendAccount, setHasResendAccount] = useState<boolean | null>(null)

  const handleVerify = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/verify-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          fullAccessKey: fullAccessKey.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify API key')
      }

      setSuccess(true)
      // Short delay to show success state
      setTimeout(() => {
        onApiKeyVerified(apiKey.trim())
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify API key')
    } finally {
      setIsVerifying(false)
    }
  }, [apiKey, fullAccessKey, onApiKeyVerified])

  // Initial question screen
  if (hasResendAccount === null) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium">Do you have a Resend account?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Resend is the email delivery service we use to send transactional emails.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setHasResendAccount(false)}
          >
            No, I need to create one
          </Button>
          <Button
            size="lg"
            onClick={() => setHasResendAccount(true)}
          >
            Yes, I have an account
          </Button>
        </div>
      </div>
    )
  }

  // Create account flow
  if (!hasResendAccount) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="font-medium">Create a Resend Account</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow these steps to set up your Resend account:
          </p>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm">
            <li>
              Visit{' '}
              <a
                href="https://resend.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                resend.com/signup
              </a>{' '}
              to create your free account
            </li>
            <li>Verify your email address</li>
            <li>Go to Settings API Keys to create a new API key</li>
            <li>Copy the API key and come back here</li>
          </ol>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setHasResendAccount(null)}
          >
            Back
          </Button>
          <Button
            asChild
          >
            <a
              href="https://resend.com/signup"
              target="_blank"
              rel="noopener noreferrer"
            >
              Create Resend Account
            </a>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setHasResendAccount(true)}
          >
            I have my API key
          </Button>
        </div>
      </div>
    )
  }

  // API key entry flow
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Resend API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="re_xxxxxxxx..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isVerifying || success}
              className="pr-20"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can find your API key at{' '}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              resend.com/api-keys
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="full-access-key">Full Access Key (Optional)</Label>
          <Input
            id="full-access-key"
            type={showKey ? 'text' : 'password'}
            placeholder="re_xxxxxxxx..."
            value={fullAccessKey}
            onChange={(e) => setFullAccessKey(e.target.value)}
            disabled={isVerifying || success}
          />
          <p className="text-xs text-muted-foreground">
            Required for receiving inbound emails. Leave blank if you only need to send emails.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
          API key verified successfully! Proceeding to domain configuration...
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => setHasResendAccount(null)}
          disabled={isVerifying}
        >
          Back
        </Button>
        <Button
          onClick={handleVerify}
          disabled={!apiKey.trim() || isVerifying || success}
        >
          {isVerifying ? 'Verifying...' : 'Verify API Key'}
        </Button>
      </div>
    </div>
  )
}

export default ResendAccountStep
