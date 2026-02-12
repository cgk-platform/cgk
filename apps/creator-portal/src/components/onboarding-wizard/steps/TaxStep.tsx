'use client'

import { useCallback, useRef, useState } from 'react'
import { Input, Label } from '@cgk/ui'
import { cn } from '@cgk/ui'
import type { TaxData } from '../../../lib/onboarding-wizard/types'

interface TaxStepProps {
  data: TaxData
  errors: Record<string, string>
  onChange: (data: TaxData) => void
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

const TAX_CLASSIFICATIONS = [
  { value: 'individual', label: 'Individual/Sole Proprietor' },
  { value: 'llc_single', label: 'Single-Member LLC' },
  { value: 'llc_c', label: 'LLC taxed as C Corporation' },
  { value: 'llc_s', label: 'LLC taxed as S Corporation' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust/Estate' },
]

/**
 * Tax Information Step
 *
 * Collect W-9 information for US creators.
 */
export function TaxStep({
  data,
  errors,
  onChange,
}: TaxStepProps): React.JSX.Element {
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleChange = useCallback(
    <K extends keyof TaxData>(field: K, value: TaxData[K]) => {
      onChange({ ...data, [field]: value })
    },
    [data, onChange]
  )

  const handleAddressChange = useCallback(
    (field: string, value: string) => {
      onChange({
        ...data,
        address: { ...data.address, [field]: value },
      })
    },
    [data, onChange]
  )

  const handleUsTaxPerson = useCallback(
    (isUs: boolean) => {
      onChange({
        ...data,
        isUsPerson: isUs,
        formType: isUs ? 'w9' : 'w8ben',
      })
    },
    [data, onChange]
  )

  // Signature drawing handlers
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL()
    onChange({
      ...data,
      signatureData,
      certificationDate: new Date().toISOString(),
    })
  }, [data, onChange])

