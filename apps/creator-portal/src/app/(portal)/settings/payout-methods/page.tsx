'use client'

/**
 * Payout Methods Settings Page
 *
 * Allows creators to manage their payout methods including Stripe Connect.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PaymentMethod {
  id: string
  type: 'stripe_connect' | 'wise' | 'paypal' | 'venmo' | 'check'
  status: 'pending' | 'active' | 'setup_required' | 'failed'
  isDefault: boolean
  displayName: string | null
  stripe?: {
    accountId: string | null
    accountType: string | null
    onboardingComplete: boolean | null
    chargesEnabled: boolean | null
    payoutsEnabled: boolean | null
    country: string | null
  }
  legacy?: {
    identifier: string | null
    verified: boolean | null
  }
}

interface MethodsResponse {
  methods: PaymentMethod[]
  hasActiveMethod: boolean
  hasStripeConnect: boolean
  incompleteStripeSetup: boolean
  defaultMethodId: string | null
}

interface OnboardingResponse {
  hasAccount: boolean
  methodId?: string
  accountId?: string
  status?: string
  onboardingComplete?: boolean
  payoutsEnabled?: boolean
  pendingRequirements?: string[]
  onboardingUrl?: string
}

export default function PayoutMethodsPage(): React.JSX.Element {
  const searchParams = useSearchParams()
  const setupComplete = searchParams.get('setup') === 'complete'
  const error = searchParams.get('error')

  const [loading, setLoading] = useState(true)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [hasStripeConnect, setHasStripeConnect] = useState(false)
  const [_incompleteStripeSetup, setIncompleteStripeSetup] = useState(false)
  const [startingOnboarding, setStartingOnboarding] = useState(false)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load payment methods
  useEffect(() => {
    loadMethods()

    // Show success message if setup just completed
    if (setupComplete) {
      setSuccessMessage('Stripe Connect setup completed successfully!')
      setTimeout(() => setSuccessMessage(null), 5000)
    }

    // Show error message if there was an error
    if (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }, [setupComplete, error])

  async function loadMethods(): Promise<void> {
    try {
      const response = await fetch('/api/creator/payments/methods')
      if (!response.ok) throw new Error('Failed to load methods')

      const data = (await response.json()) as MethodsResponse
      setMethods(data.methods)
      setHasStripeConnect(data.hasStripeConnect)
      setIncompleteStripeSetup(data.incompleteStripeSetup)
    } catch (err) {
      console.error('Error loading methods:', err)
      setErrorMessage('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  async function startStripeOnboarding(): Promise<void> {
    setStartingOnboarding(true)
    setErrorMessage(null)

    try {
      // First check status
      const statusResponse = await fetch('/api/creator/payments/connect/onboard')
      const statusData = (await statusResponse.json()) as OnboardingResponse

      if (statusData.hasAccount && statusData.payoutsEnabled) {
        setSuccessMessage('Your Stripe account is already active!')
        await loadMethods()
        return
      }

      // Start or continue onboarding
      const response = await fetch('/api/creator/payments/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'US' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start onboarding')
      }

      const data = (await response.json()) as {
        success: boolean
        onboardingUrl?: string
        error?: string
      }

      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      } else {
        await loadMethods()
      }
    } catch (err) {
      console.error('Error starting onboarding:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start Stripe setup')
    } finally {
      setStartingOnboarding(false)
    }
  }

  async function setDefaultMethod(methodId: string): Promise<void> {
    setSettingDefault(methodId)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/creator/payments/methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodId }),
      })

      if (!response.ok) throw new Error('Failed to set default')

      setSuccessMessage('Default payment method updated')
      setTimeout(() => setSuccessMessage(null), 3000)
      await loadMethods()
    } catch (err) {
      console.error('Error setting default:', err)
      setErrorMessage('Failed to update default method')
    } finally {
      setSettingDefault(null)
    }
  }

  async function removeMethod(methodId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this payment method?')) return

    try {
      const response = await fetch(`/api/creator/payments/methods?id=${methodId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove')

      setSuccessMessage('Payment method removed')
      setTimeout(() => setSuccessMessage(null), 3000)
      await loadMethods()
    } catch (err) {
      console.error('Error removing method:', err)
      setErrorMessage('Failed to remove payment method')
    }
  }

  function getErrorMessage(code: string): string {
    switch (code) {
      case 'oauth_failed':
        return 'Stripe connection failed. Please try again.'
      case 'invalid_callback':
        return 'Invalid authentication response. Please try again.'
      case 'stripe_not_configured':
        return 'Stripe is not properly configured. Please contact support.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  function getMethodIcon(type: PaymentMethod['type']): React.ReactNode {
    switch (type) {
      case 'stripe_connect':
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
        )
      case 'paypal':
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
          </svg>
        )
      case 'venmo':
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.396 4.94c.42.75.61 1.52.61 2.5 0 3.13-2.67 7.18-4.83 10.04H9.41L6.34 1.31l5.67-.54 1.43 11.46c1.33-2.17 2.98-5.61 2.98-7.96 0-.94-.16-1.58-.42-2.1l4.39.77z"/>
          </svg>
        )
      case 'check':
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )
      default:
        return (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        )
    }
  }

  function getStatusBadge(status: PaymentMethod['status']): React.ReactNode {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        )
      case 'setup_required':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Setup Required
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
            Pending
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Failed
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payout Methods</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payout Methods</h1>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-green-700">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Bank Account (Stripe Connect) Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {getMethodIcon('stripe_connect')}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bank Account</h2>
                <p className="text-sm text-muted-foreground">
                  Connect your bank account via Stripe for fast, secure payouts
                </p>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Recommended
              </span>
            </div>

            {/* Stripe Connect Status */}
            {hasStripeConnect ? (
              <div className="mt-4">
                {methods
                  .filter((m) => m.type === 'stripe_connect')
                  .map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusBadge(method.status)}
                        {method.isDefault && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Default
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {method.stripe?.country || 'US'} Account
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.status === 'setup_required' && (
                          <button
                            onClick={startStripeOnboarding}
                            disabled={startingOnboarding}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {startingOnboarding ? 'Loading...' : 'Complete Setup'}
                          </button>
                        )}
                        {method.status === 'active' && !method.isDefault && (
                          <button
                            onClick={() => setDefaultMethod(method.id)}
                            disabled={settingDefault === method.id}
                            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <button
                onClick={startStripeOnboarding}
                disabled={startingOnboarding}
                className="mt-4 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {startingOnboarding ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up...
                  </span>
                ) : (
                  'Connect Bank Account'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legacy Payment Methods */}
      {methods.filter((m) => ['paypal', 'venmo', 'check'].includes(m.type)).length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Other Payment Methods</h2>
          <div className="space-y-3">
            {methods
              .filter((m) => ['paypal', 'venmo', 'check'].includes(m.type))
              .map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {getMethodIcon(method.type)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{method.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {method.displayName || method.legacy?.identifier || 'Not configured'}
                      </p>
                    </div>
                    {getStatusBadge(method.status)}
                    {method.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {method.status === 'active' && !method.isDefault && (
                      <button
                        onClick={() => setDefaultMethod(method.id)}
                        disabled={settingDefault === method.id}
                        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => removeMethod(method.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">How Payouts Work</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Commission earnings</p>
              <p>Commissions from sales are held for 30 days before becoming available for withdrawal.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Project payments</p>
              <p>Payments for completed projects are available immediately.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Minimum withdrawal</p>
              <p>The minimum withdrawal amount is $25.00.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              4
            </div>
            <div>
              <p className="font-medium text-foreground">Processing time</p>
              <p>Bank transfers typically arrive within 2-5 business days.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Settings
        </Link>
      </div>
    </div>
  )
}
