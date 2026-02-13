/**
 * Integration Connection Status Badge
 *
 * Uses @cgk-platform/ui StatusBadge with showDot for connection states.
 */

'use client'

import { StatusBadge, type StatusBadgeProps, cn } from '@cgk-platform/ui'

import type { IntegrationStatus } from '@/lib/integrations/types'

interface ConnectionStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: IntegrationStatus
  details?: string
  showPulse?: boolean
}

export function ConnectionStatusBadge({
  status,
  details,
  showPulse = true,
  className,
  ...props
}: ConnectionStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      label={details}
      showDot
      className={cn(showPulse && status === 'connected' && '[&>span:first-child]:animate-pulse', className)}
      {...props}
    />
  )
}
