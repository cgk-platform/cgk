'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  Spinner,
} from '@cgk/ui'

interface Country {
  code: string
  name: string
  defaultCurrency: string
  businessTypes: ('individual' | 'company')[]
}

interface OnboardingProgress {
  started: boolean
  currentStep: number
  stripeAccountId: string | null
  step1Data: {
    businessType: 'individual' | 'company'
    country: string
  } | null
  step2Data: unknown | null
  step3Data: unknown | null
  step4Completed: boolean
  completedAt: string | null
  stripeAccountStatus: string | null
  stripePayoutsEnabled: boolean
  stripeRequirementsDue: string[]
}

export default function StripeSetupPage() {
  const router = useRouter()
  const [countries, setCountries] = useState<Country[]>([])
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for each step
  const [step1, setStep1] = useState({
    businessType: 'individual' as 'individual' | 'company',
    country: 'US',
  })

  const [step2Individual, setStep2Individual] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
  })

  const [step2Company, setStep2Company] = useState({
    companyName: '',
    companyPhone: '',
    taxId: '',
  })

  const [step3, setStep3] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  })

  const [step4, setStep4] = useState({
    ssn: '',
    ssnLast4: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [countriesRes, progressRes] = await Promise.all([
          fetch('/api/contractor/payments/connect/countries'),
          fetch('/api/contractor/payments/connect/onboard'),
        ])

        if (!countriesRes.ok || !progressRes.ok) {
          throw new Error('Failed to load setup data')
        }

        const [countriesData, progressData] = await Promise.all([
          countriesRes.json(),
          progressRes.json(),
        ])

        setCountries(countriesData.countries)
        setProgress(progressData)

        // Pre-fill form data from progress
        if (progressData.step1Data) {
          setStep1(progressData.step1Data)
          setStep3((prev) => ({ ...prev, country: progressData.step1Data.country }))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load setup data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/contractor/payments/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step1),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start setup')
      }

      const data = await res.json()
      setProgress((prev) =>
        prev ? { ...prev, ...data.progress, started: true } : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start setup')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleStepSubmit(step: 2 | 3 | 4, data: unknown) {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/contractor/payments/connect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || `Failed to complete step ${step}`)
      }

      const responseData = await res.json()
      setProgress((prev) =>
        prev ? { ...prev, ...responseData.progress } : null
      )

      // If completed, redirect
      if (step === 4 && responseData.progress.completedAt) {
        router.push('/settings/payout-methods?success=Stripe+setup+complete')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to complete step ${step}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()

    const isIndividual = step1.businessType === 'individual'
    let data: unknown

    if (isIndividual) {
      data = {
        firstName: step2Individual.firstName,
        lastName: step2Individual.lastName,
        phone: step2Individual.phone,
        dateOfBirth: {
          day: parseInt(step2Individual.dobDay, 10),
          month: parseInt(step2Individual.dobMonth, 10),
          year: parseInt(step2Individual.dobYear, 10),
        },
      }
    } else {
      data = {
        companyName: step2Company.companyName,
        companyPhone: step2Company.companyPhone,
        taxId: step2Company.taxId,
      }
    }

    await handleStepSubmit(2, data)
  }

  async function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault()
    await handleStepSubmit(3, step3)
  }

  async function handleStep4Submit(e: React.FormEvent) {
    e.preventDefault()

    const data: { ssn?: string; ssnLast4?: string } = {}
    if (step1.country === 'US') {
      // Use full SSN if provided, otherwise last 4
      if (step4.ssn) {
        data.ssn = step4.ssn.replace(/[^0-9]/g, '')
      } else if (step4.ssnLast4) {
        data.ssnLast4 = step4.ssnLast4
      }
    }

    await handleStepSubmit(4, data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const currentStep = progress?.currentStep || 1
  const totalSteps = 4
  const progressPercent = ((currentStep - 1) / totalSteps) * 100

  // If already complete and payouts enabled, show success
  if (progress?.stripePayoutsEnabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Stripe Setup Complete</CardTitle>
            <CardDescription>Your Stripe account is ready to receive payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/settings/payout-methods')}>
              Back to Payout Methods
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stripe Setup</h1>
        <p className="text-muted-foreground">Set up your bank account for direct deposits</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs">
          <span className={currentStep >= 1 ? 'text-primary' : ''}>Business Type</span>
          <span className={currentStep >= 2 ? 'text-primary' : ''}>Personal Info</span>
          <span className={currentStep >= 3 ? 'text-primary' : ''}>Address</span>
          <span className={currentStep >= 4 ? 'text-primary' : ''}>Verification</span>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Business Type */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Type</CardTitle>
            <CardDescription>Are you an individual or a company?</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    className={`p-4 border rounded-lg text-left ${
                      step1.businessType === 'individual' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setStep1((prev) => ({ ...prev, businessType: 'individual' }))}
                  >
                    <div className="font-medium">Individual</div>
                    <div className="text-sm text-muted-foreground">Freelancer or sole proprietor</div>
                  </button>
                  <button
                    type="button"
                    className={`p-4 border rounded-lg text-left ${
                      step1.businessType === 'company' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setStep1((prev) => ({ ...prev, businessType: 'company' }))}
                  >
                    <div className="font-medium">Company</div>
                    <div className="text-sm text-muted-foreground">LLC, Corporation, etc.</div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={step1.country}
                  onChange={(e) => setStep1((prev) => ({ ...prev, country: e.target.value }))}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Personal/Company Info */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {step1.businessType === 'individual' ? 'Personal Information' : 'Company Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2Submit} className="space-y-4">
              {step1.businessType === 'individual' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={step2Individual.firstName}
                        onChange={(e) =>
                          setStep2Individual((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={step2Individual.lastName}
                        onChange={(e) =>
                          setStep2Individual((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={step2Individual.phone}
                      onChange={(e) =>
                        setStep2Individual((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="MM"
                        maxLength={2}
                        value={step2Individual.dobMonth}
                        onChange={(e) =>
                          setStep2Individual((prev) => ({ ...prev, dobMonth: e.target.value }))
                        }
                        required
                      />
                      <Input
                        placeholder="DD"
                        maxLength={2}
                        value={step2Individual.dobDay}
                        onChange={(e) =>
                          setStep2Individual((prev) => ({ ...prev, dobDay: e.target.value }))
                        }
                        required
                      />
                      <Input
                        placeholder="YYYY"
                        maxLength={4}
                        value={step2Individual.dobYear}
                        onChange={(e) =>
                          setStep2Individual((prev) => ({ ...prev, dobYear: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={step2Company.companyName}
                      onChange={(e) =>
                        setStep2Company((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      type="tel"
                      value={step2Company.companyPhone}
                      onChange={(e) =>
                        setStep2Company((prev) => ({ ...prev, companyPhone: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID (EIN)</Label>
                    <Input
                      id="taxId"
                      placeholder="XX-XXXXXXX"
                      value={step2Company.taxId}
                      onChange={(e) =>
                        setStep2Company((prev) => ({ ...prev, taxId: e.target.value }))
                      }
                      required
                    />
                  </div>
                </>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Address */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={step3.addressLine1}
                  onChange={(e) => setStep3((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input
                  id="addressLine2"
                  value={step3.addressLine2}
                  onChange={(e) => setStep3((prev) => ({ ...prev, addressLine2: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={step3.city}
                    onChange={(e) => setStep3((prev) => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    maxLength={2}
                    value={step3.state}
                    onChange={(e) =>
                      setStep3((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">ZIP Code</Label>
                <Input
                  id="postalCode"
                  value={step3.postalCode}
                  onChange={(e) => setStep3((prev) => ({ ...prev, postalCode: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Identity Verification */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Identity Verification</CardTitle>
            <CardDescription>
              This information is required by financial regulations and is securely encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep4Submit} className="space-y-4">
              {step1.country === 'US' && (
                <div className="space-y-2">
                  <Label htmlFor="ssn">Social Security Number</Label>
                  <Input
                    id="ssn"
                    type="password"
                    placeholder="XXX-XX-XXXX"
                    value={step4.ssn}
                    onChange={(e) => setStep4((prev) => ({ ...prev, ssn: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your SSN is encrypted and never stored in plain text.
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete / Requirements */}
      {currentStep === 5 && progress && !progress.stripePayoutsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Verification Required</CardTitle>
            <CardDescription>
              Stripe needs additional information to enable payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.stripeRequirementsDue.length > 0 && (
              <div>
                <p className="font-medium mb-2">Outstanding Requirements:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {progress.stripeRequirementsDue.map((req) => (
                    <li key={req}>{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Stripe may take a few minutes to verify your information. Check back later or contact support if issues persist.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await fetch('/api/contractor/payments/connect/sync', { method: 'POST' })
                  window.location.reload()
                }}
              >
                Check Status
              </Button>
              <Button onClick={() => router.push('/settings/payout-methods')}>
                Back to Payout Methods
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
