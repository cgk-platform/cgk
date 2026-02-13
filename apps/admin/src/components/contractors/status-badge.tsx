/**
 * Contractor Status Badges
 *
 * Thin wrappers around @cgk-platform/ui StatusBadge for contractor domain.
 */

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'

import type {
  ContractorStatus,
  PaymentRequestStatus,
  ProjectStatus,
} from '@/lib/contractors/types'

export function ContractorStatusBadge({
  status,
  ...props
}: { status: ContractorStatus } & Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status={status} showDot {...props} />
}

export function ProjectStatusBadge({
  status,
  ...props
}: { status: ProjectStatus } & Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status={status} {...props} />
}

export function PaymentRequestStatusBadge({
  status,
  ...props
}: { status: PaymentRequestStatus } & Omit<StatusBadgeProps, 'status'>) {
  return <StatusBadge status={status} {...props} />
}
