'use client'

import { useState } from 'react'

// Creator Tax Documents Page
// Shows W-9 form submission and 1099 document viewing/download

export default function CreatorTaxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Documents</h1>
        <p className="text-sm text-muted-foreground">
          Manage your tax information and download tax documents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <W9Section />
        <TaxDocumentsSection />
      </div>
    </div>
  )
}

function W9Section() {
  const [showForm, setShowForm] = useState(false)

  // Mock W9 status - would come from API
  const w9Status = {
    hasW9: true,
    status: 'approved' as const,
    tinLastFour: '1234',
    certifiedAt: '2024-06-15',
    certifiedName: 'John Creator',
  }

  if (w9Status.hasW9 && !showForm) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">W-9 Information</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium">W-9 On File</div>
              <div className="text-sm text-muted-foreground">
                Status: {w9Status.status === 'approved' ? 'Approved' : 'Pending Review'}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">TIN (Last 4)</dt>
                <dd className="font-mono">***-**-{w9Status.tinLastFour}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Certified Name</dt>
                <dd>{w9Status.certifiedName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Certified Date</dt>
                <dd>{new Date(w9Status.certifiedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Update W-9 Information
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">W-9 Tax Form</h2>
      <W9Form onCancel={w9Status.hasW9 ? () => setShowForm(false) : undefined} />
    </div>
  )
}

function W9Form({ onCancel }: { onCancel?: () => void }) {
  const [submitting, setSubmitting] = useState(false)
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

    try {
      // Would call API to submit W-9
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert('W-9 submitted successfully!')
      onCancel?.()
    } catch {
      alert('Failed to submit W-9')
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

function TaxDocumentsSection() {
  const currentYear = new Date().getFullYear()

  // Mock documents - would come from API
  const documents = [
    {
      id: '1',
      year: currentYear - 1,
      type: '1099-NEC',
      amount: 125000,
      status: 'available',
      filedAt: '2024-01-28',
    },
    {
      id: '2',
      year: currentYear - 2,
      type: '1099-NEC',
      amount: 85000,
      status: 'available',
      filedAt: '2023-01-30',
    },
  ]

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Tax Documents</h2>

      {documents.length === 0 ? (
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
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-md border p-4"
            >
              <div>
                <div className="font-medium">
                  {doc.type} ({doc.year})
                </div>
                <div className="text-sm text-muted-foreground">
                  Amount: ${(doc.amount / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Filed: {new Date(doc.filedAt).toLocaleDateString()}
                </div>
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
