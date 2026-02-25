'use client'

import { Button, cn, StatusBadge } from '@cgk-platform/ui'
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { useCallback, useState } from 'react'

import { CronRunHistory } from './cron-run-history'

interface CronJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  timezone: string
  lastRun?: string
  nextRun?: string
  lastStatus?: string
  sessionTarget: string
  delivery?: { mode: string; channel?: string }
  agentId?: string
}

interface CronTableProps {
  jobs: CronJob[]
  profile: string
  onTrigger: (jobId: string) => Promise<void>
}

export function CronTable({ jobs, profile, onTrigger }: CronTableProps) {
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
                        {job.schedule}
                      </div>
                      <div className="p-3">
                        <StatusBadge status={job.enabled ? (job.lastStatus || 'ready') : 'disabled'} />
                      </div>
                      <div className="p-3 text-xs text-muted-foreground">
                        {job.lastRun
                          ? new Date(job.lastRun).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </div>
                      <div className="p-3 text-xs text-muted-foreground">
                        {job.delivery?.mode || 'announce'}
                      </div>
                      <div className="flex justify-end p-3">
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
