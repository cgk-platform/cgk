'use client'

import { Button, cn, StatusBadge } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight, Pencil, Play, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { CronRunHistory } from './cron-run-history'

interface CronJob {
  id: string
  agentId: string
  name: string
  enabled: boolean
  notify: boolean
  schedule: {
    kind: string
    cron?: string
    everyMs?: number
  }
  sessionTarget: string
  delivery: {
    mode: string
    channel?: string
    to?: string
  }
  state: {
    nextRunAtMs: number | null
    lastRunAtMs: number | null
    lastRunStatus: string | null
    lastDurationMs: number | null
    consecutiveErrors: number
  }
}

interface CronTableProps {
  jobs: CronJob[]
  profile: string
  onTrigger: (jobId: string) => Promise<void>
  onEdit?: (job: CronJob) => void
  onDelete?: (job: CronJob) => void
}

function formatSchedule(schedule: CronJob['schedule']): string {
  if (schedule.kind === 'cron' && schedule.cron) return schedule.cron
  if (schedule.kind === 'every' && schedule.everyMs) {
    const mins = Math.round(schedule.everyMs / 60_000)
    if (mins < 60) return `every ${mins}m`
    const hours = Math.round(mins / 60)
    return `every ${hours}h`
  }
  return schedule.kind
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return 'Never'
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapStatus(status: string | null): string {
  if (!status) return 'ready'
  if (status === 'ok') return 'completed'
  if (status === 'error') return 'failed'
  return status
}

export function CronTable({ jobs, profile, onTrigger, onEdit, onDelete }: CronTableProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)

  const handleTrigger = useCallback(
    async (jobId: string) => {
      setTriggeringJob(jobId)
      try {
        await onTrigger(jobId)
      } finally {
        setTriggeringJob(null)
      }
    },
    [onTrigger]
  )

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No cron jobs configured
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Job</th>
            <th className="p-3 text-left font-medium">Schedule</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Last Run</th>
            <th className="p-3 text-left font-medium">Delivery</th>
            <th className="p-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const isExpanded = expandedJob === job.id
            return (
              <tr key={job.id} className="group">
                <td colSpan={6} className="p-0">
                  <div>
                    <div className={cn(
                      'grid grid-cols-6 items-center border-b transition-colors',
                      'hover:bg-accent/50',
                      !job.enabled && 'opacity-50'
                    )}>
                      <div className="flex items-center gap-2 p-3">
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <span className="font-medium">{job.name}</span>
                      </div>
                      <div className="p-3 font-mono text-xs text-muted-foreground">
                        {formatSchedule(job.schedule)}
                      </div>
                      <div className="p-3">
                        <StatusBadge status={job.enabled ? mapStatus(job.state.lastRunStatus) : 'disabled'} />
                        {job.state.consecutiveErrors > 0 && (
                          <span className="ml-1 text-xs text-destructive">
                            ({job.state.consecutiveErrors} errors)
                          </span>
                        )}
                      </div>
                      <div className="p-3 text-xs text-muted-foreground">
                        {formatTimestamp(job.state.lastRunAtMs)}
                        {job.state.lastDurationMs != null && (
                          <span className="ml-1 font-mono">
                            ({job.state.lastDurationMs < 1000
                              ? `${job.state.lastDurationMs}ms`
                              : `${(job.state.lastDurationMs / 1000).toFixed(1)}s`})
                          </span>
                        )}
                      </div>
                      <div className="p-3 text-xs text-muted-foreground">
                        {job.delivery.mode}
                      </div>
                      <div className="flex justify-end gap-1 p-3">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(job)}
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(job)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTrigger(job.id)}
                          disabled={triggeringJob === job.id || !job.enabled}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          {triggeringJob === job.id ? 'Running...' : 'Run'}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-b bg-muted/30 p-4">
                        <CronRunHistory profile={profile} jobId={job.id} />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
