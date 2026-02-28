'use client'

import { cn } from '../utils/cn'

/**
 * Tenant Context Badge Props
 */
export interface TenantContextBadgeProps {
  /** Current tenant name (null if no context) */
  tenantName: string | null
  /** Current tenant slug (null if no context) */
  tenantSlug: string | null
  /** Additional class names */
  className?: string
  /** Position - defaults to bottom-right */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

/**
 * Tenant Context Badge Component
 *
 * Visual indicator showing current tenant context for super admins.
 * Fixed position badge that only appears when tenant context is set.
 *
 * @example
 * <TenantContextBadge tenantName="Meliusly" tenantSlug="meliusly" />
 *
 * @example
 * <TenantContextBadge tenantName="Meliusly" tenantSlug="meliusly" position="bottom-left" />
 */
export function TenantContextBadge({
  tenantName,
  tenantSlug,
  className,
  position = 'bottom-right',
}: TenantContextBadgeProps) {
  // Don't render if no tenant context
  if (!tenantName || !tenantSlug) {
    return null
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  return (
    <div
      className={cn(
        'border-gold/20 bg-gold/10 fixed z-40 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm',
        positionClasses[position],
        className
      )}
      role="status"
      aria-label={`Current tenant: ${tenantName}`}
    >
      <div className="flex items-center gap-2">
        <BuildingIcon className="text-gold h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-gold/70 text-[10px] font-medium uppercase tracking-wide">
            Tenant Context
          </span>
          <span className="text-gold text-sm font-semibold">{tenantName}</span>
        </div>
      </div>
    </div>
  )
}

// Icon component
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}
