'use client'

import { useState, useEffect, useCallback } from 'react'

// Types for tax data
interface W9Status {
  hasW9: boolean
  status: 'not_submitted' | 'approved' | 'expired'
  tinLastFour: string | null
  certifiedAt: string | null
  certifiedName: string | null
  eDeliveryConsent: boolean
}

interface TaxDocument {
  id: string
  year: number
  formType: string
  totalAmountCents: number
  status: string
  filedAt: string | null
  deliveredAt: string | null
}

interface TaxData {
  w9: W9Status
  documents: TaxDocument[]
  currentYearEarnings: number | null
  threshold: number
}

// Creator Tax Documents Page
// Shows W-9 form submission and 1099 document viewing/download

export default function CreatorTaxPage() {
  const [taxData, setTaxData] = useState<TaxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTaxData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/creator/tax')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch tax data')
      }
      const data = await response.json()
      setTaxData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tax data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTaxData()
  }, [fetchTaxData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your tax information and download tax documents
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your tax information and download tax documents
          </p>
        </div>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchTaxData}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Documents</h1>
        <p className="text-sm text-muted-foreground">
          Manage your tax information and download tax documents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <W9Section w9Status={taxData?.w9 || null} onUpdate={fetchTaxData} />
        <TaxDocumentsSection documents={taxData?.documents || []} />
      </div>
    </div>
  )
}

function W9Section({ w9Status, onUpdate }: { w9Status: W9Status | null; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false)

  const handleFormSuccess = () => {
    setShowForm(false)
    onUpdate()
  }

  if (w9Status?.hasW9 && !showForm) {
    const statusLabel = w9Status.status === 'approved'
      ? 'Approved'
      : w9Status.status === 'expired'
        ? 'Expired - Please Update'
        : 'Pending Review'

    const isExpired = w9Status.status === 'expired'

    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">W-9 Information</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isExpired ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <svg
                className={`h-5 w-5 ${isExpired ? 'text-yellow-600' : 'text-green-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isExpired ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M5 13l4 4L19 7"}
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">W-9 On File</div>
              <div className={`text-sm ${isExpired ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                Status: {statusLabel}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <dl className="space-y-2 text-sm">
              {w9Status.tinLastFour && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">TIN (Last 4)</dt>
                  <dd className="font-mono">***-**-{w9Status.tinLastFour}</dd>
                </div>
              )}
              {w9Status.certifiedName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Certified Name</dt>
                  <dd>{w9Status.certifiedName}</dd>
                </div>
              )}
              {w9Status.certifiedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Certified Date</dt>
                  <dd>{new Date(w9Status.certifiedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            {isExpired ? 'Update W-9 (Required)' : 'Update W-9 Information'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">W-9 Tax Form</h2>
      <W9Form
        onCancel={w9Status?.hasW9 ? () => setShowForm(false) : undefined}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

function W9Form({ onCancel, onSuccess }: { onCancel?: () => void; onSuccess?: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    legalName: '',
    businessName: '',
    taxClassification: 'individual',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    tin: '',
    tinType: 'ssn' as 'ssn' | 'ein',
    certificationName: '',
    eDeliveryConsent: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/creator/tax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit W-9')
      }

      // Success
      onSuccess?.()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit W-9')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please provide your tax information. This is required for 1099 reporting
        if you earn $600 or more in a calendar year.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Legal Name (as shown on tax return)</label>
        <input
          type="text"
          required
          value={formData.legalName}
          onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="John Doe"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Business Name (optional)</label>
        <input
          type="text"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Your Business LLC"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tax Classification</label>
        <select
          value={formData.taxClassification}
          onChange={(e) => setFormData({ ...formData, taxClassification: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="individual">Individual/Sole Proprietor</option>
          <option value="llc_single_member">LLC (Single Member)</option>
          <option value="llc_partnership">LLC (Partnership)</option>
          <option value="llc_c_corp">LLC (C Corporation)</option>
          <option value="llc_s_corp">LLC (S Corporation)</option>
          <option value="c_corporation">C Corporation</option>
          <option value="s_corporation">S Corporation</option>
          <option value="partnership">Partnership</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <input
          type="text"
          required
          value={formData.addressLine1}
          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Street address"
        />
        <input
          type="text"
          value={formData.addressLine2}
          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Apt, suite, unit (optional)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">State</label>
          <input
            type="text"
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">ZIP Code</label>
          <input
            type="text"
            required
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tax Identification Number</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tinType"
              value="ssn"
              checked={formData.tinType === 'ssn'}
              onChange={() => setFormData({ ...formData, tinType: 'ssn' })}
            />
            <span className="text-sm">SSN</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tinType"
              value="ein"
              checked={formData.tinType === 'ein'}
              onChange={() => setFormData({ ...formData, tinType: 'ein' })}
            />
            <span className="text-sm">EIN</span>
          </label>
        </div>
        <input
          type="text"
          required
          value={formData.tin}
          onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono"
          placeholder={formData.tinType === 'ssn' ? '123-45-6789' : '12-3456789'}
        />
        <p className="text-xs text-muted-foreground">
          Your {formData.tinType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'}.
          This is encrypted and stored securely.
        </p>
      </div>

      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="mb-2 font-medium">Certification</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Under penalties of perjury, I certify that:
        </p>
        <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>The number shown on this form is my correct taxpayer identification number</li>
          <li>I am not subject to backup withholding</li>
          <li>I am a U.S. citizen or other U.S. person</li>
        </ol>
        <div className="space-y-2">
          <label className="text-sm font-medium">Signature (type your full legal name)</label>
          <input
            type="text"
            required
            value={formData.certificationName}
            onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Your full legal name"
          />
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="eDeliveryConsent"
          checked={formData.eDeliveryConsent}
          onChange={(e) => setFormData({ ...formData, eDeliveryConsent: e.target.checked })}
          className="mt-1 rounded"
        />
        <label htmlFor="eDeliveryConsent" className="text-sm text-muted-foreground">
          I consent to receive my 1099 tax forms electronically. I understand that
          I can withdraw this consent at any time and request paper copies.
        </label>
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit W-9'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function TaxDocumentsSection({ documents }: { documents: TaxDocument[] }) {
  // Filter to only show filed/delivered documents
  const availableDocuments = documents.filter(
    (doc) => doc.status === 'filed' || doc.status === 'approved'
  )

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Tax Documents</h2>

      {availableDocuments.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No tax documents available yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            1099 forms will appear here after the end of each tax year
            if your earnings exceed $600.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-md border p-4"
            >
              <div>
                <div className="font-medium">
                  {doc.formType} ({doc.year})
                </div>
                <div className="text-sm text-muted-foreground">
                  Amount: ${(doc.totalAmountCents / 100).toFixed(2)}
                </div>
                {doc.filedAt && (
                  <div className="text-xs text-muted-foreground">
                    Filed: {new Date(doc.filedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="rounded-md border px-3 py-1 text-sm hover:bg-muted">
                  View
                </button>
                <button className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90">
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-md bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> 1099 forms are issued by January 31st for the
          previous tax year. You will receive an email notification when your
          documents are ready.
        </p>
      </div>
    </div>
  )
}
