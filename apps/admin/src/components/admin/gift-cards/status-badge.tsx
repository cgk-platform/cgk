import { Badge } from '@cgk/ui'
import type { ComponentProps } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const transactionStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  credited: { label: 'Credited', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
}

const emailStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  sent: { label: 'Sent', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  skipped: { label: 'Skipped', variant: 'outline' },
}

const productStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  archived: { label: 'Archived', variant: 'outline' },
}

const sourceMap: Record<string, { label: string; variant: BadgeVariant }> = {
  bundle_builder: { label: 'Bundle Builder', variant: 'default' },
  manual: { label: 'Manual', variant: 'secondary' },
  promotion: { label: 'Promotion', variant: 'info' },
}

function StatusBadge({
  status,
  map,
}: {
  status: string
  map: Record<string, { label: string; variant: BadgeVariant }>
}) {
  const config = map[status] || { label: status, variant: 'secondary' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function TransactionStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={transactionStatusMap} />
}

export function EmailStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={emailStatusMap} />
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={productStatusMap} />
}

export function SourceBadge({ source }: { source: string }) {
  return <StatusBadge status={source} map={sourceMap} />
}
