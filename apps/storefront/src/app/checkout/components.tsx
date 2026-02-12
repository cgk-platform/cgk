/**
 * Custom Checkout Components
 *
 * Multi-step checkout form scaffold:
 * 1. Contact info (email, phone)
 * 2. Shipping address
 * 3. Shipping method
 * 4. Payment (Stripe Elements placeholder)
 * 5. Review & place order
 */

'use client'

import type { Cart } from '@cgk/commerce'
import { cn } from '@cgk/ui'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback } from 'react'

import { formatMoney } from '@/lib/cart/types'

type CheckoutStep = 'contact' | 'shipping' | 'delivery' | 'payment' | 'review'

interface CheckoutContentProps {
  cart: Cart
  tenantSlug: string
  tenantName: string
}

export function CheckoutContent({ cart, tenantSlug: _tenantSlug, tenantName }: CheckoutContentProps) {
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
  })

  const steps: { key: CheckoutStep; label: string }[] = [
    { key: 'contact', label: 'Contact' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'payment', label: 'Payment' },
    { key: 'review', label: 'Review' },
  ]

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
                  onChange={handleInputChange}
                  onComplete={() => completeStep('delivery')}
                  onBack={() => goToStep('shipping')}
                />
              )}

              {currentStep === 'payment' && (
                <PaymentStep
                  onComplete={() => completeStep('payment')}
                  onBack={() => goToStep('delivery')}
                />
              )}

              {currentStep === 'review' && (
                <ReviewStep
                  cart={cart}
                  formData={formData}
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
  formData: Record<string, string>
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onComplete: () => void
  onBack?: () => void
}

function ContactStep({ formData, onChange, onComplete }: StepProps) {
  const isValid = formData.email?.includes('@') ?? false

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

function DeliveryStep({ formData, onChange, onComplete, onBack }: StepProps) {
  // Placeholder shipping rates
  const shippingRates = [
    { id: 'standard', name: 'Standard Shipping', price: '5.99', days: '5-7 business days' },
    { id: 'express', name: 'Express Shipping', price: '14.99', days: '2-3 business days' },
    { id: 'overnight', name: 'Overnight Shipping', price: '29.99', days: '1 business day' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Delivery Method</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your preferred shipping speed
        </p>
      </div>

      <div className="space-y-3">
        {shippingRates.map((rate) => (
          <label
            key={rate.id}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
              formData.shippingMethod === rate.id
                ? 'border-foreground bg-foreground/5'
                : 'hover:border-foreground/50'
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                value={rate.id}
                checked={formData.shippingMethod === rate.id}
                onChange={onChange}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium">{rate.name}</p>
                <p className="text-sm text-muted-foreground">{rate.days}</p>
              </div>
            </div>
            <span className="font-medium">${rate.price}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!formData.shippingMethod}
          className="btn-primary flex-1"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

interface PaymentStepProps {
  onComplete: () => void
  onBack: () => void
}

function PaymentStep({ onComplete, onBack }: PaymentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Payment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All transactions are secure and encrypted
        </p>
      </div>

      {/* Stripe Elements Placeholder */}
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
        <CreditCardIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 font-medium text-muted-foreground">
          Stripe Payment Element
        </p>
        <p className="mt-1 text-sm text-muted-foreground/75">
          This will be replaced with the actual Stripe Elements integration
        </p>
      </div>

      {/* Payment method icons */}
      <div className="flex items-center justify-center gap-4">
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Visa</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Mastercard</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Amex</div>
        <div className="rounded border px-3 py-1 text-xs text-muted-foreground">Apple Pay</div>
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button type="button" onClick={onComplete} className="btn-primary flex-1">
          Review Order
        </button>
      </div>
    </div>
  )
}

interface ReviewStepProps {
  cart: Cart
  formData: Record<string, string>
  onBack: () => void
}

function ReviewStep({ cart, formData, onBack }: ReviewStepProps) {
  const handlePlaceOrder = () => {
    // This will be implemented with actual order creation
    alert('Order placement will be implemented with Stripe integration')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review Your Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please review your order before placing it
        </p>
      </div>

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
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button type="button" onClick={handlePlaceOrder} className="btn-primary flex-1">
          Place Order
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
