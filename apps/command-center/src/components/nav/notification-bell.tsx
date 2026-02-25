'use client'

import { cn } from '@cgk-platform/ui'
import { Bell, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useAlerts } from '@/context/alerts-context'

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-destructive',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationBell() {
  const { alerts, unreadCount, clearAlerts, dismissAlert } = useAlerts()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggle}
        className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-2xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium">Notifications</span>
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No notifications
                </div>
              ) : (
                alerts
                  .slice()
                  .reverse()
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2 border-b px-3 py-2 last:border-0 hover:bg-accent/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-medium', LEVEL_COLORS[alert.level])}>
                          {alert.source && (
                            <span className="text-muted-foreground">[{alert.source}] </span>
                          )}
                          {alert.message}
                        </p>
                        <p className="text-2xs text-muted-foreground">
                          {formatTime(alert.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
