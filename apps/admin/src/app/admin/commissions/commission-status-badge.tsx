'use client'

import { Badge } from '@cgk-platform/ui'

import type { CommissionStatus } from '@/lib/creators-admin-ops'

const statusConfig: Record<
  CommissionStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  paid: { label: 'Paid', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
