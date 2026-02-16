'use client'

import { useState } from 'react'
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
  Spinner,
  Textarea,
} from '@cgk-platform/ui'

const WORK_TYPES = [
  { value: 'contract_work', label: 'Contract Work' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'project_delivery', label: 'Project Delivery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
] as const

interface UploadedAttachment {
  id: string
  filename: string
  url: string
}

// Amount validation constants
const MIN_AMOUNT = 1.0 // Minimum $1.00
const MAX_AMOUNT = 100000.0 // Maximum $100,000
const MAX_DECIMALS = 2

// Validation functions
const validateAmount = (amountStr: string): string | null => {
  if (!amountStr || amountStr.trim() === '') {
    return 'Amount is required'
  }

  const amount = parseFloat(amountStr)

  if (isNaN(amount)) {
    return 'Invalid amount format'
  }

  if (amount <= 0) {
    return 'Amount must be a positive number'
  }

  if (amount < MIN_AMOUNT) {
    return `Minimum amount is $${MIN_AMOUNT.toFixed(2)}`
  }

  if (amount > MAX_AMOUNT) {
    return `Maximum amount is $${MAX_AMOUNT.toLocaleString()}`
  }

  // Check decimal places
  const parts = amountStr.split('.')
  const decimalPart = parts[1]
  if (parts.length > 1 && decimalPart && decimalPart.length > MAX_DECIMALS) {
    return 'Amount can have at most 2 decimal places'
  }

  return null
}

const validateDescription = (desc: string): string | null => {
  if (!desc || desc.trim().length === 0) {
    return 'Description is required'
  }
  if (desc.trim().length < 10) {
    return 'Description must be at least 10 characters'
  }
  if (desc.length > 2000) {
    return 'Description must be 2000 characters or less'
  }
  return null
}

export default function RequestPaymentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])

  const [formData, setFormData] = useState({
    amount: '',
    workType: 'contract_work' as (typeof WORK_TYPES)[number]['value'],
    description: '',
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/contractor/payments/request/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload file')
      }

      const data = await res.json()
      setAttachments((prev) => [
        ...prev,
        {
          id: data.attachment.id,
          filename: data.attachment.filename,
          url: data.attachment.url,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const errors: Record<string, string> = {}

    // Validate amount with comprehensive checks
    const amountError = validateAmount(formData.amount)
    if (amountError) {
      errors.amount = amountError
    }

    // Validate description
    const descError = validateDescription(formData.description)
    if (descError) {
      errors.description = descError
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Convert to cents for API
    const amountCents = Math.round(parseFloat(formData.amount) * 100)

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contractor/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          workType: formData.workType,
          description: formData.description,
          attachmentIds: attachments.map((a) => a.id),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit payment request')
      }

      router.push('/payments?success=Payment+request+submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Request Payment</h1>
        <p className="text-muted-foreground">
          Submit an invoice or payment request for completed work
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Minimum request amount is $10.00. Maximum 3 pending requests at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  step="0.01"
                  placeholder="0.00"
                  className={`pl-7 ${fieldErrors.amount ? 'border-destructive' : ''}`}
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, amount: e.target.value }))
                    if (fieldErrors.amount) {
                      setFieldErrors((prev) => ({ ...prev, amount: '' }))
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur to provide immediate feedback
                    const error = validateAmount(formData.amount)
                    if (error) {
                      setFieldErrors((prev) => ({ ...prev, amount: error }))
                    }
                  }}
                  required
                />
              </div>
              {fieldErrors.amount ? (
                <p className="text-sm text-destructive">{fieldErrors.amount}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Min: ${MIN_AMOUNT.toFixed(2)} | Max: ${MAX_AMOUNT.toLocaleString()}
                </p>
              )}
            </div>

            {/* Work Type */}
            <div className="space-y-2">
              <Label htmlFor="workType">Work Type</Label>
              <select
                id="workType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.workType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    workType: e.target.value as typeof formData.workType,
                  }))
                }
              >
                {WORK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work completed..."
                rows={4}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: '' }))
                  }
                }}
                className={fieldErrors.description ? 'border-destructive' : ''}
                maxLength={2000}
                required
              />
              {fieldErrors.description ? (
                <p className="text-sm text-destructive">{fieldErrors.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formData.description.length < 10
                    ? `${formData.description.length}/10 characters (minimum 10 required)`
                    : `${formData.description.length}/2000 characters`}
                </p>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload invoices or receipts (PDF, PNG, JPG - max 10MB)
              </p>

              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="text-sm truncate">{attachment.filename}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && <Spinner className="h-4 w-4" />}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
