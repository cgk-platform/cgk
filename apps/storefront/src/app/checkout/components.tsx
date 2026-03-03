/**
 * Custom Checkout Components
 *
 * Multi-step checkout form with Stripe payment integration:
 * 1. Contact info (email, phone)
 * 2. Shipping address
 * 3. Shipping method
 * 4. Payment (Stripe Elements)
 * 5. Review & place order
 */

'use client'

import type { Cart } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { formatMoney } from '@/lib/cart/types'
import { StripeProvider, PaymentForm } from '@/components/checkout'

type CheckoutStep = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review'

interface CheckoutContentProps {
  cart: Cart
  tenantSlug: string
  tenantName: string
}

export function CheckoutContent({ cart, tenantSlug: _tenantSlug, tenantName }: CheckoutContentProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('contact')
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    shippingMethod: '',
    shippingMethodName: '',
    shippingPrice: 0,
  })

  // Payment state
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Create payment intent when entering payment step
  const createPaymentIntent = useCallback(async () => {
    if (clientSecret) return // Already have one

    setIsCreatingPaymentIntent(true)
    setPaymentError(null)

    try {
      const response = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          email: formData.email,
          shippingAddress: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address1: formData.address1,
            address2: formData.address2,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
          },
          shippingMethod: formData.shippingMethod ? {
            id: formData.shippingMethod,
            price: formData.shippingPrice,
          } : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create payment')
      }

      setClientSecret(data.clientSecret)
      setPaymentIntentId(data.paymentIntentId)
    } catch (err) {
      console.error('Failed to create payment intent:', err)
      setPaymentError(err instanceof Error ? err.message : 'Failed to initialize payment')
    } finally {
      setIsCreatingPaymentIntent(false)
    }
  }, [cart.id, formData, clientSecret])

  // Place order after payment is confirmed
  const handlePlaceOrder = useCallback(async () => {
    if (!paymentIntentId) {
      setPaymentError('Payment not confirmed')
      return
    }

    setIsPlacingOrder(true)
    setPaymentError(null)

    try {
      const response = await fetch('/api/checkout/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          cartId: cart.id,
          email: formData.email,
          shippingAddress: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            address1: formData.address1,
            address2: formData.address2,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
            phone: formData.phone,
          },
          shippingMethod: formData.shippingMethod ? {
            id: formData.shippingMethod,
            name: formData.shippingMethodName,
            price: formData.shippingPrice,
          } : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to place order')
      }

      // Redirect to order confirmation
      router.push(data.redirectUrl ?? `/order-confirmation/${data.orderId}`)
    } catch (err) {
      console.error('Failed to place order:', err)
      setPaymentError(err instanceof Error ? err.message : 'Failed to place order')
      setIsPlacingOrder(false)
    }
  }, [paymentIntentId, cart.id, formData, router])

  const steps = useMemo<{ key: CheckoutStep; label: string }[]>(() => [
    { key: 'contact', label: 'Contact' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'payment', label: 'Payment' },
    { key: 'review', label: 'Review' },
  ], [])

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  const goToStep = useCallback((step: CheckoutStep) => {
    setCurrentStep(step)
  }, [])

  const completeStep = useCallback((step: CheckoutStep) => {
    setCompletedSteps((prev) => new Set(prev).add(step))
    const stepIndex = steps.findIndex((s) => s.key === step)
    const nextStep = steps[stepIndex + 1]
    if (stepIndex < steps.length - 1 && nextStep) {
      setCurrentStep(nextStep.key)
    }
  }, [steps])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            {tenantName}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockIcon className="h-4 w-4" />
            Secure Checkout
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="Checkout progress">
            <ol className="flex items-center justify-center gap-2 md:gap-4">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.key)
                const isCurrent = step.key === currentStep
                const isPast = index < currentStepIndex

                return (
                  <li key={step.key} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => (isCompleted || isPast) && goToStep(step.key)}
                      disabled={!isCompleted && !isPast && !isCurrent}
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                        isCurrent && 'bg-foreground text-background',
                        isCompleted && 'text-emerald-600 hover:bg-emerald-50',
                        isPast && !isCompleted && 'text-muted-foreground hover:bg-muted',
                        !isCurrent && !isCompleted && !isPast && 'text-muted-foreground/50 cursor-not-allowed'
                      )}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <span className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                          isCurrent ? 'bg-background text-foreground' : 'bg-muted'
                        )}>
                          {index + 1}
                        </span>
                      )}
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>

                    {index < steps.length - 1 && (
                      <ChevronIcon className="mx-1 h-4 w-4 text-muted-foreground/50 md:mx-2" />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Form Section */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border bg-background p-6 md:p-8">
              {currentStep === 'contact' && (
                <ContactStep
                  formData={formData}
                  onChange={handleInputChange}
                  onComplete={() => completeStep('contact')}
                />
              )}

              {currentStep === 'shipping' && (
                <ShippingStep
                  formData={formData}
                  onChange={handleInputChange}
                  onComplete={() => completeStep('shipping')}
                  onBack={() => goToStep('contact')}
                />
              )}

              {currentStep === 'delivery' && (
                <DeliveryStep
                  formData={formData}
                  cartId={cart.id}
                  onComplete={() => completeStep('delivery')}
                  onBack={() => goToStep('shipping')}
                  setFormData={setFormData as React.Dispatch<React.SetStateAction<Record<string, string | number>>>}
                />
              )}

              {currentStep === 'payment' && (
                <PaymentStepWithStripe
                  clientSecret={clientSecret}
                  isCreating={isCreatingPaymentIntent}
                  error={paymentError}
                  onInit={createPaymentIntent}
                  onComplete={() => completeStep('payment')}
                  onBack={() => goToStep('delivery')}
                />
              )}

              {currentStep === 'review' && (
                <ReviewStep
                  cart={cart}
                  formData={formData}
                  isPlacing={isPlacingOrder}
                  error={paymentError}
                  onPlaceOrder={handlePlaceOrder}
                  onBack={() => goToStep('payment')}
                />
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-5">
            <OrderSummary cart={cart} />
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Step Components ---

interface StepProps {
  formData: Record<string, string | number>
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onComplete: () => void
  onBack?: () => void
}

function ContactStep({ formData, onChange, onComplete }: StepProps) {
  const email = typeof formData.email === 'string' ? formData.email : ''
  const isValid = email.includes('@')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Contact Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll use this to send your order confirmation
        </p>
      </div>

      <div className="space-y-4">
        <FormField label="Email" required>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            placeholder="you@example.com"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Phone (optional)">
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            placeholder="(555) 555-5555"
            className="input-field"
          />
        </FormField>
      </div>

      <button
        type="button"
        onClick={onComplete}
        disabled={!isValid}
        className="btn-primary w-full"
      >
        Continue to Shipping
      </button>
    </div>
  )
}

function ShippingStep({ formData, onChange, onComplete, onBack }: StepProps) {
  const isValid = formData.firstName && formData.lastName && formData.address1 && formData.city && formData.state && formData.zip

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Shipping Address</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Where should we send your order?
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="Last name" required>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              className="input-field"
              required
            />
          </FormField>
        </div>

        <FormField label="Address" required>
          <input
            type="text"
            name="address1"
            value={formData.address1}
            onChange={onChange}
            placeholder="123 Main St"
            className="input-field"
            required
          />
        </FormField>

        <FormField label="Apartment, suite, etc. (optional)">
          <input
            type="text"
            name="address2"
            value={formData.address2}
            onChange={onChange}
            placeholder="Apt 4B"
            className="input-field"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="City" required>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onChange}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="State" required>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={onChange}
              className="input-field"
              required
            />
          </FormField>
          <FormField label="ZIP code" required>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={onChange}
              className="input-field"
              required
            />
          </FormField>
        </div>

        <FormField label="Country" required>
          <select
            name="country"
            value={formData.country}
            onChange={onChange}
            className="input-field"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </FormField>
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!isValid}
          className="btn-primary flex-1"
        >
          Continue to Delivery
        </button>
      </div>
    </div>
  )
}

