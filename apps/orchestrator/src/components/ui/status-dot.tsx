/**
 * Status Dot Component
 *
 * Visual indicators for health/status using design system tokens.
 */

'use client'

import { cn } from '@cgk-platform/ui'

type StatusType = 'healthy' | 'degraded' | 'unhealthy' | 'critical'

interface StatusDotProps {
  /** Status type determining the color */
  status: StatusType
  /** Size of the dot */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to animate (pulse) */
  animate?: boolean
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

const statusColors: Record<StatusType, { bg: string; ring: string }> = {
  healthy: {
    bg: 'bg-success',
    ring: 'ring-success/30',
  },
  degraded: {
    bg: 'bg-warning',
    ring: 'ring-warning/30',
  },
  unhealthy: {
    bg: 'bg-destructive',
    ring: 'ring-destructive/30',
  },
  critical: {
    bg: 'bg-destructive',
    ring: 'ring-destructive/50',
  },
}

/**
 * StatusDot component for displaying health/status indicators
 */
export function StatusDot({
  status,
  size = 'md',
  animate = false,
  className,
}: StatusDotProps) {
  const colors = statusColors[status]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full',
        sizeClasses[size],
        colors.bg,
        animate && 'animate-pulse ring-2',
        animate && colors.ring,
        className
      )}
      aria-label={`Status: ${status}`}
      role="img"
    />
  )
}

interface ConnectionStatusProps {
  /** Whether connected */
  connected: boolean
  /** Optional label */
  label?: string
  /** Size of the dot */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

/**
 * Connection status indicator with optional label
 */
export function ConnectionStatus({
  connected,
  label,
  size = 'sm',
  className,
}: ConnectionStatusProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <StatusDot
        status={connected ? 'healthy' : 'unhealthy'}
        size={size}
        animate={connected}
      />
      {label && (
        <span className="text-xs text-muted-foreground">
          {connected ? label : `${label} disconnected`}
        </span>
      )}
    </span>
  )
}
