'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { cn } from '@cgk-platform/ui'
import { use, useCallback, useEffect, useState } from 'react'

import { CronTable } from '@/components/cron/cron-table'
import { CronTimeline } from '@/components/cron/cron-timeline'
import { RefreshButton } from '@/components/ui/refresh-button'

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

type ViewMode = 'table' | 'timeline'

export default function CronPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('table')

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/${profile}/cron`)
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleTrigger = useCallback(
    async (jobId: string) => {
      await fetch(`/api/openclaw/${profile}/cron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      setTimeout(fetchJobs, 2000)
    },
    [profile, fetchJobs]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cron Jobs — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            {jobs.length} jobs configured, {jobs.filter((j) => j.enabled).length} enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border p-0.5">
            {(['table', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  view === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <RefreshButton onRefresh={fetchJobs} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : view === 'table' ? (
        <CronTable jobs={jobs} profile={profile} onTrigger={handleTrigger} />
      ) : (
        <CronTimeline jobs={jobs} />
      )}
    </div>
  )
}
