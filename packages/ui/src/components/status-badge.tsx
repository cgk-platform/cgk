import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'

/**
 * Consolidated Status Badge
 *
 * Replaces multiple scattered badge implementations across apps.
 * Use status prop for semantic colors, or variant for explicit styling.
 */

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-input bg-background text-foreground',

        // Semantic colors
        success: 'bg-success/15 text-success border border-success/20',
        warning: 'bg-warning/15 text-warning border border-warning/20',
        error: 'bg-destructive/15 text-destructive border border-destructive/20',
        info: 'bg-info/15 text-info border border-info/20',

        // Neutral states
        muted: 'bg-muted text-muted-foreground',
        ghost: 'text-muted-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      dot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      dot: false,
    },
  }
)

/**
 * Status to variant mapping
 * Maps common status strings to appropriate visual variants
 */
const statusVariantMap: Record<string, VariantProps<typeof statusBadgeVariants>['variant']> = {
  // Order/Transaction statuses
  pending: 'warning',
  processing: 'info',
  in_progress: 'info',
  completed: 'success',
  complete: 'success',
  fulfilled: 'success',
  paid: 'success',
  cancelled: 'muted',
  canceled: 'muted',
  failed: 'error',
  refunded: 'muted',
  partially_refunded: 'warning',
  credited: 'success',
  skipped: 'muted',

  // Project/Task statuses
  draft: 'muted',
  active: 'success',
  live: 'success',
  paused: 'warning',
  on_hold: 'warning',
  archived: 'muted',
  closed: 'muted',
  voided: 'muted',

  // User/Account statuses
  online: 'success',
  away: 'warning',
  offline: 'muted',
  busy: 'error',

  // Connection statuses
  connected: 'success',
  disconnected: 'muted',
  error: 'error',

  // Priority levels
  urgent: 'error',
  high: 'warning',
  normal: 'info',
  low: 'muted',

  // Review/Approval statuses
  approved: 'success',
  rejected: 'error',
  needs_review: 'warning',
  pending_review: 'warning',
  changes_requested: 'warning',

  // E-Sign statuses
  sent: 'info',
  viewed: 'info',
  signed: 'success',
  declined: 'error',

  // Shipping statuses
  shipped: 'info',
  delivered: 'success',
  returned: 'warning',
  lost: 'error',
  not_shipped: 'muted',

  // Subscription statuses
  trial: 'info',
  trialing: 'info',
  active_subscription: 'success',
  past_due: 'error',
  unpaid: 'error',
  expired: 'muted',

  // Content statuses
  published: 'success',
  scheduled: 'info',
  unpublished: 'muted',

  // Feature flags
  enabled: 'success',
  disabled: 'muted',

  // Video/Upload statuses
  uploading: 'info',
  ready: 'success',
  deleted: 'muted',

  // Generic
  new: 'info',
  open: 'info',
  resolved: 'success',
  blocked: 'error',
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Status string - automatically maps to appropriate variant */
  status?: string
  /** Override the display label (defaults to formatted status) */
  label?: string
  /** Show a colored dot indicator */
  showDot?: boolean
  /** Custom dot color (CSS color value) */
  dotColor?: string
  /** Optional children to render before the label (e.g., icons) */
  children?: React.ReactNode
}

/**
 * Format status string for display
 * Converts snake_case/kebab-case to Title Case
 */
function formatStatus(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Get variant from status string
 */
function getVariantFromStatus(status?: string): VariantProps<typeof statusBadgeVariants>['variant'] {
  if (!status) return 'default'
  const normalizedStatus = status.toLowerCase().replace(/[- ]/g, '_')
  return statusVariantMap[normalizedStatus] || 'default'
}

/**
 * Get dot color from variant
 */
function getDotColor(variant: VariantProps<typeof statusBadgeVariants>['variant']): string {
  switch (variant) {
    case 'success':
      return 'hsl(var(--success, 152 45% 42%))'
    case 'warning':
      return 'hsl(var(--warning, 38 75% 50%))'
    case 'error':
      return 'hsl(var(--destructive, 0 65% 55%))'
    case 'info':
      return 'hsl(var(--info, 210 55% 50%))'
    case 'muted':
    case 'ghost':
      return 'hsl(var(--muted-foreground))'
    default:
      return 'hsl(var(--primary))'
  }
}

function StatusBadge({
  className,
  variant,
  size,
  status,
  label,
  showDot = false,
  dotColor,
  children,
  ...props
}: StatusBadgeProps) {
  // Determine variant from status if not explicitly provided
  const effectiveVariant = variant || getVariantFromStatus(status)

  // Determine label
  const displayLabel = label || (status ? formatStatus(status) : 'Unknown')

  // Determine dot color
  const effectiveDotColor = dotColor || getDotColor(effectiveVariant)

  return (
    <div
      className={cn(statusBadgeVariants({ variant: effectiveVariant, size, dot: showDot }), className)}
      {...props}
    >
      {showDot && (
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: effectiveDotColor }}
          aria-hidden="true"
        />
      )}
      {children}
      {displayLabel}
    </div>
  )
}

export { StatusBadge, statusBadgeVariants, statusVariantMap, formatStatus, getVariantFromStatus }
