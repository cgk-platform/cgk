/**
 * Gift Card Status Badges
 *
 * Thin wrappers around @cgk-platform/ui StatusBadge for gift card domain.
 */

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'

interface StatusBadgeWrapperProps extends Omit<StatusBadgeProps, 'status'> {
  status: string
}

export function TransactionStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function EmailStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function ProductStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function SourceBadge({ source, ...props }: { source: string } & Omit<StatusBadgeProps, 'status'>) {
  const sourceLabels: Record<string, string> = {
    bundle_builder: 'Bundle Builder',
    manual: 'Manual',
    promotion: 'Promotion',
  }

  return (
    <StatusBadge
      status={source}
      label={sourceLabels[source] || source}
      variant="info"
      {...props}
    />
  )
}
