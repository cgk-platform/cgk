'use client'

import { Button, StatusBadge } from '@cgk-platform/ui'
import { useCallback, useEffect, useState } from 'react'

interface CronRun {
  id: string
  jobId: string
  startedAt: string
  completedAt?: string
  status: string
  duration?: number
  error?: string
}

interface CronRunHistoryProps {
  profile: string
  jobId: string
}

export function CronRunHistory({ profile, jobId }: CronRunHistoryProps) {
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchRuns = useCallback(async (offset = 0, append = false) => {
    try {
      const res = await fetch(
        `/api/openclaw/${profile}/cron/${jobId}/runs?offset=${offset}&limit=10`
      )
      const data = await res.json()
      const newRuns = data.runs || []
      setRuns((prev) => append ? [...prev, ...newRuns] : newRuns)
      setHasMore(data.hasMore ?? false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [profile, jobId])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    fetchRuns(runs.length, true)
  }, [fetchRuns, runs.length])

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading run history...</div>
  }

  if (runs.length === 0) {
    return <div className="text-sm text-muted-foreground">No run history</div>
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Recent Runs
      </h4>
      <div className="space-y-1">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-3">
              <StatusBadge status={run.status} />
              <span className="text-muted-foreground">
                {new Date(run.startedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {run.duration != null && (
                <span className="font-mono text-muted-foreground">
                  {run.duration < 1000
                    ? `${run.duration}ms`
                    : `${(run.duration / 1000).toFixed(1)}s`}
                </span>
              )}
              {run.error && (
                <span className="max-w-48 truncate text-destructive" title={run.error}>
                  {run.error}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  )
}
