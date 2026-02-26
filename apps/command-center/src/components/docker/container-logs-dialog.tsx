'use client'

import { Button } from '@cgk-platform/ui'
import { RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ContainerLogsDialogProps {
  containerId: string
  onClose: () => void
}

export function ContainerLogsDialog({ containerId, onClose }: ContainerLogsDialogProps) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/openclaw/docker/${containerId}?lines=100`)
      const data = await res.json()
      setLogs(data.logs || 'No logs available')
    } catch {
      setLogs('Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [containerId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="truncate text-sm font-medium">
            Logs — {containerId.slice(0, 12)}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && !logs ? (
            <div className="h-32 animate-pulse rounded bg-muted" />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {logs}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
