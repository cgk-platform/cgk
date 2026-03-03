'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, Clock, Trash2 } from 'lucide-react'

import { Button } from '@cgk-platform/ui'
import { cn } from '@cgk-platform/ui'

interface ScheduledAction {
  id: string
  entityType: string
  entityId: string
  actionType: string
  scheduledFor: string
  status: string
  createdAt: string
}

export default function ScheduledActionsPage() {
  const [actions, setActions] = useState<ScheduledAction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'executed' | 'cancelled' | 'all'>(
    'pending'
  )

  const fetchActions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/admin/workflows/scheduled?${params}`)
      const data = await res.json()
      setActions(data.actions || [])
    } catch (error) {
      console.error('Failed to fetch actions:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  const handleCancel = async (id: string) => {
    const reason = prompt('Enter cancellation reason (optional):') || 'Cancelled by user'

    try {
      await fetch(`/api/admin/workflows/scheduled/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      fetchActions()
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
            Pending
          </span>
        )
      case 'executed':
        return (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
            Executed
          </span>
        )
      case 'cancelled':
        return (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Cancelled
          </span>
        )
      case 'failed':
        return (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            Failed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Scheduled Actions</h1>
        <p className="text-sm text-muted-foreground">
          View and manage delayed workflow actions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(['pending', 'executed', 'cancelled', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              statusFilter === status
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/20" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="rounded-full bg-muted/50 p-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No scheduled actions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter === 'pending'
              ? 'No actions are currently scheduled'
              : `No ${statusFilter} actions found`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-lg border bg-card p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{action.actionType}</span>
                    {getStatusBadge(action.status)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="font-mono">{action.entityType}</span>:{' '}
                    <span className="font-mono">{action.entityId.substring(0, 8)}...</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Scheduled: {new Date(action.scheduledFor).toLocaleString()}
                    </span>
                  </div>
                </div>

                {action.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(action.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
