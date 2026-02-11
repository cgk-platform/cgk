'use client'

import { Badge } from '@cgk/ui'
import type { TicketStatus } from '@cgk/support'

interface TicketStatusBadgeProps {
  status: TicketStatus
  className?: string
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'secondary' }> = {
  open: { label: 'Open', variant: 'info' },
  pending: { label: 'Pending', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
