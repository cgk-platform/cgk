'use client'

import { Button } from '@cgk-platform/ui'
import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface CronJobFormData {
  id?: string
  name: string
  enabled: boolean
  schedule: {
    kind: 'cron' | 'every'
    cron?: string
    everyMs?: number
  }
  delivery: {
    mode: string
    channel?: string
    to?: string
  }
  payload?: { message: string }
  timeout?: number
  agentId?: string
}

interface CronJobFormProps {
  profile: string
  initialData?: CronJobFormData
  onClose: () => void
  onSave: (data: CronJobFormData) => Promise<{ requiresRestart?: boolean; error?: string; errors?: Array<{ field: string; message: string }> }>
}

export function CronJobForm({ profile, initialData, onClose, onSave }: CronJobFormProps) {
  const isEdit = !!initialData?.id
  const [name, setName] = useState(initialData?.name || '')
  const [enabled, setEnabled] = useState(initialData?.enabled ?? false)
  const [scheduleKind, setScheduleKind] = useState<'cron' | 'every'>(initialData?.schedule.kind || 'cron')
  const [cronExpr, setCronExpr] = useState(initialData?.schedule.cron || '')
  const [everyMinutes, setEveryMinutes] = useState(
    initialData?.schedule.everyMs ? Math.round(initialData.schedule.everyMs / 60_000) : 30
  )
  const [deliveryMode, setDeliveryMode] = useState(initialData?.delivery.mode || 'none')
  const [channel, setChannel] = useState(initialData?.delivery.channel || '')
  const [payloadMessage, setPayloadMessage] = useState(initialData?.payload?.message || '')
  const [timeoutMs, setTimeoutMs] = useState(initialData?.timeout ?? 300_000)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<string[]>([])

  const debounceRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  // Preview next runs
  const fetchPreview = useCallback(async (expr: string) => {
    if (!expr.trim() || expr.split(/\s+/).length !== 5) {
      setPreview([])
      return
    }
    try {
      const res = await fetch(
        `/api/openclaw/${profile}/cron/preview?cron=${encodeURIComponent(expr)}`
      )
      const data = await res.json()
      setPreview(data.nextRuns || [])
    } catch {
      setPreview([])
    }
  }, [profile])

  useEffect(() => {
    if (scheduleKind !== 'cron') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPreview(cronExpr), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cronExpr, scheduleKind, fetchPreview])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors([])
    setSaving(true)

    const data: CronJobFormData = {
      id: initialData?.id,
      name,
      enabled,
      schedule: scheduleKind === 'cron'
        ? { kind: 'cron', cron: cronExpr }
        : { kind: 'every', everyMs: everyMinutes * 60_000 },
      delivery: {
        mode: deliveryMode,
        channel: channel || undefined,
      },
      payload: payloadMessage ? { message: payloadMessage } : undefined,
      timeout: timeoutMs,
      agentId: initialData?.agentId || 'main',
    }

    try {
      const result = await onSave(data)
      if (result.error) {
        if (result.errors) {
          setErrors(result.errors.map((e) => `${e.field}: ${e.message}`))
        } else {
          setErrors([result.error])
        }
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Save failed'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            {isEdit ? 'Edit Cron Job' : 'Create Cron Job'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium">Job Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="my-daily-job"
              required
            />
          </div>

          {/* Schedule kind */}
          <div>
            <label className="mb-1 block text-xs font-medium">Schedule Type</label>
            <div className="flex gap-2">
              {(['cron', 'every'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setScheduleKind(k)}
                  className={`rounded-md border px-3 py-1 text-xs ${
                    scheduleKind === k
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {k === 'cron' ? 'Cron Expression' : 'Interval'}
                </button>
              ))}
            </div>
          </div>

          {/* Cron expression or interval */}
          {scheduleKind === 'cron' ? (
            <div>
              <label className="mb-1 block text-xs font-medium">Cron Expression</label>
              <input
                type="text"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0 6 * * *"
              />
              {preview.length > 0 && (
                <div className="mt-2 rounded bg-muted/50 p-2">
                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                    Next 5 runs (PST)
                  </p>
                  {preview.map((run, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{run}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium">Interval (minutes)</label>
              <input
                type="number"
                value={everyMinutes}
                onChange={(e) => setEveryMinutes(parseInt(e.target.value) || 1)}
                min={1}
                className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Delivery mode */}
          <div>
            <label className="mb-1 block text-xs font-medium">Delivery Mode</label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="announce">Announce</option>
              <option value="none">None (agent self-posts)</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="mb-1 block text-xs font-medium">
              Channel ID {deliveryMode === 'announce' && <span className="text-destructive">*</span>}
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="C0ADZGUJS4A"
              required={deliveryMode === 'announce'}
            />
          </div>

          {/* Payload message */}
          <div>
            <label className="mb-1 block text-xs font-medium">Payload Message</label>
            <textarea
              value={payloadMessage}
              onChange={(e) => setPayloadMessage(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="What should the agent do when this job runs?"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="mb-1 block text-xs font-medium">Timeout (ms)</label>
            <input
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 300_000)}
              className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Enabled toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <span className="text-sm">Enabled</span>
          </label>

          {/* Safety notice */}
          <p className="rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
            Safety: sessionTarget is forced to &quot;isolated&quot;, timezone forced to America/Los_Angeles.
            Gateway restart required after changes.
          </p>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-1 rounded border border-destructive/30 bg-destructive/5 p-3">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">{e}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
