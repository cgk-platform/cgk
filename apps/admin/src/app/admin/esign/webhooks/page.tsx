/**
 * E-Signature Webhooks Page
 *
 * Webhook configuration management.
 */

'use client'

import { Button, Card, CardContent, Input, Switch, cn } from '@cgk/ui'
import {
  Check,
  Copy,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  Webhook,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { EsignWebhook, EsignWebhookEvent } from '@/lib/esign/types'

const WEBHOOK_EVENTS: Array<{ event: EsignWebhookEvent; label: string; description: string }> = [
  { event: 'document.sent', label: 'Document Sent', description: 'When a document is sent for signing' },
  { event: 'document.viewed', label: 'Document Viewed', description: 'When a signer views the document' },
  { event: 'document.signed', label: 'Document Signed', description: 'When a signer completes signing' },
  { event: 'document.completed', label: 'Document Completed', description: 'When all signers have signed' },
  { event: 'document.declined', label: 'Document Declined', description: 'When a signer declines' },
  { event: 'document.expired', label: 'Document Expired', description: 'When a document expires' },
  { event: 'document.voided', label: 'Document Voided', description: 'When a document is voided' },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<EsignWebhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/admin/esign/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks)
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure webhook notifications for e-signature events
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {showCreate && (
        <CreateWebhookForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchWebhooks()
          }}
        />
      )}

      {isLoading ? (
        <WebhooksSkeleton />
      ) : webhooks.length === 0 ? (
        <EmptyState onAdd={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onUpdate={fetchWebhooks}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CreateWebhookForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [events, setEvents] = useState<EsignWebhookEvent[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdSecret, setCreatedSecret] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/esign/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, endpointUrl, events }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create webhook')
        return
      }

      setCreatedSecret(data.webhook.secretKey)
    } catch {
      setError('Failed to create webhook')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdSecret) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/50">
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Webhook Created
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Save this secret key - it will only be shown once.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-100 p-3 font-mono text-sm dark:bg-slate-800">
                <code className="flex-1 break-all">{createdSecret}</code>
                <CopyButton text={createdSecret} />
              </div>
              <Button className="mt-4" onClick={onCreated}>
                Done
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Add Webhook
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Webhook"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Endpoint URL
            </label>
            <Input
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              type="url"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Events
            </label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map(({ event, label, description }) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEvents([...events, event])
                      } else {
                        setEvents(events.filter((ev) => ev !== event))
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || events.length === 0}>
              {isSubmitting ? 'Creating...' : 'Create Webhook'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function WebhookCard({
  webhook,
  onUpdate,
}: {
  webhook: EsignWebhook
  onUpdate: () => void
}) {
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    statusCode?: number
    error?: string
  } | null>(null)

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)

    try {
      const res = await fetch(`/api/admin/esign/webhooks/${webhook.id}/test`, {
        method: 'POST',
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ success: false, error: 'Test failed' })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleToggle(isActive: boolean) {
    try {
      await fetch(`/api/admin/esign/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      onUpdate()
    } catch {
      console.error('Failed to toggle webhook')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      await fetch(`/api/admin/esign/webhooks/${webhook.id}`, {
        method: 'DELETE',
      })
      onUpdate()
    } catch {
      console.error('Failed to delete webhook')
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-lg p-2.5',
                webhook.isActive
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              )}
            >
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {webhook.name}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">{webhook.endpointUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={webhook.isActive}
              onCheckedChange={handleToggle}
            />
            <Button variant="ghost" size="sm" onClick={handleTest} disabled={isTesting}>
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Test'
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* Events */}
        <div className="mt-4 flex flex-wrap gap-2">
          {webhook.events.map((event) => (
            <span
              key={event}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            >
              {event}
            </span>
          ))}
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'mt-4 rounded-lg p-3 text-sm',
              testResult.success
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
            )}
          >
            {testResult.success
              ? `Success (${testResult.statusCode})`
              : testResult.error || 'Test failed'}
          </div>
        )}

        {/* Last triggered */}
        {webhook.lastTriggeredAt && (
          <p className="mt-4 text-xs text-slate-500">
            Last triggered:{' '}
            {new Date(webhook.lastTriggeredAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="flex h-48 items-center justify-center">
        <div className="text-center">
          <Globe className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
            No webhooks configured
          </p>
          <p className="text-sm text-slate-500">
            Add a webhook to receive event notifications
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WebhooksSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1.5">
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-6 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
