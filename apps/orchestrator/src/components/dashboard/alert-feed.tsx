'use client'

import { Badge, Card, cn } from '@cgk-platform/ui'
import { Bell, ChevronUp, Clock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AlertPriority, PlatformAlert } from '../../types/platform'
import { StatusDot } from '../ui/status-dot'

interface AlertFeedProps {
  /** Initial alerts to display */
  initialAlerts?: PlatformAlert[]
  /** WebSocket URL for real-time updates */
  wsUrl?: string
  /** Maximum alerts to show */
  maxAlerts?: number
  /** Additional CSS classes */
  className?: string
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 3000

/**
 * Format relative time (e.g., "2m ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

/**
 * Get priority badge variant and color
 */
function getPriorityStyles(priority: AlertPriority): {
  variant: 'destructive' | 'warning' | 'secondary'
  color: string
} {
  switch (priority) {
    case 'p1':
      return { variant: 'destructive', color: 'bg-red-500' }
    case 'p2':
      return { variant: 'warning', color: 'bg-orange-500' }
    case 'p3':
      return { variant: 'secondary', color: 'bg-yellow-500' }
  }
}

/**
 * Real-time alert feed with WebSocket connection
 */
export function AlertFeed({
  initialAlerts = [],
  wsUrl,
  maxAlerts = 50,
  className,
}: AlertFeedProps) {
  const [alerts, setAlerts] = useState<PlatformAlert[]>(initialAlerts)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [newAlertCount, setNewAlertCount] = useState(0)
  const [isScrolledDown, setIsScrolledDown] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle incoming WebSocket message
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'alert') {
          const newAlert: PlatformAlert = {
            ...data.alert,
            createdAt: new Date(data.alert.createdAt),
            acknowledgedAt: data.alert.acknowledgedAt
              ? new Date(data.alert.acknowledgedAt)
              : null,
            resolvedAt: data.alert.resolvedAt
              ? new Date(data.alert.resolvedAt)
              : null,
          }

          setAlerts((prev) => {
            const updated = [newAlert, ...prev].slice(0, maxAlerts)
            if (isScrolledDown) {
              setNewAlertCount((c) => c + 1)
            }
            return updated
          })
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    },
    [maxAlerts, isScrolledDown]
  )

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!wsUrl) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        setIsReconnecting(false)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        setIsConnected(false)

        // Attempt reconnection if not exceeded max attempts
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(true)
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => {
        setIsConnected(false)
      }

      wsRef.current = ws
    } catch {
      console.error('Failed to create WebSocket connection')
    }
  }, [wsUrl, handleMessage])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  // Handle scroll to detect if scrolled down
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const isAtTop = container.scrollTop < 20
    setIsScrolledDown(!isAtTop)

    if (isAtTop) {
      setNewAlertCount(0)
    }
  }, [])

  // Scroll to top when clicking new alerts banner
  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setNewAlertCount(0)
  }, [])

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Alert Feed</span>
        </div>
        <ConnectionIndicator
          isConnected={isConnected}
          isReconnecting={isReconnecting}
        />
      </div>

      {/* New alerts banner */}
      {newAlertCount > 0 && (
        <button
          onClick={scrollToTop}
          className="flex items-center justify-center gap-1 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ChevronUp className="h-3 w-3" />
          {newAlertCount} new {newAlertCount === 1 ? 'alert' : 'alerts'}
        </button>
      )}

      {/* Alert list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">
              No alerts to display
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Connection status indicator
 */
function ConnectionIndicator({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean
  isReconnecting: boolean
}) {
  if (isReconnecting) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        Reconnecting...
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        isConnected ? 'text-green-500' : 'text-red-500'
      )}
    >
      <StatusDot
        status={isConnected ? 'healthy' : 'unhealthy'}
        size="sm"
        animate={isConnected}
      />
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  )
}

/**
 * Individual alert item
 */
function AlertItem({ alert }: { alert: PlatformAlert }) {
  const priorityStyles = getPriorityStyles(alert.priority)
  const isUnread = !alert.acknowledgedAt

  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 transition-colors hover:bg-accent/50',
        isUnread && 'border-l-2 border-l-primary bg-accent/20'
      )}
    >
      {/* Priority indicator */}
      <div
        className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', priorityStyles.color)}
      />

      <div className="min-w-0 flex-1">
        {/* Alert header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{alert.title}</p>
            {alert.brandName && (
              <p className="truncate text-xs text-muted-foreground">
                {alert.brandName}
              </p>
            )}
          </div>
          <Badge
            variant={priorityStyles.variant}
            className="shrink-0 text-[10px]"
          >
            {alert.priority.toUpperCase()}
          </Badge>
        </div>

        {/* Alert message */}
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {alert.message}
        </p>

        {/* Timestamp */}
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(alert.createdAt)}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact alert list for sidebar
 */
export function AlertListCompact({
  alerts,
  className,
}: {
  alerts: PlatformAlert[]
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {alerts.slice(0, 5).map((alert) => {
        const priorityStyles = getPriorityStyles(alert.priority)
        return (
          <div
            key={alert.id}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent"
          >
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', priorityStyles.color)}
            />
            <span className="truncate">{alert.title}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {formatRelativeTime(alert.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
