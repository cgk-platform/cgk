'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useEffect, useState, type ReactNode } from 'react'

interface StripeProviderProps {
  children: ReactNode
  clientSecret?: string
}

// Cache stripe promise to avoid reloading
let stripePromise: Promise<Stripe | null> | null = null

async function getStripePromise(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise

  try {
    const response = await fetch('/api/checkout/stripe-config')
    if (!response.ok) return null

    const { publishableKey } = await response.json()
    if (!publishableKey) return null

    stripePromise = loadStripe(publishableKey)
    return stripePromise
  } catch {
    return null
  }
}

/**
 * StripeProvider wraps children with Stripe Elements context.
 * If a clientSecret is provided, Elements will be configured for PaymentIntent confirmation.
 */
export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    getStripePromise()
      .then((stripeInstance) => {
        if (mounted) {
          if (stripeInstance) {
            setStripe(stripeInstance)
          } else {
            setError('Failed to load payment provider')
          }
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Failed to initialize payment')
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <LoadingSpinner />
          <span>Loading payment...</span>
        </div>
      </div>
    )
  }

  if (error || !stripe) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">
          {error ?? 'Payment provider unavailable'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#0f172a',
            colorBackground: '#ffffff',
            colorText: '#0f172a',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
        },
      }
    : undefined

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export default StripeProvider
