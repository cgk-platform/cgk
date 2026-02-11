import { Badge } from '@cgk/ui'
import type { ComponentProps } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const orderStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  processing: { label: 'Processing', variant: 'info' },
  shipped: { label: 'Shipped', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'outline' },
}

const fulfillmentStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  unfulfilled: { label: 'Unfulfilled', variant: 'warning' },
  partial: { label: 'Partial', variant: 'info' },
  fulfilled: { label: 'Fulfilled', variant: 'success' },
}

const financialStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  authorized: { label: 'Authorized', variant: 'info' },
  paid: { label: 'Paid', variant: 'success' },
  partially_paid: { label: 'Partially Paid', variant: 'info' },
  partially_refunded: { label: 'Partially Refunded', variant: 'warning' },
  refunded: { label: 'Refunded', variant: 'destructive' },
  voided: { label: 'Voided', variant: 'outline' },
}

const reviewStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  spam: { label: 'Spam', variant: 'outline' },
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; variant: BadgeVariant }> }) {
  const config = map[status] || { label: status, variant: 'secondary' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={orderStatusMap} />
}

export function FulfillmentBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={fulfillmentStatusMap} />
}

export function FinancialBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={financialStatusMap} />
}

export function ReviewStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={reviewStatusMap} />
}
