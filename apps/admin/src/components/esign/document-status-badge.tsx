/**
 * E-Signature Document Status Badge
 *
 * Displays document status with appropriate styling.
 */

import { Badge, cn } from '@cgk/ui'
import type { EsignDocumentStatus, EsignSignerStatus } from '@/lib/esign/types'

const documentStatusConfig: Record<
  EsignDocumentStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  declined: {
    label: 'Declined',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  },
  voided: {
    label: 'Voided',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
  expired: {
    label: 'Expired',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
}

const signerStatusConfig: Record<
  EsignSignerStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  sent: {
    label: 'Sent',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  },
  viewed: {
    label: 'Viewed',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  },
  signed: {
    label: 'Signed',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  declined: {
    label: 'Declined',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  },
}

interface DocumentStatusBadgeProps {
  status: EsignDocumentStatus
  className?: string
}

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  const config = documentStatusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

interface SignerStatusBadgeProps {
  status: EsignSignerStatus
  className?: string
}

export function SignerStatusBadge({ status, className }: SignerStatusBadgeProps) {
  const config = signerStatusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