  const clearSignature = useCallback(() => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange({
      ...data,
      signatureData: null,
      certificationDate: null,
    })
  }, [data, onChange])

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="rounded-lg bg-wizard-hover p-4">
        <div className="flex gap-3">
          <InfoIcon className="h-5 w-5 shrink-0 text-wizard-accent" />
          <div>
            <p className="text-sm font-medium text-wizard-text">
              Why we need this
            </p>
            <p className="mt-1 text-sm text-wizard-muted">
              Tax information is required by law for payouts over $600/year.
              Your data is encrypted and only used for tax reporting.
            </p>
          </div>
        </div>
      </div>

      {/* US Person question */}
      <div>
        <Label className="text-sm font-medium text-wizard-text">
          Are you a US person for tax purposes? <span className="text-red-500">*</span>
        </Label>
        <p className="mt-1 text-sm text-wizard-muted">
          US persons include citizens, permanent residents, and those with substantial presence
        </p>
        <div className="mt-3 flex gap-4">
          <button
            type="button"
            onClick={() => handleUsTaxPerson(true)}
            className={cn(
              'flex-1 rounded-lg border p-4 text-center transition-all',
              data.isUsPerson === true
                ? 'border-wizard-accent bg-wizard-accent/5 ring-2 ring-wizard-accent/20'
                : 'border-wizard-border bg-white hover:border-wizard-accent/50'
            )}
          >
            <span className="font-medium text-wizard-text">Yes, I am</span>
            <p className="mt-1 text-xs text-wizard-muted">I&apos;ll complete a W-9</p>
          </button>
          <button
            type="button"
            onClick={() => handleUsTaxPerson(false)}
            className={cn(
              'flex-1 rounded-lg border p-4 text-center transition-all',
              data.isUsPerson === false
                ? 'border-wizard-accent bg-wizard-accent/5 ring-2 ring-wizard-accent/20'
                : 'border-wizard-border bg-white hover:border-wizard-accent/50'
            )}
          >
            <span className="font-medium text-wizard-text">No, I&apos;m not</span>
            <p className="mt-1 text-xs text-wizard-muted">I&apos;ll complete a W-8BEN</p>
          </button>
        </div>
        {errors.isUsPerson && (
          <p className="mt-2 text-sm text-red-500">{errors.isUsPerson}</p>
        )}
      </div>

      {/* W-9 Form for US persons */}
      {data.isUsPerson === true && (
        <div className="space-y-6 rounded-lg border border-wizard-border bg-white p-6">
          <div className="flex items-center justify-between border-b border-wizard-border pb-4">
            <div>
              <h3 className="font-serif text-lg font-medium text-wizard-text">Form W-9</h3>
              <p className="text-sm text-wizard-muted">Request for Taxpayer ID Number</p>
            </div>
            <span className="rounded-full bg-wizard-hover px-3 py-1 text-xs font-medium text-wizard-muted">
              IRS Form
            </span>
          </div>

          {/* Legal Name */}
          <div>
            <Label htmlFor="legalName" className="text-sm font-medium text-wizard-text">
              Legal Name <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-xs text-wizard-muted">
              As shown on your income tax return
            </p>
            <Input
              id="legalName"
              value={data.legalName}
              onChange={(e) => handleChange('legalName', e.target.value)}
              placeholder="John Michael Doe"
              className="mt-2"
            />
            {errors.legalName && (
              <p className="mt-1 text-sm text-red-500">{errors.legalName}</p>
            )}
          </div>

          {/* Business Name */}
          <div>
            <Label htmlFor="businessName" className="text-sm font-medium text-wizard-text">
              Business Name
            </Label>
            <p className="mt-1 text-xs text-wizard-muted">
              If different from above (DBA, LLC name, etc.)
            </p>
            <Input
              id="businessName"
              value={data.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value || null)}
              placeholder="Optional"
              className="mt-2"
            />
          </div>

          {/* Tax Classification */}
          <div>
            <Label htmlFor="taxClassification" className="text-sm font-medium text-wizard-text">
              Tax Classification <span className="text-red-500">*</span>
            </Label>
            <select
              id="taxClassification"
              value={data.taxClassification || ''}
              onChange={(e) => handleChange('taxClassification', e.target.value || null)}
              className="mt-2 w-full rounded-lg border border-wizard-border bg-white px-4 py-2.5 text-wizard-text focus:border-wizard-accent focus:outline-none focus:ring-2 focus:ring-wizard-accent/20"
            >
              <option value="">Select classification...</option>
              {TAX_CLASSIFICATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.taxClassification && (
              <p className="mt-1 text-sm text-red-500">{errors.taxClassification}</p>
            )}
          </div>

          {/* Tax ID */}
          <div>
            <Label htmlFor="taxId" className="text-sm font-medium text-wizard-text">
              SSN or EIN (last 4 digits) <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-xs text-wizard-muted">
              For security, we only store the last 4 digits
            </p>
            <Input
              id="taxId"
              value={data.taxIdLast4 || ''}
              onChange={(e) => handleChange('taxIdLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="XXXX"
              maxLength={4}
              className="mt-2 w-24"
            />
            {errors.taxId && (
              <p className="mt-1 text-sm text-red-500">{errors.taxId}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-4 border-t border-wizard-border pt-4">
            <h4 className="font-medium text-wizard-text">Address</h4>

            <div>
              <Label htmlFor="street1" className="text-sm font-medium text-wizard-text">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="street1"
                value={data.address.street1}
                onChange={(e) => handleAddressChange('street1', e.target.value)}
                placeholder="123 Main Street"
                className="mt-1.5"
              />
              {errors.street1 && (
                <p className="mt-1 text-sm text-red-500">{errors.street1}</p>
              )}
            </div>

            <div>
              <Label htmlFor="street2" className="text-sm font-medium text-wizard-text">
                Apt, Suite, Unit
              </Label>
              <Input
                id="street2"
                value={data.address.street2}
                onChange={(e) => handleAddressChange('street2', e.target.value)}
                placeholder="Apt 4B"
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-wizard-text">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={data.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="New York"
                  className="mt-1.5"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state" className="text-sm font-medium text-wizard-text">
                  State <span className="text-red-500">*</span>
                </Label>
                <select
                  id="state"
                  value={data.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-wizard-border bg-white px-3 py-2.5 text-wizard-text focus:border-wizard-accent focus:outline-none focus:ring-2 focus:ring-wizard-accent/20"
                >
                  <option value="">Select...</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                )}
              </div>

              <div>
                <Label htmlFor="postalCode" className="text-sm font-medium text-wizard-text">
                  ZIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="postalCode"
                  value={data.address.postalCode}
                  onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                  placeholder="10001"
                  maxLength={10}
                  className="mt-1.5"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="border-t border-wizard-border pt-4">
            <Label className="text-sm font-medium text-wizard-text">
              Signature <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-xs text-wizard-muted">
              By signing, you certify that the information provided is correct
            </p>

            <div className="relative mt-3">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={120}
                className="w-full cursor-crosshair rounded-lg border border-wizard-border bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!data.signatureData && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-wizard-muted/50">Sign here</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={clearSignature}
                className="text-sm text-wizard-muted hover:text-wizard-text"
              >
                Clear signature
              </button>
              {data.certificationDate && (
                <span className="text-xs text-wizard-muted">
                  Signed on {new Date(data.certificationDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {errors.signature && (
              <p className="mt-2 text-sm text-red-500">{errors.signature}</p>
            )}
          </div>
        </div>
      )}

      {/* W-8BEN placeholder for non-US */}
      {data.isUsPerson === false && (
        <div className="rounded-lg border border-wizard-border bg-white p-6">
          <h3 className="font-serif text-lg font-medium text-wizard-text">Form W-8BEN</h3>
          <p className="mt-2 text-sm text-wizard-muted">
            International creator tax forms are coming soon. For now, please contact support
            to complete your tax documentation.
          </p>
          <a
            href="mailto:support@example.com"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-wizard-accent hover:underline"
          >
            Contact Support
            <ArrowRightIcon />
          </a>
        </div>
      )}
    </div>
  )
}

function InfoIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ArrowRightIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  )
}
