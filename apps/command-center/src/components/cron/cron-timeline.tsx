'use client'

import { cn } from '@cgk-platform/ui'
import { useMemo } from 'react'

interface CronJob {
  id: string
  name: string
  enabled: boolean
  schedule: {
    kind: string
    cron?: string
    everyMs?: number
  }
  state: {
    nextRunAtMs: number | null
    lastRunAtMs: number | null
    lastRunStatus: string | null
    consecutiveErrors: number
  }
}

interface CronTimelineProps {
  jobs: CronJob[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function parseHoursFromCron(cron: string): number[] {
  // Basic cron parsing for hour field (minute hour day month dow)
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return []
  const hourField = parts[1] || '*'

  if (hourField === '*') return HOURS
  if (hourField.includes('/')) {
    const [, step] = hourField.split('/')
    const s = parseInt(step || '1', 10) || 1
    return HOURS.filter((h) => h % s === 0)
  }
  if (hourField.includes(',')) {
    return hourField.split(',').map((h) => parseInt(h, 10)).filter((h) => !isNaN(h))
  }
  if (hourField.includes('-')) {
    const [start, end] = hourField.split('-').map(Number)
    if (start != null && end != null) {
      return HOURS.filter((h) => h >= start && h <= end)
    }
  }
  const h = parseInt(hourField, 10)
  return isNaN(h) ? [] : [h]
}

function getJobHours(job: CronJob): number[] {
  if (job.schedule.kind === 'cron' && job.schedule.cron) {
    return parseHoursFromCron(job.schedule.cron)
  }
  if (job.schedule.kind === 'every' && job.schedule.everyMs) {
    const intervalHours = job.schedule.everyMs / (60 * 60 * 1000)
    if (intervalHours <= 0) return HOURS
    const result: number[] = []
    for (let h = 0; h < 24; h += intervalHours) {
      result.push(Math.floor(h))
    }
    return [...new Set(result)]
  }
  return []
}

export function CronTimeline({ jobs }: CronTimelineProps) {
  const enabledJobs = useMemo(() => jobs.filter((j) => j.enabled), [jobs])

  const jobSlots = useMemo(() => {
    return enabledJobs.map((job) => ({
      job,
      hours: getJobHours(job),
    }))
  }, [enabledJobs])

  if (enabledJobs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No enabled cron jobs
      </div>
    )
  }

  const currentHour = new Date().getHours()

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="min-w-[800px]">
        {/* Hour header */}
        <div className="flex border-b bg-muted/50">
          <div className="w-40 shrink-0 p-2 text-xs font-medium text-muted-foreground">
            Job
          </div>
          {HOURS.map((h) => (
            <div
              key={h}
              className={cn(
                'flex-1 p-1 text-center text-2xs text-muted-foreground',
                h === currentHour && 'bg-gold/10 font-semibold text-gold'
              )}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Job rows */}
        {jobSlots.map(({ job, hours }) => (
          <div key={job.id} className="flex border-b last:border-0 hover:bg-accent/30">
            <div className="w-40 shrink-0 truncate p-2 text-xs font-medium" title={job.name}>
              {job.name}
            </div>
            {HOURS.map((h) => {
              const active = hours.includes(h)
              const hasError = job.state.consecutiveErrors > 0
              return (
                <div key={h} className="flex flex-1 items-center justify-center p-1">
                  {active && (
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        hasError ? 'bg-destructive' : 'bg-gold/70',
                        h === currentHour && 'ring-2 ring-gold/30'
                      )}
                      title={`${job.name} @ ${h}:00${hasError ? ` (${job.state.consecutiveErrors} errors)` : ''}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
