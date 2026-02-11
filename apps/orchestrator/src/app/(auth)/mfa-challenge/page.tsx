'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

/**
 * MFA Challenge Page
 *
 * Requires super admins to enter their TOTP code for sensitive operations.
 */
export default function MfaChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaStatus, setMfaStatus] = useState<{
    mfaEnabled: boolean
    mfaVerified: boolean
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const redirect = searchParams.get('redirect') || '/'

  // Fetch MFA status on mount
  useEffect(() => {
    async function fetchMfaStatus() {
      try {
        const response = await fetch('/api/platform/auth/mfa')
        if (response.ok) {
          const data = await response.json()
          setMfaStatus(data)

          // If MFA is already verified, redirect immediately
          if (data.mfaVerified) {
            router.push(redirect)
          }
        }
      } catch {
        // Ignore errors
      }
    }

    fetchMfaStatus()
  }, [redirect, router])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/platform/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verification failed')
        setCode('')
        inputRef.current?.focus()
        return
      }

      // Redirect to original destination
      router.push(redirect)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle code input - only allow numbers
  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)

    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      // Small delay to let the UI update
      setTimeout(() => {
        const form = e.target.form
        if (form) {
          form.requestSubmit()
        }
      }, 100)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-2">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2 text-center">
              Authentication Code
            </label>
            <input
              ref={inputRef}
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="000000"
              required
              disabled={isLoading}
              autoComplete="one-time-code"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Open your authenticator app (Google Authenticator, Authy, etc.)
            and enter the current code.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-primary hover:underline"
          >
            Back to login
          </button>
        </div>

        {!mfaStatus?.mfaEnabled && (
          <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm text-center">
            MFA is not yet configured for your account.
            You will be prompted to set it up.
          </div>
        )}
      </div>
    </div>
  )
}
