'use client'

import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, cn, Input, Label, Textarea } from '@cgk-platform/ui'
import { ArrowLeft, Check, Send, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'
import type { RecipientFilter } from '@/lib/creator-communications/types'

export function BulkSendComposer() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'recipients' | 'compose' | 'review'>('recipients')

  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({
    status: [],
    tier: [],
    tags: [],
  })

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content_html: '',
    scheduled_for: '',
    personalize: true,
    include_unsubscribe: true,
    send_as_separate_threads: false,
  })

  const [_recipientCount] = useState<number | null>(null)

  const toggleFilter = (type: 'status' | 'tier', value: string) => {
    setRecipientFilter((prev) => {
      const current = prev[type] || []
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [type]: updated }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/creators/communications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recipient_filter: recipientFilter,
          scheduled_for: formData.scheduled_for || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/admin/creators/communications/bulk/${data.bulkSend.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/creators/communications/bulk">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Campaigns
        </Link>
      </Button>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {(['recipients', 'compose', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {i + 1}
            </button>
            {i < 2 && (
              <div className="mx-2 h-px w-12 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Recipients */}
      {step === 'recipients' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Filter by Status</Label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleFilter('status', status)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                      recipientFilter.status?.includes(status)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Filter by Tier</Label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleFilter('tier', tier)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                      recipientFilter.tier?.includes(tier)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Estimated Recipients</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your filter criteria
                  </p>
                </div>
                <p className="text-3xl font-bold">
                  {recipientFilter.status?.length || recipientFilter.tier?.length
                    ? '~150'
                    : 'All'}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('compose')}>
                Continue to Compose
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Compose */}
      {step === 'compose' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name (optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., February 2026 Update"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Important Update: New Commission Rates"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={formData.content_html}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content_html: e.target.value }))
                }
                placeholder="Enter your message content..."
                className="min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{creator_name}}'} to personalize with the creator's name
              </p>
            </div>

            <div className="space-y-3">
              <Label>Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.personalize}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, personalize: !!checked }))
                    }
                  />
                  <span className="text-sm">Personalize with creator name</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.include_unsubscribe}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, include_unsubscribe: !!checked }))
                    }
                  />
                  <span className="text-sm">Include unsubscribe link</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.send_as_separate_threads}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, send_as_separate_threads: !!checked }))
                    }
                  />
                  <span className="text-sm">Send as separate threads (not bulk BCC)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('recipients')}>
                Back
              </Button>
              <Button onClick={() => setStep('review')}>
                Review & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Review & Send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Recipients</p>
                <p className="mt-1 text-2xl font-bold">~150 creators</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recipientFilter.status?.length
                    ? `Status: ${recipientFilter.status.join(', ')}`
                    : 'All statuses'}
                  {recipientFilter.tier?.length
                    ? ` / Tier: ${recipientFilter.tier.join(', ')}`
                    : ''}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <p className="mt-1 font-medium">{formData.subject || '(No subject)'}</p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Preview</p>
              <div className="prose prose-sm max-w-none rounded-lg bg-muted/30 p-4">
                <p>{formData.content_html || '(No content)'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Schedule</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!formData.scheduled_for}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, scheduled_for: '' }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Send immediately</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!!formData.scheduled_for}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_for: new Date().toISOString().slice(0, 16),
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Schedule for later</span>
                </label>
              </div>

              {formData.scheduled_for && (
                <Input
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scheduled_for: e.target.value }))
                  }
                  className="max-w-xs"
                />
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('compose')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.subject}>
                <Send className="mr-1.5 h-4 w-4" />
                {isSubmitting
                  ? 'Creating...'
                  : formData.scheduled_for
                    ? 'Schedule Campaign'
                    : 'Send Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
