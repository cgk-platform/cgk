'use client'

import { Clock, GitBranch, Play, Timer, Zap } from 'lucide-react'

import { cn } from '@cgk-platform/ui'

type TriggerType = 'status_change' | 'time_elapsed' | 'scheduled' | 'event' | 'manual'

interface TriggerConfig {
  type: TriggerType
  [key: string]: unknown
}

interface TriggerConfigFormProps {
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  onTypeChange: (type: TriggerType) => void
  onConfigChange: (config: TriggerConfig) => void
}

const TRIGGER_OPTIONS = [
  {
    type: 'status_change' as const,
    label: 'Status Change',
    description: 'Trigger when entity status changes',
    icon: GitBranch,
  },
  {
    type: 'time_elapsed' as const,
    label: 'Time Elapsed',
    description: 'Trigger after time in a status',
    icon: Timer,
  },
  {
    type: 'scheduled' as const,
    label: 'Scheduled',
    description: 'Trigger on a schedule (cron)',
    icon: Clock,
  },
  {
    type: 'event' as const,
    label: 'Event',
    description: 'Trigger on system event',
    icon: Zap,
  },
  {
    type: 'manual' as const,
    label: 'Manual',
    description: 'Trigger manually only',
    icon: Play,
  },
]

const COMMON_STATUSES = [
  'pending',
  'in_progress',
  'submitted',
  'review',
  'approved',
  'rejected',
  'completed',
  'cancelled',
  'active',
  'payment_pending',
]

const COMMON_EVENTS = [
  'order.created',
  'order.fulfilled',
  'submission.created',
  'payment.received',
  'creator.applied',
  'review.submitted',
]

export function TriggerConfigForm({
  triggerType,
  triggerConfig,
  onTypeChange,
  onConfigChange,
}: TriggerConfigFormProps) {
  const updateConfig = (updates: Partial<TriggerConfig>) => {
    onConfigChange({ ...triggerConfig, ...updates })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-foreground">Trigger Type</h3>
        <p className="text-sm text-muted-foreground">
          Choose what initiates this workflow
        </p>
      </div>

      {/* Trigger Type Selection */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRIGGER_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = triggerType === option.type

          return (
            <button
              key={option.type}
              onClick={() => {
                onTypeChange(option.type)
                onConfigChange({ type: option.type })
              }}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-muted-foreground/50 hover:bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Trigger-specific Configuration */}
      <div className="rounded-lg border bg-muted/20 p-4">
        {triggerType === 'status_change' && (
          <StatusChangeTriggerForm
            config={triggerConfig}
            onChange={updateConfig}
          />
        )}

        {triggerType === 'time_elapsed' && (
          <TimeElapsedTriggerForm
            config={triggerConfig}
            onChange={updateConfig}
          />
        )}

        {triggerType === 'scheduled' && (
          <ScheduledTriggerForm
            config={triggerConfig}
            onChange={updateConfig}
          />
        )}

        {triggerType === 'event' && (
          <EventTriggerForm config={triggerConfig} onChange={updateConfig} />
        )}

        {triggerType === 'manual' && (
          <div className="text-sm text-muted-foreground">
            This rule will only run when triggered manually from the UI or API.
          </div>
        )}
      </div>
    </div>
  )
}

function StatusChangeTriggerForm({
  config,
  onChange,
}: {
  config: TriggerConfig
  onChange: (updates: Partial<TriggerConfig>) => void
}) {
  const fromStatuses = (config.from as string[]) || []
  const toStatuses = (config.to as string[]) || []

  const toggleStatus = (list: 'from' | 'to', status: string) => {
    const current = (config[list] as string[]) || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onChange({ [list]: updated })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">From Status (optional)</label>
        <p className="text-xs text-muted-foreground mb-2">
          Only trigger if changing from these statuses
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus('from', status)}
              className={cn(
                'rounded-md border px-3 py-1 font-mono text-sm transition-colors',
                fromStatuses.includes(status)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:border-muted-foreground/50'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">To Status (optional)</label>
        <p className="text-xs text-muted-foreground mb-2">
          Only trigger if changing to these statuses
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus('to', status)}
              className={cn(
                'rounded-md border px-3 py-1 font-mono text-sm transition-colors',
                toStatuses.includes(status)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:border-muted-foreground/50'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimeElapsedTriggerForm({
  config,
  onChange,
}: {
  config: TriggerConfig
  onChange: (updates: Partial<TriggerConfig>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">When Status Is</label>
        <select
          value={(config.status as string) || ''}
          onChange={(e) => onChange({ status: e.target.value })}
          className={cn(
            'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          )}
        >
          <option value="">Select status...</option>
          {COMMON_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Hours</label>
          <input
            type="number"
            min="0"
            value={(config.hours as number) || ''}
            onChange={(e) => onChange({ hours: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className={cn(
              'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Days</label>
          <input
            type="number"
            min="0"
            value={(config.days as number) || ''}
            onChange={(e) => onChange({ days: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className={cn(
              'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Trigger after{' '}
        <span className="font-mono text-foreground">
          {((config.hours as number) || 0) + ((config.days as number) || 0) * 24} hours
        </span>{' '}
        in <span className="font-mono text-primary">{(config.status as string) || '...'}</span> status
      </div>
    </div>
  )
}

function ScheduledTriggerForm({
  config,
  onChange,
}: {
  config: TriggerConfig
  onChange: (updates: Partial<TriggerConfig>) => void
}) {
  const presets = [
    { label: 'Daily at 9 AM', cron: '0 9 * * *' },
    { label: 'Daily at 6 PM', cron: '0 18 * * *' },
    { label: 'Every Monday 9 AM', cron: '0 9 * * 1' },
    { label: 'First of month', cron: '0 9 1 * *' },
    { label: 'Every hour', cron: '0 * * * *' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Cron Expression</label>
        <input
          type="text"
          value={(config.cron as string) || ''}
          onChange={(e) => onChange({ cron: e.target.value })}
          placeholder="0 9 * * *"
          className={cn(
            'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          )}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Format: minute hour day-of-month month day-of-week
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Quick Presets</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.cron}
              onClick={() => onChange({ cron: preset.cron })}
              className={cn(
                'rounded-md border px-3 py-1 text-sm transition-colors',
                config.cron === preset.cron
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:border-muted-foreground/50'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Timezone (optional)</label>
        <input
          type="text"
          value={(config.timezone as string) || ''}
          onChange={(e) => onChange({ timezone: e.target.value })}
          placeholder="America/Los_Angeles"
          className={cn(
            'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          )}
        />
      </div>
    </div>
  )
}

function EventTriggerForm({
  config,
  onChange,
}: {
  config: TriggerConfig
  onChange: (updates: Partial<TriggerConfig>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Event Type</label>
        <select
          value={(config.eventType as string) || ''}
          onChange={(e) => onChange({ eventType: e.target.value })}
          className={cn(
            'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          )}
        >
          <option value="">Select event...</option>
          {COMMON_EVENTS.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-muted-foreground">
        Trigger when{' '}
        <code className="font-mono text-primary">
          {(config.eventType as string) || '...'}
        </code>{' '}
        event is fired
      </div>
    </div>
  )
}
