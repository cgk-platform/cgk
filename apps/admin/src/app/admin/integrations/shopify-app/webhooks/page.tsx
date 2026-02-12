'use client'

/**
 * Webhook Health Dashboard
 *
 * Monitors Shopify webhook delivery and processing status
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Badge } from '@cgk/ui'
import type { WebhookHealthStatus, WebhookEvent, WebhookEventStatus } from '@cgk/shopify/webhooks'

interface EventsByTopic {
  topic: string
  count: number
  failedCount: number
}

interface WebhookHealthData {
  health: WebhookHealthStatus
  eventsByTopic: EventsByTopic[]
}

interface WebhookEventsData {
  events: WebhookEvent[]
  total: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
    active: 'success',
    completed: 'success',
    failed: 'destructive',
    deleted: 'secondary',
    pending: 'warning',
    processing: 'warning',
  }

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {status}
    </Badge>
  )
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never'

  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function extractResourceId(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '-'
  const p = payload as Record<string, unknown>
  if ('id' in p) return String(p.id)
  if ('order_id' in p) return String(p.order_id)
  return '-'
}

export default function WebhookHealthPage() {
  const [healthData, setHealthData] = useState<WebhookHealthData | null>(null)
  const [eventsData, setEventsData] = useState<WebhookEventsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WebhookEventStatus | 'all'>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/integrations/shopify/webhooks/health')
      if (!response.ok) {
        throw new Error('Failed to fetch webhook health')
      }
      const data = await response.json()
      setHealthData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const syncWebhooks = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/integrations/shopify/webhooks/sync', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to sync webhooks')
      }
      // Refresh data after sync
      await fetchHealth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const url = new URL('/api/admin/integrations/shopify/webhooks/events', window.location.origin)
        url.searchParams.set('limit', '20')
        if (statusFilter !== 'all') {
          url.searchParams.set('status', statusFilter)
        }

        const response = await fetch(url.toString())
        if (!response.ok) {
          throw new Error('Failed to fetch webhook events')
        }
        const data = await response.json()
        setEventsData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchHealth(), fetchEvents()])
      setLoading(false)
    }
    loadData()
  }, [statusFilter, refreshKey])

  const retryEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/integrations/shopify/webhooks/retry/${eventId}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to retry webhook')
      }
      // Refresh events after retry
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading webhook health...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Health</h1>
          <p className="text-muted-foreground">
            Monitor Shopify webhook delivery and processing
          </p>
        </div>
        <Button onClick={syncWebhooks} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Registrations'}
        </Button>
      </div>

      {/* Overview Stats */}
      {healthData && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total (24h)</div>
              <div className="text-2xl font-bold">{healthData.health.recentEvents.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold text-green-600">
                {healthData.health.recentEvents.completed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {healthData.health.recentEvents.failed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {healthData.health.recentEvents.pending}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registered Webhooks */}
      {healthData && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Registered Webhooks</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Topic</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last Success</th>
                    <th className="pb-2 font-medium">Failures</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {healthData.health.registrations.map((reg) => (
                    <tr key={reg.topic}>
                      <td className="py-3 font-mono text-sm">{reg.topic}</td>
                      <td className="py-3">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatRelativeTime(reg.lastSuccessAt)}
                      </td>
                      <td className="py-3 text-sm">{reg.failureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events by Topic */}
      {healthData && healthData.eventsByTopic.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Events by Topic (7 days)</h2>
            <div className="grid grid-cols-3 gap-4">
              {healthData.eventsByTopic.map((topic) => (
                <div key={topic.topic} className="rounded-lg border p-3">
                  <div className="font-mono text-sm">{topic.topic}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-bold">{topic.count}</span>
                    {topic.failedCount > 0 && (
                      <span className="text-sm text-red-600">
                        ({topic.failedCount} failed)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      {eventsData && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Events</h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WebhookEventStatus | 'all')}
                className="rounded-md border px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Topic</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Resource</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {eventsData.events.map((event) => (
                    <tr key={event.id}>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatRelativeTime(event.receivedAt)}
                      </td>
                      <td className="py-3 font-mono text-sm">{event.topic}</td>
                      <td className="py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="py-3 font-mono text-sm">
                        {extractResourceId(event.payload)}
                      </td>
                      <td className="py-3">
                        {event.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryEvent(event.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {eventsData.pagination.hasMore && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  Load More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
