import { Badge } from '@cgk/ui'

import {
  CONTRACTOR_STATUS_LABELS,
  CONTRACTOR_STATUS_VARIANTS,
  type ContractorStatus,
  PAYMENT_REQUEST_STATUS_LABELS,
  PAYMENT_REQUEST_STATUS_VARIANTS,
  type PaymentRequestStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANTS,
  type ProjectStatus,
} from '@/lib/contractors/types'

interface ContractorStatusBadgeProps {
  status: ContractorStatus
}

export function ContractorStatusBadge({ status }: ContractorStatusBadgeProps) {
  return (
    <Badge variant={CONTRACTOR_STATUS_VARIANTS[status]}>
      {CONTRACTOR_STATUS_LABELS[status]}
    </Badge>
  )
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant={PROJECT_STATUS_VARIANTS[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}

interface PaymentRequestStatusBadgeProps {
  status: PaymentRequestStatus
}

export function PaymentRequestStatusBadge({ status }: PaymentRequestStatusBadgeProps) {
  return (
    <Badge variant={PAYMENT_REQUEST_STATUS_VARIANTS[status]}>
      {PAYMENT_REQUEST_STATUS_LABELS[status]}
    </Badge>
  )
}
