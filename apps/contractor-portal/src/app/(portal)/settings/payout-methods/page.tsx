'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from '@cgk/ui'

interface PayoutMethod {
  id: string
  type: 'stripe_connect' | 'stripe_connect_standard' | 'paypal' | 'venmo' | 'check'
  isDefault: boolean
  status: 'active' | 'pending' | 'disabled' | 'requires_action'
  stripeAccountId: string | null
  stripeAccountStatus: string | null
  stripeOnboardingComplete: boolean
  stripePayoutsEnabled: boolean
  stripeRequirementsDue: string[]
  accountCountry: string | null
  paypalEmail: string | null
  venmoHandle: string | null
  checkAddress: {
    name: string
    line1: string
    line2: string | null
    city: string
    state: string
    postalCode: string
    country: string
  } | null
  bankName: string | null
  accountLastFour: string | null
}

interface W9Status {
  required: boolean
  submitted: boolean
  submittedAt: string | null
}

function getMethodIcon(type: string): string {
  switch (type) {
    case 'stripe_connect':
    case 'stripe_connect_standard':
      return '💳'
    case 'paypal':
      return '🅿️'
    case 'venmo':
      return '✌️'
    case 'check':
      return '✉️'
    default:
      return '💰'
  }
}

function getMethodLabel(type: string): string {
  switch (type) {
    case 'stripe_connect':
    case 'stripe_connect_standard':
      return 'Bank Account (Stripe)'
    case 'paypal':
      return 'PayPal'
    case 'venmo':
      return 'Venmo'
    case 'check':
      return 'Check'
    default:
      return type
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
    case 'requires_action':
      return 'warning'
    case 'disabled':
      return 'destructive'
    default:
      return 'default'
  }
}

export default function PayoutMethodsPage() {
  return (
    <Suspense fallback={<PayoutMethodsLoading />}>
      <PayoutMethodsContent />
    </Suspense>
  )
}

function PayoutMethodsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

