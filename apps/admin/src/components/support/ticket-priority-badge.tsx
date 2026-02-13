/**
 * Ticket Priority Badge
 *
 * Uses @cgk-platform/ui StatusBadge for priority display with dot indicator.
 */

'use client'

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'
import type { TicketPriority } from '@cgk-platform/support'

interface TicketPriorityBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  priority: TicketPriority
}

const priorityLabels: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

export function TicketPriorityBadge({ priority, ...props }: TicketPriorityBadgeProps) {
  return (
    <StatusBadge
      status={priority}
      label={priorityLabels[priority]}
      showDot
      {...props}
    />
  )
}
