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

const creatorStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  applied: { label: 'Applied', variant: 'warning' },
  reviewing: { label: 'Reviewing', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  onboarding: { label: 'Onboarding', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

const creatorTierMap: Record<string, { label: string; variant: BadgeVariant }> = {
  bronze: { label: 'Bronze', variant: 'outline' },
  silver: { label: 'Silver', variant: 'secondary' },
  gold: { label: 'Gold', variant: 'warning' },
  platinum: { label: 'Platinum', variant: 'default' },
}

const withdrawalStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  processing: { label: 'Processing', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

const threadStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  closed: { label: 'Closed', variant: 'outline' },
}

const w9StatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  not_submitted: { label: 'Not Submitted', variant: 'outline' },
  pending_review: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'destructive' },
}

const form1099StatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  not_required: { label: 'Not Required', variant: 'outline' },
  pending: { label: 'Pending', variant: 'warning' },
  generated: { label: 'Generated', variant: 'info' },
  sent: { label: 'Sent', variant: 'success' },
}

export function CreatorStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={creatorStatusMap} />
}

export function CreatorTierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null
  return <StatusBadge status={tier} map={creatorTierMap} />
}

export function WithdrawalStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={withdrawalStatusMap} />
}

export function ThreadStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={threadStatusMap} />
}

export function W9StatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={w9StatusMap} />
}

export function Form1099StatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} map={form1099StatusMap} />
}
