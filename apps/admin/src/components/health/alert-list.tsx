'use client'

/**
 * Alert List Component
 *
 * Displays platform alerts with filtering and acknowledgment workflow.
 */


import type { Alert, AlertSeverity, AlertStatus } from '@cgk-platform/health'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Info,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../../lib/utils'

interface AlertListProps {
  className?: string
  limit?: number
  service?: string
  tenantId?: string
  showFilters?: boolean
  onAcknowledge?: (alertId: string) => Promise<void>
  onResolve?: (alertId: string, notes?: string) => Promise<void>
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { icon: typeof AlertCircle; color: string; label: string }
> = {
  p1: { icon: AlertCircle, color: 'text-red-500', label: 'Critical' },
  p2: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Warning' },
  p3: { icon: Info, color: 'text-blue-500', label: 'Info' },
}

const STATUS_CONFIG: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: 'bg-red-100 text-red-800', label: 'Open' },
  acknowledged: { color: 'bg-yellow-100 text-yellow-800', label: 'Acknowledged' },
  resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert
  onAcknowledge?: (alertId: string) => Promise<void>
  onResolve?: (alertId: string, notes?: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const severityConfig = SEVERITY_CONFIG[alert.severity]
  const statusConfig = STATUS_CONFIG[alert.status]
  const Icon = severityConfig.icon

  async function handleAcknowledge() {
    if (!onAcknowledge) return
    setLoading(true)
    try {
      await onAcknowledge(alert.id)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve() {
    if (!onResolve) return
    setLoading(true)
    try {
      await onResolve(alert.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5', severityConfig.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('px-2 py-0.5 text-xs rounded-full', statusConfig.color)}>
              {statusConfig.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(alert.createdAt)}
            </span>
          </div>
          <h4 className="font-medium text-sm">{alert.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Service: {alert.service}</span>
            {alert.tenantSlug && <span>Tenant: {alert.tenantSlug}</span>}
          </div>
        </div>

        {/* Actions */}
        {alert.status !== 'resolved' && (
          <div className="flex items-center gap-2">
            {alert.status === 'open' && onAcknowledge && (
              <button
                onClick={handleAcknowledge}
                disabled={loading}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
                title="Acknowledge"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {onResolve && (
              <button
                onClick={handleResolve}
                disabled={loading}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
                title="Resolve"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-16 h-4 bg-muted rounded-full" />
                <div className="w-12 h-4 bg-muted rounded" />
              </div>
              <div className="w-3/4 h-4 bg-muted rounded mb-2" />
              <div className="w-1/2 h-3 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AlertList({
  className,
  limit = 10,
  service,
  tenantId,
  showFilters = false,
  onAcknowledge,
  onResolve,
}: AlertListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('')

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const params = new URLSearchParams()
        if (statusFilter === 'open') params.set('status', 'open')
        if (service) params.set('service', service)
        if (tenantId) params.set('tenantId', tenantId)
        if (severityFilter) params.set('severity', severityFilter)
        params.set('limit', limit.toString())

        const response = await fetch(`/api/platform/health/alerts?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch alerts')
        }
        const data = await response.json()
        setAlerts(data.alerts || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [limit, service, tenantId, statusFilter, severityFilter])

  async function handleAcknowledge(alertId: string) {
    if (onAcknowledge) {
      await onAcknowledge(alertId)
    } else {
      // Default implementation
      await fetch(`/api/platform/health/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', userId: 'current-user' }),
      })
    }
    // Refresh alerts
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a
      )
    )
  }

  async function handleResolve(alertId: string, notes?: string) {
    if (onResolve) {
      await onResolve(alertId, notes)
    } else {
      // Default implementation
      await fetch(`/api/platform/health/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          userId: 'current-user',
          notes,
        }),
      })
    }
    // Refresh alerts
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: 'resolved' as AlertStatus } : a
      )
    )
  }

  if (loading) {
    return <AlertListSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading alerts: {error}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showFilters && (
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'open' | 'all')}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="open">Open</option>
            <option value="all">All</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | '')}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="">All Severities</option>
            <option value="p1">P1 - Critical</option>
            <option value="p2">P2 - Warning</option>
            <option value="p3">P3 - Info</option>
          </select>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No alerts found
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  )
}
