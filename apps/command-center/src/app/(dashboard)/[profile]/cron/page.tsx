'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { use, useCallback, useEffect, useState } from 'react'

import { CronTable } from '@/components/cron/cron-table'

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

export default function CronPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)

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
      // Refresh after trigger
      setTimeout(fetchJobs, 2000)
    },
    [profile, fetchJobs]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Cron Jobs — {config?.label || profile}
        </h1>
        <p className="text-muted-foreground">
          {jobs.length} jobs configured, {jobs.filter((j) => j.enabled).length} enabled
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <CronTable jobs={jobs} profile={profile} onTrigger={handleTrigger} />
      )}
    </div>
  )
}
