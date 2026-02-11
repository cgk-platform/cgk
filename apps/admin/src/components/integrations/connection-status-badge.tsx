'use client'

import { cn } from '@cgk/ui'

import type { IntegrationStatus } from '@/lib/integrations/types'

interface ConnectionStatusBadgeProps {
  status: IntegrationStatus
  details?: string
  showPulse?: boolean
  className?: string
}

const statusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  connected: {
    label: 'Connected',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  },
  error: {
    label: 'Error',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
}

export function ConnectionStatusBadge({
  status,
  details,
  showPulse = true,
  className,
}: ConnectionStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected' && 'bg-emerald-400',
          status === 'disconnected' && 'bg-zinc-400',
          status === 'error' && 'bg-rose-400',
          status === 'pending' && 'bg-amber-400',
          showPulse && status === 'connected' && 'animate-pulse'
        )}
      />
      <span>{details || config.label}</span>
    </div>
  )
}
