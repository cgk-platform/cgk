/**
 * KPI Card Components
 *
 * Dashboard metric cards using design system tokens.
 */

'use client'

import { Card, cn } from '@cgk-platform/ui'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { StatusDot } from '../ui/status-dot'

interface KPICardProps {
  /** Card title/label */
  title: string
  /** Primary value to display */
  value: string | number
  /** Change percentage (positive = up, negative = down) */
  change?: number
  /** Change direction label (e.g., "vs last 30d") */
  changeLabel?: string
  /** Icon to display */
  icon?: ReactNode
  /** Whether this is a currency value */
  isCurrency?: boolean
  /** Click handler for drill-down */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Format a number as currency
 */
function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Format a number with abbreviations
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * KPI Card for displaying platform metrics
 */
export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  isCurrency = false,
  onClick,
  className,
}: KPICardProps) {
  const displayValue =
    typeof value === 'number'
      ? isCurrency
        ? formatCurrency(value)
        : formatNumber(value)
      : value

  const isPositiveChange = change !== undefined && change > 0
  const hasChange = change !== undefined && change !== 0

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 transition-all duration-normal',
        onClick && 'cursor-pointer hover:bg-accent/50 hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        )}
      </div>

      {hasChange && (
        <div className="mt-2 flex items-center gap-1.5">
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
              isPositiveChange
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {isPositiveChange ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : (
              <ArrowDownIcon className="h-3 w-3" />
            )}
            <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}%</span>
          </div>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </Card>
  )
}

interface StatusKPICardProps {
  /** Card title */
  title: string
  /** System status */
  status: 'healthy' | 'degraded' | 'critical'
  /** Status label text */
  statusLabel?: string
  /** Additional details */
  details?: string
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Status-focused KPI card for system health display
 */
export function StatusKPICard({
  title,
  status,
  statusLabel,
  details,
  onClick,
  className,
}: StatusKPICardProps) {
  const statusText = statusLabel || status.charAt(0).toUpperCase() + status.slice(1)
  const statusColor = {
    healthy: 'text-success',
    degraded: 'text-warning',
    critical: 'text-destructive',
  }[status]

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 transition-all duration-normal',
        onClick && 'cursor-pointer hover:bg-accent/50 hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <StatusDot status={status === 'critical' ? 'critical' : status} animate size="md" />
        <span className={cn('text-xl font-semibold', statusColor)}>{statusText}</span>
      </div>
      {details && <p className="mt-1 text-xs text-muted-foreground">{details}</p>}
    </Card>
  )
}

interface AlertsKPICardProps {
  /** Card title */
  title: string
  /** P1 alert count */
  p1: number
  /** P2 alert count */
  p2: number
  /** P3 alert count */
  p3: number
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Alerts KPI card showing priority breakdown
 */
export function AlertsKPICard({
  title,
  p1,
  p2,
  p3,
  onClick,
  className,
}: AlertsKPICardProps) {
  const total = p1 + p2 + p3

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 transition-all duration-normal',
        onClick && 'cursor-pointer hover:bg-accent/50 hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{total}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-xs font-medium">P1: {p1}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-xs font-medium">P2: {p2}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold" />
          <span className="text-xs font-medium">P3: {p3}</span>
        </span>
      </div>
    </Card>
  )
}
