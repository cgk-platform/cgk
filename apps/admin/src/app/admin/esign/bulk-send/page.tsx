/**
 * E-Signature Bulk Send Wizard Page
 *
 * Multi-step wizard for sending documents to multiple recipients.
 */

'use client'

import {
  Button,
  Card,
  CardContent,
  Input,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@cgk/ui'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  FileText,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { EsignTemplate } from '@/lib/esign/types'

interface Recipient {
  id: string
  name: string
  email: string
  customFields?: Record<string, string>
}

type Step = 'template' | 'recipients' | 'message' | 'review'

const MAX_RECIPIENTS = 100

export default function BulkSendWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('template')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', name: '', email: '' },
  ])
  const [batchName, setBatchName] = useState('')
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [scheduledFor, setScheduledFor] = useState('')

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/admin/esign/templates?status=active')
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.templates)
        }
      } catch (err) {
        console.error('Failed to load templates:', err)
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Validation
  const canProceedFromTemplate = !!selectedTemplateId
  const validRecipients = recipients.filter((r) => r.name && r.email)
  const canProceedFromRecipients = validRecipients.length > 0

  // Navigation
  const steps: Step[] = ['template', 'recipients', 'message', 'review']
  const currentStepIndex = steps.indexOf(step)

  function goNext() {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1]!)
    }
  }

  function goBack() {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]!)
    }
  }

  // Recipients management
  function addRecipient() {
    if (recipients.length >= MAX_RECIPIENTS) {
      setError(`Maximum ${MAX_RECIPIENTS} recipients allowed`)
      return
    }
    setRecipients([
      ...recipients,
      { id: String(Date.now()), name: '', email: '' },
    ])
  }

  function removeRecipient(id: string) {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id))
    }
  }

  function updateRecipient(id: string, field: 'name' | 'email', value: string) {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  // CSV import
  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter((line) => line.trim())

      // Skip header row if it looks like one
      const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0

      const newRecipients: Recipient[] = []
      for (let i = startIndex; i < lines.length && newRecipients.length < MAX_RECIPIENTS; i++) {
        const line = lines[i]
        if (!line) continue

        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''))
        const name = parts[0] || ''
        const email = parts[1] || ''

        if (name && email && email.includes('@')) {
          newRecipients.push({
            id: String(Date.now() + i),
            name,
            email,
          })
        }
      }

      if (newRecipients.length > 0) {
        setRecipients(newRecipients)
        setError('')
      } else {
        setError('No valid recipients found in CSV')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset for re-upload
  }

  // Submit
  async function handleSubmit() {
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/esign/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          name: batchName || `Bulk Send - ${new Date().toLocaleDateString()}`,
          recipients: validRecipients.map((r) => ({
            name: r.name,
            email: r.email,
            customFields: r.customFields,
          })),
          message,
          expiresInDays: parseInt(expiresInDays, 10),
          scheduledFor: scheduledFor || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create bulk send')
        return
      }

      setSuccess(true)
    } catch {
      setError('Failed to create bulk send')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Bulk Send Created
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Your documents are being sent to {validRecipients.length} recipients.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/admin/esign">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href="/admin/esign/bulk-send">
                <Button onClick={() => router.refresh()}>Send Another</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Bulk Send
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Send a document to multiple recipients at once
          </p>
        </div>
        <Link href="/admin/esign">
          <Button variant="ghost" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, idx) => {
          const isCurrent = s === step
          const isCompleted = idx < currentStepIndex
          return (
            <div key={s} className="flex items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 w-8',
                    isCompleted ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 'template' && (
            <TemplateStep
              templates={templates}
              isLoading={isLoadingTemplates}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          )}

          {step === 'recipients' && (
            <RecipientsStep
              recipients={recipients}
              onAdd={addRecipient}
              onRemove={removeRecipient}
              onUpdate={updateRecipient}
              onCsvImport={handleCsvImport}
              maxRecipients={MAX_RECIPIENTS}
            />
          )}

          {step === 'message' && (
            <MessageStep
              batchName={batchName}
              onBatchNameChange={setBatchName}
              message={message}
              onMessageChange={setMessage}
              expiresInDays={expiresInDays}
              onExpiresChange={setExpiresInDays}
              scheduledFor={scheduledFor}
              onScheduledChange={setScheduledFor}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              template={selectedTemplate}
              recipients={validRecipients}
              batchName={batchName}
              message={message}
              expiresInDays={expiresInDays}
              scheduledFor={scheduledFor}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        {step === 'review' ? (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {validRecipients.length} Recipients
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={
              (step === 'template' && !canProceedFromTemplate) ||
              (step === 'recipients' && !canProceedFromRecipients)
            }
          >
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Step Components

function TemplateStep({
  templates,
  isLoading,
  selectedId,
  onSelect,
}: {
  templates: EsignTemplate[]
  isLoading: boolean
  selectedId: string
  onSelect: (id: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center">
        <FileText className="h-10 w-10 text-slate-400" />
        <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
          No active templates
        </p>
        <p className="text-sm text-slate-500">
          Create and activate a template before sending
        </p>
        <Link href="/admin/esign/templates">
          <Button size="sm" className="mt-4">
            Manage Templates
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Select Template
        </h3>
        <p className="text-sm text-slate-500">
          Choose the document template to send
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
              selectedId === template.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
            )}
          >
            <div
              className={cn(
                'rounded-lg p-2',
                selectedId === template.id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              )}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {template.name}
              </p>
              {template.description && (
                <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
            {selectedId === template.id && (
              <Check className="h-5 w-5 shrink-0 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function RecipientsStep({
  recipients,
  onAdd,
  onRemove,
  onUpdate,
  onCsvImport,
  maxRecipients,
}: {
  recipients: Recipient[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, field: 'name' | 'email', value: string) => void
  onCsvImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  maxRecipients: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Add Recipients
          </h3>
          <p className="text-sm text-slate-500">
            {recipients.length} / {maxRecipients} recipients
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Upload className="h-4 w-4" />
          Import CSV
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={onCsvImport}
          />
        </label>
      </div>

      <div className="space-y-3">
        {recipients.map((recipient, idx) => (
          <div key={recipient.id} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm text-slate-500">{idx + 1}</span>
            <Input
              placeholder="Name"
              value={recipient.name}
              onChange={(e) => onUpdate(recipient.id, 'name', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Email"
              type="email"
              value={recipient.email}
              onChange={(e) => onUpdate(recipient.id, 'email', e.target.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(recipient.id)}
              disabled={recipients.length === 1}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onAdd}
        disabled={recipients.length >= maxRecipients}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add Recipient
      </Button>

      <p className="text-xs text-slate-500">
        CSV format: name,email (one per line)
      </p>
    </div>
  )
}

function MessageStep({
  batchName,
  onBatchNameChange,
  message,
  onMessageChange,
  expiresInDays,
  onExpiresChange,
  scheduledFor,
  onScheduledChange,
}: {
  batchName: string
  onBatchNameChange: (v: string) => void
  message: string
  onMessageChange: (v: string) => void
  expiresInDays: string
  onExpiresChange: (v: string) => void
  scheduledFor: string
  onScheduledChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Configure Send
        </h3>
        <p className="text-sm text-slate-500">
          Add a message and set options
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Batch Name (optional)
          </label>
          <Input
            value={batchName}
            onChange={(e) => onBatchNameChange(e.target.value)}
            placeholder="e.g., Q1 2026 Contractor Agreements"
          />
          <p className="mt-1 text-xs text-slate-500">
            Name this batch for easy identification
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Message to Recipients (optional)
          </label>
          <Textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Add a personal message to include in the signing request email..."
            rows={4}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Expires In
            </label>
            <RadixSelect value={expiresInDays} onValueChange={onExpiresChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </RadixSelect>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Schedule Send (optional)
            </label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => onScheduledChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewStep({
  template,
  recipients,
  batchName,
  message,
  expiresInDays,
  scheduledFor,
}: {
  template?: EsignTemplate
  recipients: Recipient[]
  batchName: string
  message: string
  expiresInDays: string
  scheduledFor: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Review & Send
        </h3>
        <p className="text-sm text-slate-500">
          Confirm the details before sending
        </p>
      </div>

      <div className="space-y-4">
        {/* Template */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
            <FileText className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Template</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {template?.name || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Recipients</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {recipients.length} recipients
              </p>
            </div>
          </div>
          <div className="max-h-32 space-y-1 overflow-auto">
            {recipients.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <Mail className="h-3.5 w-3.5" />
                {r.name} ({r.email})
              </div>
            ))}
            {recipients.length > 5 && (
              <p className="text-sm text-slate-500">
                ... and {recipients.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-4 sm:grid-cols-2">
          {batchName && (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm text-slate-500">Batch Name</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {batchName}
              </p>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm text-slate-500">Expires In</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {expiresInDays} days
            </p>
          </div>
          {scheduledFor && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-500">Scheduled For</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {new Date(scheduledFor).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-2 text-sm text-slate-500">Message</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
