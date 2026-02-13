/**
 * Ticket Status Badge
 *
 * Thin wrapper around @cgk-platform/ui StatusBadge for support ticket status.
 */

'use client'

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'
import type { TicketStatus } from '@cgk-platform/support'

interface TicketStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: TicketStatus
}

export function TicketStatusBadge({ status, ...props }: TicketStatusBadgeProps) {
  return <StatusBadge status={status} {...props} />
}
