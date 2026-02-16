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

// Tax ID validation functions
const validateSSN = (ssn: string): string | null => {
  // Remove dashes and spaces for validation
  const clean = ssn.replace(/[-\s]/g, '')

  if (!clean) return 'SSN is required'
  if (!/^\d+$/.test(clean)) return 'SSN must contain only numbers'
  if (clean.length !== 9) return 'SSN must be 9 digits'

  // Check for invalid SSN patterns (IRS rules)
  // Cannot start with 9 (reserved for ITINs)
  if (clean.startsWith('9')) return 'Invalid SSN (cannot start with 9)'
  // Cannot be all zeros in any section
  if (clean.substring(0, 3) === '000') return 'Invalid SSN (area number cannot be 000)'
  if (clean.substring(3, 5) === '00') return 'Invalid SSN (group number cannot be 00)'
  if (clean.substring(5, 9) === '0000') return 'Invalid SSN (serial number cannot be 0000)'
  // Check for known invalid SSNs
  if (clean === '078051120' || clean === '219099999') {
    return 'This SSN is known to be invalid'
  }

  return null
}

const validateEIN = (ein: string): string | null => {
  // Remove dashes and spaces for validation
  const clean = ein.replace(/[-\s]/g, '')

  if (!clean) return 'EIN is required'
  if (!/^\d+$/.test(clean)) return 'EIN must contain only numbers'
  if (clean.length !== 9) return 'EIN must be 9 digits'

  // First two digits must be valid EIN prefix (IRS assigned)
  const validPrefixes = [
    '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15',
    '16', '20', '21', '22', '23', '24', '25', '26', '27', '30', '32', '33',
    '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
    '46', '47', '48', '50', '51', '52', '53', '54', '55', '56', '57', '58',
    '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '71', '72',
    '73', '74', '75', '76', '77', '80', '81', '82', '83', '84', '85', '86',
    '87', '88', '90', '91', '92', '93', '94', '95', '98', '99'
  ]
  const prefix = clean.substring(0, 2)
  if (!validPrefixes.includes(prefix)) {
    return 'Invalid EIN prefix'
  }

  return null
}

// Format helpers for display
const formatSSNInput = (value: string): string => {
  const clean = value.replace(/[^\d]/g, '').slice(0, 9)
  if (clean.length <= 3) return clean
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`
}

const formatEINInput = (value: string): string => {
  const clean = value.replace(/[^\d]/g, '').slice(0, 9)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}-${clean.slice(2)}`
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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
    setFieldErrors({})

    const errors: Record<string, string> = {}

    if (!formData.certify) {
      setError('You must certify the information is correct')
      return
    }

    // Validate tax ID with proper format checking
    const taxIdError = formData.taxIdType === 'ssn'
      ? validateSSN(formData.taxId)
      : validateEIN(formData.taxId)

    if (taxIdError) {
      errors.taxId = taxIdError
    }

    // Validate other required fields
    if (!formData.legalName.trim()) {
      errors.legalName = 'Legal name is required'
    }

    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Street address is required'
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required'
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required'
    } else if (!/^[A-Z]{2}$/.test(formData.state.toUpperCase())) {
      errors.state = 'Use 2-letter state code (e.g., NY)'
    }

    if (!formData.postalCode.trim()) {
      errors.postalCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.postalCode)) {
      errors.postalCode = 'Invalid ZIP code format'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
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
                  onChange={(e) => {
                    // Format the input based on type
                    const formatted = formData.taxIdType === 'ssn'
                      ? formatSSNInput(e.target.value)
                      : formatEINInput(e.target.value)
                    setFormData((prev) => ({ ...prev, taxId: formatted }))
                    if (fieldErrors.taxId) {
                      setFieldErrors((prev) => ({ ...prev, taxId: '' }))
                    }
                  }}
                  className={fieldErrors.taxId ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.taxId ? (
                  <p className="text-sm text-destructive">{fieldErrors.taxId}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formData.taxIdType === 'ssn'
                      ? 'Format: XXX-XX-XXXX. Your SSN is encrypted and securely stored.'
                      : 'Format: XX-XXXXXXX. Your EIN is encrypted and securely stored.'}
                  </p>
                )}
              </div>

              {/* Legal Name */}
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  placeholder="As shown on your tax return"
                  value={formData.legalName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, legalName: e.target.value }))
                    if (fieldErrors.legalName) {
                      setFieldErrors((prev) => ({ ...prev, legalName: '' }))
                    }
                  }}
                  className={fieldErrors.legalName ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.legalName && (
                  <p className="text-sm text-destructive">{fieldErrors.legalName}</p>
                )}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))
                      if (fieldErrors.addressLine1) {
                        setFieldErrors((prev) => ({ ...prev, addressLine1: '' }))
                      }
                    }}
                    className={fieldErrors.addressLine1 ? 'border-destructive' : ''}
                    required
                  />
                  {fieldErrors.addressLine1 && (
                    <p className="text-sm text-destructive">{fieldErrors.addressLine1}</p>
                  )}
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
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                        if (fieldErrors.city) {
                          setFieldErrors((prev) => ({ ...prev, city: '' }))
                        }
                      }}
                      className={fieldErrors.city ? 'border-destructive' : ''}
                      required
                    />
                    {fieldErrors.city && (
                      <p className="text-sm text-destructive">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      maxLength={2}
                      placeholder="NY"
                      value={formData.state}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                        if (fieldErrors.state) {
                          setFieldErrors((prev) => ({ ...prev, state: '' }))
                        }
                      }}
                      className={fieldErrors.state ? 'border-destructive' : ''}
                      required
                    />
                    {fieldErrors.state && (
                      <p className="text-sm text-destructive">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP Code</Label>
                    <Input
                      id="postalCode"
                      placeholder="10001"
                      value={formData.postalCode}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                        if (fieldErrors.postalCode) {
                          setFieldErrors((prev) => ({ ...prev, postalCode: '' }))
                        }
                      }}
                      className={fieldErrors.postalCode ? 'border-destructive' : ''}
                      required
                    />
                    {fieldErrors.postalCode && (
                      <p className="text-sm text-destructive">{fieldErrors.postalCode}</p>
                    )}
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
