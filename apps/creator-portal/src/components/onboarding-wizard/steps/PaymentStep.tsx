'use client'

import { cn, Input, Label } from '@cgk-platform/ui'
import { useCallback, useState } from 'react'

import type { PaymentData, PaymentMethodType } from '../../../lib/onboarding-wizard/types'

interface PaymentStepProps {
  data: PaymentData
  errors: Record<string, string>
  onChange: (data: PaymentData) => void
}

interface PaymentMethodOption {
  id: PaymentMethodType
  name: string
  description: string
  icon: React.JSX.Element
  recommended?: boolean
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'stripe_connect',
    name: 'Stripe Connect',
    description: 'Fastest payouts with instant deposits available',
    icon: <StripeIcon />,
    recommended: true,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer (ACH)',
    description: 'Direct deposit to your US bank account',
    icon: <BankIcon />,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Receive payments to your PayPal account',
    icon: <PayPalIcon />,
  },
]

/**
 * Payment Setup Step
 *
 * Configure how the creator receives payments.
 */
export function PaymentStep({
  data,
  errors,
  onChange,
}: PaymentStepProps): React.JSX.Element {
  const [isConnectingStripe, setIsConnectingStripe] = useState(false)

  const handleMethodSelect = useCallback(
    (method: PaymentMethodType) => {
      onChange({ ...data, method })
    },
    [data, onChange]
  )

  const handleStripeConnect = useCallback(async () => {
    setIsConnectingStripe(true)

    try {
      // In production, this would redirect to Stripe Connect onboarding
      const response = await fetch('/api/creator/payments/stripe-connect', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        // Redirect to Stripe Connect
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to initialize Stripe Connect:', error)
    } finally {
      setIsConnectingStripe(false)
    }
  }, [])

  const handleBankDetailsChange = useCallback(
    (field: string, value: string) => {
      onChange({
        ...data,
        bankDetails: {
          accountHolderName: data.bankDetails?.accountHolderName || '',
          routingNumber: data.bankDetails?.routingNumber || '',
          accountNumberLast4: data.bankDetails?.accountNumberLast4 || '',
          bankName: data.bankDetails?.bankName || '',
          [field]: value,
        },
      })
    },
    [data, onChange]
  )

  const handlePayPalChange = useCallback(
    (email: string) => {
      onChange({ ...data, paypalEmail: email })
    },
    [data, onChange]
  )

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="rounded-lg bg-wizard-hover p-4">
        <div className="flex gap-3">
          <ShieldIcon className="h-5 w-5 shrink-0 text-wizard-accent" />
          <div>
            <p className="text-sm font-medium text-wizard-text">
              Your payment information is secure
            </p>
            <p className="mt-1 text-sm text-wizard-muted">
              We use bank-level encryption and never store full account numbers.
              All payments are processed through trusted partners.
            </p>
          </div>
        </div>
      </div>

      {/* Method error */}
      {errors.method && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{errors.method}</p>
        </div>
      )}

      {/* Payment method selection */}
      <div>
        <Label className="text-sm font-medium text-wizard-text">
          Select Payment Method
        </Label>
        <div className="mt-3 space-y-3">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => handleMethodSelect(method.id)}
              className={cn(
                'relative w-full rounded-lg border p-4 text-left transition-all',
                data.method === method.id
                  ? 'border-wizard-accent bg-wizard-accent/5 ring-2 ring-wizard-accent/20'
                  : 'border-wizard-border bg-white hover:border-wizard-accent/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-wizard-hover">
                  {method.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-wizard-text">
                      {method.name}
                    </span>
                    {method.recommended && (
                      <span className="rounded-full bg-wizard-accent/10 px-2 py-0.5 text-[10px] font-medium text-wizard-accent">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-wizard-muted">
                    {method.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-all',
                    data.method === method.id
                      ? 'border-wizard-accent bg-wizard-accent'
                      : 'border-wizard-border'
                  )}
                >
                  {data.method === method.id && (
                    <svg className="h-full w-full text-white" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Method-specific forms */}
      {data.method === 'stripe_connect' && (
        <div className="rounded-lg border border-wizard-border bg-white p-6">
          <h3 className="font-medium text-wizard-text">Connect with Stripe</h3>
          <p className="mt-2 text-sm text-wizard-muted">
            Stripe Connect lets you receive payments directly to your bank account
            with instant deposit options and detailed earnings reports.
          </p>

          {data.stripeConnectStatus === 'connected' ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-wizard-success/10 p-3">
              <CheckIcon className="h-5 w-5 text-wizard-success" />
              <span className="text-sm font-medium text-wizard-success">
                Stripe account connected
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStripeConnect}
              disabled={isConnectingStripe}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#635BFF] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5851E5] disabled:opacity-50"
            >
              {isConnectingStripe ? (
                <>
                  <LoadingSpinner />
                  Connecting...
                </>
              ) : (
                <>
                  <StripeIcon />
                  Connect with Stripe
                </>
              )}
            </button>
          )}

          {errors.stripeConnect && (
            <p className="mt-2 text-sm text-red-500">{errors.stripeConnect}</p>
          )}
        </div>
      )}

      {data.method === 'bank_transfer' && (
        <div className="rounded-lg border border-wizard-border bg-white p-6">
          <h3 className="font-medium text-wizard-text">Bank Account Details</h3>
          <p className="mt-2 text-sm text-wizard-muted">
            Enter your US bank account information for direct ACH deposits.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="accountHolderName" className="text-sm font-medium text-wizard-text">
                Account Holder Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountHolderName"
                value={data.bankDetails?.accountHolderName || ''}
                onChange={(e) => handleBankDetailsChange('accountHolderName', e.target.value)}
                placeholder="John Doe"
                className="mt-1.5"
              />
              {errors.accountHolderName && (
                <p className="mt-1 text-sm text-red-500">{errors.accountHolderName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="routingNumber" className="text-sm font-medium text-wizard-text">
                  Routing Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="routingNumber"
                  value={data.bankDetails?.routingNumber || ''}
                  onChange={(e) => handleBankDetailsChange('routingNumber', e.target.value)}
                  placeholder="123456789"
                  maxLength={9}
                  className="mt-1.5"
                />
                {errors.routingNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.routingNumber}</p>
                )}
              </div>

              <div>
                <Label htmlFor="accountNumber" className="text-sm font-medium text-wizard-text">
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountNumber"
                  type="password"
                  value={data.bankDetails?.accountNumberLast4 || ''}
                  onChange={(e) => handleBankDetailsChange('accountNumberLast4', e.target.value)}
                  placeholder="Enter account number"
                  className="mt-1.5"
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.accountNumber}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="bankName" className="text-sm font-medium text-wizard-text">
                Bank Name
              </Label>
              <Input
                id="bankName"
                value={data.bankDetails?.bankName || ''}
                onChange={(e) => handleBankDetailsChange('bankName', e.target.value)}
                placeholder="Chase, Bank of America, etc."
                className="mt-1.5"
              />
            </div>
          </div>

          {errors.bankDetails && (
            <p className="mt-4 text-sm text-red-500">{errors.bankDetails}</p>
          )}
        </div>
      )}

      {data.method === 'paypal' && (
        <div className="rounded-lg border border-wizard-border bg-white p-6">
          <h3 className="font-medium text-wizard-text">PayPal Email</h3>
          <p className="mt-2 text-sm text-wizard-muted">
            Enter the email address associated with your PayPal account.
          </p>

          <div className="mt-4">
            <Label htmlFor="paypalEmail" className="text-sm font-medium text-wizard-text">
              PayPal Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paypalEmail"
              type="email"
              value={data.paypalEmail || ''}
              onChange={(e) => handlePayPalChange(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5"
            />
            {errors.paypalEmail && (
              <p className="mt-1 text-sm text-red-500">{errors.paypalEmail}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StripeIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  )
}

function BankIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  )
}

function PayPalIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#00457C">
      <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.47c-.458 0-.85.325-.932.776l-.001.005L7.076 21.337z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  )
}
