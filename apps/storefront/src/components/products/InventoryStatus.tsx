/**
 * InventoryStatus Component
 *
 * Displays product stock status with visual indicators.
 * Supports various display modes for different contexts.
 */

import { cn } from '@cgk/ui'

interface InventoryStatusProps {
  /** Number of items in stock (undefined means unknown) */
  quantity?: number
  /** Whether the product is available for sale */
  availableForSale: boolean
  /** Display mode */
  mode?: 'badge' | 'inline' | 'detailed'
  /** Show exact quantity (only when quantity > 0 and <= lowStockThreshold) */
  showExactQuantity?: boolean
  /** Threshold for "low stock" warning */
  lowStockThreshold?: number
  /** Custom class name */
  className?: string
}

export function InventoryStatus({
  quantity,
  availableForSale,
  mode = 'inline',
  showExactQuantity = true,
  lowStockThreshold = 10,
  className,
}: InventoryStatusProps) {
  // Determine stock status
  const getStatus = (): {
    label: string
    color: 'green' | 'amber' | 'red' | 'gray'
    icon: 'check' | 'warning' | 'x' | 'clock'
  } => {
    if (!availableForSale) {
      return { label: 'Out of Stock', color: 'red', icon: 'x' }
    }

    if (quantity === undefined) {
      return { label: 'In Stock', color: 'green', icon: 'check' }
    }

    if (quantity <= 0) {
      return { label: 'Out of Stock', color: 'red', icon: 'x' }
    }

    if (quantity <= lowStockThreshold) {
      const label =
        showExactQuantity && quantity <= 5
          ? `Only ${quantity} left`
          : 'Low Stock'
      return { label, color: 'amber', icon: 'warning' }
    }

    return { label: 'In Stock', color: 'green', icon: 'check' }
  }

  const status = getStatus()

  const colorClasses = {
    green: {
      badge: 'bg-green-50 text-green-700 ring-green-600/20',
      dot: 'bg-green-500',
      text: 'text-green-700',
      icon: 'text-green-500',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      dot: 'bg-amber-500',
      text: 'text-amber-700',
      icon: 'text-amber-500',
    },
    red: {
      badge: 'bg-red-50 text-red-700 ring-red-600/20',
      dot: 'bg-red-500',
      text: 'text-red-700',
      icon: 'text-red-500',
    },
    gray: {
      badge: 'bg-gray-50 text-gray-600 ring-gray-500/20',
      dot: 'bg-gray-400',
      text: 'text-gray-600',
      icon: 'text-gray-400',
    },
  }[status.color]

  const Icon = {
    check: CheckIcon,
    warning: WarningIcon,
    x: XIcon,
    clock: ClockIcon,
  }[status.icon]

  if (mode === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
          colorClasses.badge,
          className
        )}
        role="status"
        aria-label={`Stock status: ${status.label}`}
      >
        <Icon className="h-3 w-3" />
        {status.label}
      </span>
    )
  }

  if (mode === 'detailed') {
    return (
      <div
        className={cn('flex items-start gap-3 rounded-lg border p-3', className)}
        role="status"
        aria-label={`Stock status: ${status.label}`}
      >
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
            status.color === 'green' && 'bg-green-100',
            status.color === 'amber' && 'bg-amber-100',
            status.color === 'red' && 'bg-red-100',
            status.color === 'gray' && 'bg-gray-100'
          )}
        >
          <Icon className={cn('h-4 w-4', colorClasses.icon)} />
        </div>
        <div className="flex-1">
          <p className={cn('text-sm font-medium', colorClasses.text)}>
            {status.label}
          </p>
          {status.color === 'amber' && quantity !== undefined && quantity > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Order soon - selling fast
            </p>
          )}
          {status.color === 'red' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Notify me when available
            </p>
          )}
          {status.color === 'green' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Usually ships within 24 hours
            </p>
          )}
        </div>
      </div>
    )
  }

  // Default: inline mode
  return (
    <div
      className={cn('flex items-center gap-2 text-sm', className)}
      role="status"
      aria-label={`Stock status: ${status.label}`}
    >
      <span className={cn('h-2 w-2 rounded-full', colorClasses.dot)} />
      <span className={colorClasses.text}>{status.label}</span>
    </div>
  )
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

export default InventoryStatus