function PayoutMethodsContent() {
  const searchParams = useSearchParams()
  const successMessage = searchParams.get('success')
  const errorMessage = searchParams.get('error')

  const [methods, setMethods] = useState<PayoutMethod[]>([])
  const [w9Status, setW9Status] = useState<W9Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(errorMessage)
  const [success, setSuccess] = useState<string | null>(successMessage)

  // Add method form state
  const [showAddForm, setShowAddForm] = useState<'paypal' | 'venmo' | 'check' | null>(null)
  const [formData, setFormData] = useState({
    paypalEmail: '',
    venmoHandle: '',
    checkName: '',
    checkLine1: '',
    checkLine2: '',
    checkCity: '',
    checkState: '',
    checkPostalCode: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function fetchMethods() {
    try {
      const res = await fetch('/api/contractor/payments/methods')
      if (!res.ok) throw new Error('Failed to fetch methods')
      const data = await res.json()
      setMethods(data.methods)
      setW9Status(data.w9Status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout methods')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
  }, [])

  async function handleAddMethod(e: React.FormEvent) {
    e.preventDefault()
    if (!showAddForm) return

    setIsSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { type: showAddForm }

      if (showAddForm === 'paypal') {
        if (!formData.paypalEmail || !formData.paypalEmail.includes('@')) {
          throw new Error('Valid PayPal email is required')
        }
        body.paypalEmail = formData.paypalEmail
      } else if (showAddForm === 'venmo') {
        if (!formData.venmoHandle) {
          throw new Error('Venmo handle is required')
        }
        body.venmoHandle = formData.venmoHandle.replace('@', '')
      } else if (showAddForm === 'check') {
        if (!formData.checkName || !formData.checkLine1 || !formData.checkCity || !formData.checkState || !formData.checkPostalCode) {
          throw new Error('Complete address is required')
        }
        body.checkAddress = {
          name: formData.checkName,
          line1: formData.checkLine1,
          line2: formData.checkLine2 || null,
          city: formData.checkCity,
          state: formData.checkState,
          postalCode: formData.checkPostalCode,
          country: 'US',
        }
      }

      const res = await fetch('/api/contractor/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add method')
      }

      setSuccess('Payout method added successfully')
      setShowAddForm(null)
      setFormData({
        paypalEmail: '',
        venmoHandle: '',
        checkName: '',
        checkLine1: '',
        checkLine2: '',
        checkCity: '',
        checkState: '',
        checkPostalCode: '',
      })
      await fetchMethods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add method')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSetDefault(methodId: string) {
    try {
      const res = await fetch('/api/contractor/payments/methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: methodId, isDefault: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set default')
      }

      await fetchMethods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default')
    }
  }

  async function handleRemove(methodId: string) {
    if (!confirm('Are you sure you want to remove this payout method?')) return

    try {
      const res = await fetch(`/api/contractor/payments/methods?id=${methodId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove method')
      }

      await fetchMethods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove method')
    }
  }

  async function handleStartStripeOAuth() {
    try {
      const res = await fetch('/api/contractor/payments/connect/oauth', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start Stripe setup')
      }

      const data = await res.json()
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe setup')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const hasStripe = methods.some((m) => m.type === 'stripe_connect' || m.type === 'stripe_connect_standard')
  const hasPayPal = methods.some((m) => m.type === 'paypal')
  const hasVenmo = methods.some((m) => m.type === 'venmo')
  const hasCheck = methods.some((m) => m.type === 'check')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payout Methods</h1>
        <p className="text-muted-foreground">Manage how you receive payments</p>
      </div>

      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* W-9 Status */}
      {w9Status?.required && !w9Status.submitted && (
        <Alert variant="warning">
          <AlertTitle>W-9 Required</AlertTitle>
          <AlertDescription>
            Submit a W-9 form to receive payouts.{' '}
            <Link href="/settings/tax" className="font-medium underline">
              Submit W-9
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Methods */}
      {methods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Payout Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMethodIcon(method.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getMethodLabel(method.type)}</span>
                      {method.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.type === 'paypal' && method.paypalEmail}
                      {method.type === 'venmo' && `@${method.venmoHandle}`}
                      {(method.type === 'stripe_connect' || method.type === 'stripe_connect_standard') &&
                        (method.accountLastFour
                          ? `Bank account ending in ${method.accountLastFour}`
                          : 'Bank account')}
                      {method.type === 'check' && method.checkAddress && (
                        <span>
                          {method.checkAddress.line1}, {method.checkAddress.city},{' '}
                          {method.checkAddress.state}
                        </span>
                      )}
                    </p>
                    {(method.type === 'stripe_connect' || method.type === 'stripe_connect_standard') &&
                      !method.stripePayoutsEnabled &&
                      method.stripeRequirementsDue.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Action needed to enable payouts
                        </p>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(method.status)}>{method.status}</Badge>
                  {(method.type === 'stripe_connect' || method.type === 'stripe_connect_standard') &&
                    !method.stripePayoutsEnabled && (
                      <Link href="/settings/payout-methods/stripe-setup">
                        <Button variant="outline" size="sm">
                          Complete Setup
                        </Button>
                      </Link>
                    )}
                  {!method.isDefault && method.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(method.id)}
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Method Options */}
      <Card>
        <CardHeader>
          <CardTitle>Add Payout Method</CardTitle>
          <CardDescription>Choose how you want to receive payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stripe Connect - Recommended */}
          {!hasStripe && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Bank Account (Stripe)</span>
                    <Badge variant="info">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Direct deposit to your bank account. Fastest payouts.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStartStripeOAuth}>Connect with Stripe</Button>
                <Link href="/settings/payout-methods/stripe-setup">
                  <Button variant="outline">Self-Hosted Setup</Button>
                </Link>
              </div>
            </div>
          )}

          {/* PayPal */}
          {!hasPayPal && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🅿️</span>
                  <div>
                    <span className="font-medium">PayPal</span>
                    <p className="text-sm text-muted-foreground">
                      Receive payments to your PayPal account
                    </p>
                  </div>
                </div>
                {showAddForm !== 'paypal' && (
                  <Button variant="outline" onClick={() => setShowAddForm('paypal')}>
                    Add PayPal
                  </Button>
                )}
              </div>
              {showAddForm === 'paypal' && (
                <form onSubmit={handleAddMethod} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paypalEmail">PayPal Email</Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.paypalEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paypalEmail: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                      Add PayPal
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Venmo */}
          {!hasVenmo && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✌️</span>
                  <div>
                    <span className="font-medium">Venmo</span>
                    <p className="text-sm text-muted-foreground">
                      Receive payments to your Venmo account
                    </p>
                  </div>
                </div>
                {showAddForm !== 'venmo' && (
                  <Button variant="outline" onClick={() => setShowAddForm('venmo')}>
                    Add Venmo
                  </Button>
                )}
              </div>
              {showAddForm === 'venmo' && (
                <form onSubmit={handleAddMethod} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="venmoHandle">Venmo Handle</Label>
                    <Input
                      id="venmoHandle"
                      placeholder="@username"
                      value={formData.venmoHandle}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, venmoHandle: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                      Add Venmo
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Check */}
          {!hasCheck && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✉️</span>
                  <div>
                    <span className="font-medium">Check</span>
                    <p className="text-sm text-muted-foreground">
                      Receive a check by mail (slowest option)
                    </p>
                  </div>
                </div>
                {showAddForm !== 'check' && (
                  <Button variant="outline" onClick={() => setShowAddForm('check')}>
                    Add Check
                  </Button>
                )}
              </div>
              {showAddForm === 'check' && (
                <form onSubmit={handleAddMethod} className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="checkName">Full Name</Label>
                      <Input
                        id="checkName"
                        placeholder="John Doe"
                        value={formData.checkName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkName: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="checkLine1">Address Line 1</Label>
                      <Input
                        id="checkLine1"
                        placeholder="123 Main St"
                        value={formData.checkLine1}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkLine1: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="checkLine2">Address Line 2 (Optional)</Label>
                      <Input
                        id="checkLine2"
                        placeholder="Apt 4B"
                        value={formData.checkLine2}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkLine2: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkCity">City</Label>
                      <Input
                        id="checkCity"
                        placeholder="New York"
                        value={formData.checkCity}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkCity: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkState">State</Label>
                      <Input
                        id="checkState"
                        placeholder="NY"
                        maxLength={2}
                        value={formData.checkState}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkState: e.target.value.toUpperCase() }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkPostalCode">ZIP Code</Label>
                      <Input
                        id="checkPostalCode"
                        placeholder="10001"
                        value={formData.checkPostalCode}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, checkPostalCode: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                      Add Check Address
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
