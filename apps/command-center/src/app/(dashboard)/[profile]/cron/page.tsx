'use client'

import { PROFILES } from '@cgk-platform/openclaw'
import { Button, cn } from '@cgk-platform/ui'
import { Plus } from 'lucide-react'
import { use, useCallback, useEffect, useState } from 'react'

import { CronDeleteDialog } from '@/components/cron/cron-delete-dialog'
import { CronJobForm } from '@/components/cron/cron-job-form'
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
  const [formOpen, setFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [deletingJob, setDeletingJob] = useState<CronJob | null>(null)
  const [restartNeeded, setRestartNeeded] = useState(false)

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

  const handleSave = useCallback(
    async (data: unknown) => {
      const jobData = data as { id?: string }
      const isEdit = !!jobData.id
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(`/api/openclaw/${profile}/cron/manage`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.ok) {
        setFormOpen(false)
        setEditingJob(null)
        setRestartNeeded(result.requiresRestart || false)
        await fetchJobs()
      }
      return result
    },
    [profile, fetchJobs]
  )

  const handleDelete = useCallback(async () => {
    if (!deletingJob) return
    const res = await fetch(
      `/api/openclaw/${profile}/cron/manage?id=${encodeURIComponent(deletingJob.id)}`,
      { method: 'DELETE' }
    )
    const result = await res.json()
    if (result.ok) {
      setDeletingJob(null)
      setRestartNeeded(result.requiresRestart || false)
      await fetchJobs()
    }
  }, [profile, deletingJob, fetchJobs])

  const handleRestart = useCallback(async () => {
    await fetch('/api/openclaw/actions/restart-gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    })
    setRestartNeeded(false)
  }, [profile])

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
          <Button
            size="sm"
            onClick={() => { setEditingJob(null); setFormOpen(true) }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Create Job
          </Button>
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

      {/* Restart notice */}
      {restartNeeded && (
        <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-4 py-2">
          <p className="text-xs text-warning">
            Jobs file modified — gateway restart required for changes to take effect.
          </p>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            Restart Gateway
          </Button>
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : view === 'table' ? (
        <CronTable
          jobs={jobs}
          profile={profile}
          onTrigger={handleTrigger}
          onEdit={(job) => { setEditingJob(job); setFormOpen(true) }}
          onDelete={setDeletingJob}
        />
      ) : (
        <CronTimeline jobs={jobs} />
      )}

      {/* Create/edit form */}
      {formOpen && (
        <CronJobForm
          profile={profile}
          initialData={editingJob ? {
            id: editingJob.id,
            name: editingJob.name,
            enabled: editingJob.enabled,
            schedule: editingJob.schedule as { kind: 'cron' | 'every'; cron?: string; everyMs?: number },
            delivery: editingJob.delivery,
            agentId: editingJob.agentId,
          } : undefined}
          onClose={() => { setFormOpen(false); setEditingJob(null) }}
          onSave={handleSave as never}
        />
      )}

      {/* Delete confirmation */}
      {deletingJob && (
        <CronDeleteDialog
          jobName={deletingJob.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingJob(null)}
        />
      )}
    </div>
  )
}
