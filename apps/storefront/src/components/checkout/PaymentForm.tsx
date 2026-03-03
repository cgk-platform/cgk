'use client'

import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useState } from 'react'

interface PaymentFormProps {
  onSuccess: () => void
  onBack: () => void
}

/**
 * PaymentForm renders the Stripe Payment Element and handles payment confirmation.
 * Must be rendered within a StripeProvider with a clientSecret.
 */
export function PaymentForm({ onSuccess, onBack }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Payment system not ready. Please wait...')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Submit the payment element first
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message ?? 'An error occurred')
        setIsProcessing(false)
        return
      }

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/processing`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
          setError(confirmError.message ?? 'Payment failed')
        } else {
          setError('An unexpected error occurred')
        }
        setIsProcessing(false)
        return
      }

      // Payment succeeded without redirect
      onSuccess()
    } catch (err) {
      console.error('Payment error:', err)
      setError('An error occurred while processing your payment')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Payment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All transactions are secure and encrypted
        </p>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Payment method icons */}
      <div className="flex items-center justify-center gap-4">
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Visa</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Mastercard</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Amex</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Apple Pay</div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="btn-secondary flex-1"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="btn-primary flex-1"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Processing...
            </span>
          ) : (
            'Review Order'
          )}
        </button>
      </div>
    </form>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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

export default PaymentForm
