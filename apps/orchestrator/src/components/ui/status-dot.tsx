'use client'

import { cn } from '@cgk/ui'

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
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

const statusColors: Record<StatusType, { bg: string; ring: string }> = {
  healthy: {
    bg: 'bg-green-500',
    ring: 'ring-green-500/30',
  },
  degraded: {
    bg: 'bg-yellow-500',
    ring: 'ring-yellow-500/30',
  },
  unhealthy: {
    bg: 'bg-red-500',
    ring: 'ring-red-500/30',
  },
  critical: {
    bg: 'bg-red-600',
    ring: 'ring-red-600/30',
  },
}

/**
 * StatusDot component for displaying health/status indicators
 *
 * @example
 * ```tsx
 * <StatusDot status="healthy" />
 * <StatusDot status="degraded" animate />
 * <StatusDot status="critical" size="lg" />
 * ```
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
