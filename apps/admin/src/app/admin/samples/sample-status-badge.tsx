'use client'

import { Badge } from '@cgk/ui'

import type { SampleStatus } from '@/lib/creators-admin-ops'

const statusConfig: Record<
  SampleStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  requested: { label: 'Requested', variant: 'outline' },
  approved: { label: 'Approved', variant: 'outline' },
  pending: { label: 'Pending', variant: 'outline' },
  shipped: { label: 'Shipped', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
