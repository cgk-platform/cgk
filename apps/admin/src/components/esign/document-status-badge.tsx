/**
 * E-Signature Document Status Badge
 *
 * Thin wrappers around @cgk-platform/ui StatusBadge for e-sign domain.
 */

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'
import type { EsignDocumentStatus, EsignSignerStatus } from '@/lib/esign/types'

interface DocumentStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: EsignDocumentStatus
}

export function DocumentStatusBadge({ status, ...props }: DocumentStatusBadgeProps) {
  return <StatusBadge status={status} {...props} />
}

interface SignerStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: EsignSignerStatus
}

export function SignerStatusBadge({ status, ...props }: SignerStatusBadgeProps) {
  return <StatusBadge status={status} {...props} />
}