interface ShippingRate {
  id: string
  name: string
  price: number
  days: string
  description?: string
}

interface ShippingRatesResponse {
  rates: ShippingRate[]
  currency: string
  freeShippingThreshold: number | null
  qualifiesForFreeShipping: boolean
  cartSubtotal: number
  error?: string
}

interface DeliveryStepProps extends Omit<StepProps, 'onChange'> {
  cartId: string
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string | number>>>
}

function DeliveryStep({ formData, onComplete, onBack, setFormData, cartId }: DeliveryStepProps) {
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [cartSubtotal, setCartSubtotal] = useState<number>(0)

  // Fetch shipping rates when address changes
  useEffect(() => {
    async function fetchRates() {
      // Only fetch if we have the required address info
      if (!formData.zip || !formData.country) {
        setShippingRates([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/checkout/shipping-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId,
            shippingAddress: {
              address1: formData.address1,
              address2: formData.address2,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
              country: formData.country,
            },
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch shipping rates')
        }

        const data = (await response.json()) as ShippingRatesResponse
        setShippingRates(data.rates)
        setFreeShippingThreshold(data.freeShippingThreshold)
        setCartSubtotal(data.cartSubtotal)

        if (data.error) {
          // Non-fatal error, we still have rates
          console.warn('[DeliveryStep] Warning:', data.error)
        }

        // Auto-select first rate if none selected
        if (!formData.shippingMethod && data.rates.length > 0) {
          const firstRate = data.rates[0]
          if (firstRate) {
            setFormData((prev) => ({
              ...prev,
              shippingMethod: firstRate.id,
              shippingMethodName: firstRate.name,
              shippingPrice: firstRate.price,
            }))
          }
        }
      } catch (err) {
        console.error('[DeliveryStep] Error fetching shipping rates:', err)
        setError('Unable to load shipping options. Please try again.')

        // Fallback to free shipping if rates fail
        const fallbackRate: ShippingRate = {
          id: 'standard',
          name: 'Standard Shipping',
          price: 0,
          days: '5-7 business days',
          description: 'Free shipping (temporary)',
        }
        setShippingRates([fallbackRate])

        // Auto-select fallback
        if (!formData.shippingMethod) {
          setFormData((prev) => ({
            ...prev,
            shippingMethod: fallbackRate.id,
            shippingMethodName: fallbackRate.name,
            shippingPrice: fallbackRate.price,
          }))
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchRates()
  }, [formData.zip, formData.country, formData.address1, formData.address2, formData.city, formData.state, cartId, setFormData, formData.shippingMethod])

  const handleRateSelect = (rate: ShippingRate) => {
    setFormData((prev) => ({
      ...prev,
      shippingMethod: rate.id,
      shippingMethodName: rate.name,
      shippingPrice: rate.price,
    }))
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Delivery Method</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading shipping options...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <LoadingSpinner />
            <span>Calculating shipping rates for your location...</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
          <button type="button" disabled className="btn-primary flex-1 opacity-50 cursor-not-allowed">
            Continue to Payment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Delivery Method</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your preferred shipping speed
        </p>
      </div>

      {/* Free shipping threshold notice */}
      {freeShippingThreshold && !shippingRates.some((r) => r.price === 0) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>
            Add ${(freeShippingThreshold - cartSubtotal).toFixed(2)} more to qualify for free shipping!
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>{error}</p>
        </div>
      )}

      {/* Shipping rates */}
      <div className="space-y-3">
        {shippingRates.length === 0 ? (
          <div className="rounded-lg border border-muted p-6 text-center text-muted-foreground">
            <p>No shipping options available for your location.</p>
            <p className="mt-1 text-sm">Please verify your shipping address.</p>
          </div>
        ) : (
          shippingRates.map((rate) => (
            <label
              key={rate.id}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
                formData.shippingMethod === rate.id
                  ? 'border-foreground bg-foreground/5'
                  : 'hover:border-foreground/50',
                rate.price === 0 && 'border-emerald-300 bg-emerald-50'
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shippingMethod"
                  value={rate.id}
                  checked={formData.shippingMethod === rate.id}
                  onChange={() => handleRateSelect(rate)}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">{rate.name}</p>
                  <p className="text-sm text-muted-foreground">{rate.days}</p>
                  {rate.description && (
                    <p className="text-xs text-emerald-600 mt-0.5">{rate.description}</p>
                  )}
                </div>
              </div>
              <span className={cn(
                'font-medium',
                rate.price === 0 && 'text-emerald-600'
              )}>
                {rate.price === 0 ? 'FREE' : `$${rate.price.toFixed(2)}`}
              </span>
            </label>
          ))
        )}
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!formData.shippingMethod || shippingRates.length === 0}
          className="btn-primary flex-1"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

interface PaymentStepWithStripeProps {
  clientSecret: string | null
  isCreating: boolean
  error: string | null
  onInit: () => void
  onComplete: () => void
  onBack: () => void
}

function PaymentStepWithStripe({
  clientSecret,
  isCreating,
  error,
  onInit,
  onComplete,
  onBack,
}: PaymentStepWithStripeProps) {
  // Initialize payment intent when component mounts
  useEffect(() => {
    if (!clientSecret && !isCreating && !error) {
      onInit()
    }
  }, [clientSecret, isCreating, error, onInit])

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All transactions are secure and encrypted
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <LoadingSpinner />
            <span>Preparing secure payment...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !clientSecret) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All transactions are secure and encrypted
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={onInit}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return null
  }

  return (
    <StripeProvider clientSecret={clientSecret}>
      <PaymentForm onSuccess={onComplete} onBack={onBack} />
    </StripeProvider>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin', className)}
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

interface ReviewStepProps {
  cart: Cart
  formData: Record<string, string | number>
  isPlacing: boolean
  error: string | null
  onPlaceOrder: () => void
  onBack: () => void
}

function ReviewStep({ cart, formData, isPlacing, error, onPlaceOrder, onBack }: ReviewStepProps) {
  const shippingPrice = typeof formData.shippingPrice === 'number' ? formData.shippingPrice : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review Your Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please review your order before placing it
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Contact</h3>
          <p className="text-sm text-muted-foreground">{formData.email}</p>
          {formData.phone && <p className="text-sm text-muted-foreground">{formData.phone}</p>}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Ship to</h3>
          <p className="text-sm text-muted-foreground">
            {formData.firstName} {formData.lastName}<br />
            {formData.address1}<br />
            {formData.address2 && <>{formData.address2}<br /></>}
            {formData.city}, {formData.state} {formData.zip}
          </p>
        </div>

        {formData.shippingMethodName && (
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">Shipping Method</h3>
            <p className="text-sm text-muted-foreground">
              {formData.shippingMethodName} - ${shippingPrice.toFixed(2)}
            </p>
          </div>
        )}

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Items ({cart.totalQuantity})</h3>
          <div className="space-y-2">
            {cart.lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {line.merchandise.title} x {line.quantity}
                </span>
                <span>{formatMoney(line.cost.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">Payment</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCardIcon className="h-4 w-4" />
            <span>Card ending in ****</span>
            <CheckIcon className="ml-auto h-4 w-4 text-emerald-500" />
            <span className="text-emerald-600">Authorized</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isPlacing}
          className="btn-secondary flex-1"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={isPlacing}
          className="btn-primary flex-1"
        >
          {isPlacing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner className="h-4 w-4" />
              Placing Order...
            </span>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </div>
  )
}

// --- Order Summary Sidebar ---

function OrderSummary({ cart }: { cart: Cart }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="sticky top-24 rounded-xl border bg-background p-6">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between lg:hidden"
      >
        <span className="font-medium">Order Summary ({cart.totalQuantity})</span>
        <ChevronDownIcon className={cn('h-5 w-5 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {/* Items */}
      <div className={cn('mt-4 space-y-4', !isExpanded && 'hidden lg:block')}>
        {cart.lines.map((line) => (
          <div key={line.id} className="flex gap-3">
            <div className="relative h-16 w-16 flex-shrink-0 rounded-lg bg-muted">
              {line.merchandise.image && (
                <Image
                  src={line.merchandise.image.url}
                  alt={line.merchandise.title}
                  fill
                  sizes="64px"
                  className="rounded-lg object-cover"
                />
              )}
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
                {line.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{line.merchandise.title}</p>
              <p className="text-xs text-muted-foreground">
                {line.merchandise.selectedOptions.map((o) => o.value).join(' / ')}
              </p>
            </div>
            <span className="text-sm font-medium">{formatMoney(line.cost.totalAmount)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className={cn('mt-6 space-y-2 border-t pt-4', !isExpanded && 'hidden lg:block')}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(cart.cost.subtotalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-muted-foreground italic">Calculated at next step</span>
        </div>
      </div>

      <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
        <span>Total</span>
        <span className="text-lg">{formatMoney(cart.cost.totalAmount)}</span>
      </div>
    </div>
  )
}

// --- Form Components ---

interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ label, required, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  )
}

// --- Icons ---

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}
