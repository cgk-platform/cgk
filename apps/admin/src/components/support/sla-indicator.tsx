'use client'

import { cn } from '@cgk/ui'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface SLAIndicatorProps {
  deadline: Date | null
  createdAt: Date
  breached: boolean
  className?: string
  showLabel?: boolean
}

function getSLAStatus(
  deadline: Date | null,
  createdAt: Date
): 'safe' | 'warning' | 'breached' | null {
  if (!deadline) return null

  const now = new Date()

  if (now > deadline) {
    return 'breached'
  }

  const totalWindow = deadline.getTime() - createdAt.getTime()
  const remaining = deadline.getTime() - now.getTime()

  if (remaining < totalWindow * 0.25) {
    return 'warning'
  }

  return 'safe'
}

function formatRemainingTime(deadline: Date | null): string {
  if (!deadline) return 'No SLA'

  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  const minutes = Math.floor(Math.abs(diff) / (1000 * 60))

  const isOverdue = diff < 0

  if (minutes < 60) {
    return isOverdue ? `${minutes}m overdue` : `${minutes}m`
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return isOverdue ? `${hours}h overdue` : `${hours}h`
  }
  const days = Math.floor(minutes / 1440)
  return isOverdue ? `${days}d overdue` : `${days}d`
}

const STATUS_CONFIG = {
  safe: {
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  breached: {
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
  },
}

export function SLAIndicator({
  deadline,
  createdAt,
  breached,
  className,
  showLabel = false,
}: SLAIndicatorProps) {
  // If already marked as breached, show breached state
  const status = breached ? 'breached' : getSLAStatus(deadline, createdAt)

  if (!status || !deadline) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        No SLA
      </span>
    )
  }

  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const timeLabel = formatRemainingTime(deadline)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
      title={`SLA deadline: ${deadline.toLocaleString()}`}
    >
      <Icon className="h-3 w-3" />
      {showLabel && (
        <span className="uppercase tracking-wide opacity-75">
          {status === 'breached' ? 'SLA Breached' : 'SLA'}
        </span>
      )}
      <span className="tabular-nums">{timeLabel}</span>
    </div>
  )
}

/**
 * Compact SLA indicator for table rows
 */
export function SLAIndicatorCompact({
  deadline,
  createdAt,
  breached,
  className,
}: Omit<SLAIndicatorProps, 'showLabel'>) {
  const status = breached ? 'breached' : getSLAStatus(deadline, createdAt)

  if (!status || !deadline) {
    return <span className={cn('text-xs text-muted-foreground', className)}>--</span>
  }

  const config = STATUS_CONFIG[status]
  const timeLabel = formatRemainingTime(deadline)

  return (
    <span
      className={cn(
        'tabular-nums text-xs font-medium',
        config.textColor,
        className
      )}
      title={`SLA deadline: ${deadline.toLocaleString()}`}
    >
      {timeLabel}
    </span>
  )
}
