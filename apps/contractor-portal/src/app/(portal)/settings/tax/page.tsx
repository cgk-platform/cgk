'use client'

import { useEffect, useState } from 'react'

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
  Checkbox,
  Input,
  Label,
  Spinner,
} from '@cgk-platform/ui'

interface W9Info {
  taxIdType: 'ssn' | 'ein'
  taxIdLast4: string
  legalName: string
  businessName: string | null
  entityType: string
  address: {
    name: string
    line1: string
    line2: string | null
    city: string
    state: string
    postalCode: string
    country: string
  }
  signedAt: string
}

interface TaxForm {
  id: string
  formType: '1099-nec' | '1099-misc'
  taxYear: number
  totalAmountCents: number
  status: 'draft' | 'generated' | 'filed' | 'corrected'
  fileUrl: string | null
  generatedAt: string | null
  filedAt: string | null
}

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual/Sole Proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
] as const

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export default function TaxSettingsPage() {
  const [taxInfo, setTaxInfo] = useState<W9Info | null>(null)
  const [taxForms, setTaxForms] = useState<TaxForm[]>([])
  const [isRequired, setIsRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    taxIdType: 'ssn' as 'ssn' | 'ein',
    taxId: '',
    legalName: '',
    businessName: '',
    entityType: 'individual' as (typeof ENTITY_TYPES)[number]['value'],
    addressName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    certify: false,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [infoRes, formsRes] = await Promise.all([
          fetch('/api/contractor/tax/info'),
          fetch('/api/contractor/tax/forms'),
        ])

        if (!infoRes.ok || !formsRes.ok) {
          throw new Error('Failed to load tax data')
        }

        const [infoData, formsData] = await Promise.all([infoRes.json(), formsRes.json()])

        setTaxInfo(infoData.info)
        setIsRequired(infoData.required)
        setTaxForms(formsData.forms)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tax data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function handleSubmitW9(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.certify) {
      setError('You must certify the information is correct')
      return
    }

    // Validate tax ID
    const taxIdClean = formData.taxId.replace(/[^0-9]/g, '')
    if (taxIdClean.length !== 9) {
      setError(`${formData.taxIdType === 'ssn' ? 'SSN' : 'EIN'} must be 9 digits`)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contractor/tax/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxIdType: formData.taxIdType,
          taxId: formData.taxId,
          legalName: formData.legalName,
          businessName: formData.businessName || undefined,
          entityType: formData.entityType,
          address: {
            name: formData.addressName || formData.legalName,
            line1: formData.addressLine1,
            line2: formData.addressLine2 || null,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: 'US',
          },
          signature: formData.legalName, // Using typed name as signature
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit W-9')
      }

      const data = await res.json()
      setTaxInfo(data.info)
      setShowForm(false)
      setSuccess('W-9 submitted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit W-9')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Information</h1>
        <p className="text-muted-foreground">Manage your W-9 and tax forms</p>
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
      <Card>
        <CardHeader>
          <CardTitle>W-9 Tax Form</CardTitle>
          <CardDescription>
            Required for US contractors to receive payouts over $600/year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taxInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">Submitted</Badge>
                <span className="text-sm text-muted-foreground">
                  on {new Date(taxInfo.signedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Legal Name</p>
                  <p className="text-sm text-muted-foreground">{taxInfo.legalName}</p>
                </div>
                {taxInfo.businessName && (
                  <div>
                    <p className="text-sm font-medium">Business Name</p>
                    <p className="text-sm text-muted-foreground">{taxInfo.businessName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Entity Type</p>
                  <p className="text-sm text-muted-foreground">
                    {ENTITY_TYPES.find((t) => t.value === taxInfo.entityType)?.label ||
                      taxInfo.entityType}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">
                    {taxInfo.taxIdType === 'ssn' ? 'SSN' : 'EIN'}: ***-**-{taxInfo.taxIdLast4}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {taxInfo.address.line1}
                    {taxInfo.address.line2 && `, ${taxInfo.address.line2}`}
                    <br />
                    {taxInfo.address.city}, {taxInfo.address.state} {taxInfo.address.postalCode}
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={() => setShowForm(true)}>
                Update W-9
              </Button>
            </div>
          ) : isRequired ? (
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertTitle>W-9 Required</AlertTitle>
                <AlertDescription>
                  You must submit a W-9 form before you can receive payouts.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setShowForm(true)}>Submit W-9</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No W-9 on file. A W-9 may be required if you receive over $600 in a calendar year.
              </p>

              <Button variant="outline" onClick={() => setShowForm(true)}>
                Submit W-9 Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* W-9 Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>W-9 Form</CardTitle>
            <CardDescription>
              Substitute Form W-9 - Request for Taxpayer Identification Number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitW9} className="space-y-6">
              {/* Tax ID Type */}
              <div className="space-y-2">
                <Label>Tax ID Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxIdType"
                      value="ssn"
                      checked={formData.taxIdType === 'ssn'}
                      onChange={() => setFormData((prev) => ({ ...prev, taxIdType: 'ssn' }))}
                    />
                    <span>SSN (Social Security Number)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxIdType"
                      value="ein"
                      checked={formData.taxIdType === 'ein'}
                      onChange={() => setFormData((prev) => ({ ...prev, taxIdType: 'ein' }))}
                    />
                    <span>EIN (Employer Identification Number)</span>
                  </label>
                </div>
              </div>

              {/* Tax ID */}
              <div className="space-y-2">
                <Label htmlFor="taxId">{formData.taxIdType === 'ssn' ? 'SSN' : 'EIN'}</Label>
                <Input
                  id="taxId"
                  type="password"
                  placeholder={formData.taxIdType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                  value={formData.taxId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your tax ID is encrypted and securely stored.
                </p>
              </div>

              {/* Legal Name */}
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  placeholder="As shown on your tax return"
                  value={formData.legalName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, legalName: e.target.value }))}
                  required
                />
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (Optional)</Label>
                <Input
                  id="businessName"
                  placeholder="If different from legal name"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, businessName: e.target.value }))
                  }
                />
              </div>

              {/* Entity Type */}
              <div className="space-y-2">
                <Label htmlFor="entityType">Federal Tax Classification</Label>
                <select
                  id="entityType"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={formData.entityType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      entityType: e.target.value as typeof formData.entityType,
                    }))
                  }
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <Label>Address</Label>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Street Address</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Certification */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="certify"
                    checked={formData.certify}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, certify: checked === true }))
                    }
                  />
                  <label htmlFor="certify" className="text-sm">
                    Under penalties of perjury, I certify that:
                    <ol className="list-decimal pl-4 mt-2 space-y-1 text-muted-foreground">
                      <li>
                        The number shown on this form is my correct taxpayer identification number
                      </li>
                      <li>
                        I am not subject to backup withholding because: (a) I am exempt from
                        backup withholding, or (b) I have not been notified by the IRS that I am
                        subject to backup withholding
                      </li>
                      <li>I am a U.S. citizen or other U.S. person</li>
                    </ol>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.certify}>
                  {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                  Submit W-9
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tax Forms (1099s) */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Forms</CardTitle>
          <CardDescription>Download your 1099-NEC forms for tax filing</CardDescription>
        </CardHeader>
        <CardContent>
          {taxForms.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tax forms available yet. Forms are generated annually for contractors who earned
              $600 or more.
            </p>
          ) : (
            <div className="space-y-4">
              {taxForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {form.formType.toUpperCase()} - {form.taxYear}
                      </span>
                      <Badge
                        variant={
                          form.status === 'filed'
                            ? 'success'
                            : form.status === 'generated'
                              ? 'info'
                              : 'default'
                        }
                      >
                        {form.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total earnings: {formatCents(form.totalAmountCents)}
                    </p>
                    {form.filedAt && (
                      <p className="text-xs text-muted-foreground">
                        Filed on {new Date(form.filedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {form.fileUrl ? (
                    <a
                      href={form.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button variant="outline" size="sm">
                        Download PDF
                      </Button>
                    </a>
                  ) : (
                    <Badge variant="warning">Not yet available</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
