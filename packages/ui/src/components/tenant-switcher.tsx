'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'
import { useTenant, type TenantInfo } from '../context/tenant-context'

/**
 * Role badge color map
 */
const roleBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
  {
    variants: {
      role: {
        owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        member: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        creator: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        super_admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      },
    },
    defaultVariants: {
      role: 'member',
    },
  }
)

interface RoleBadgeProps extends VariantProps<typeof roleBadgeVariants> {
  children: React.ReactNode
  className?: string
}

function RoleBadge({ role, children, className }: RoleBadgeProps) {
  return (
    <span className={cn(roleBadgeVariants({ role }), className)}>
      {children}
    </span>
  )
}

/**
 * Tenant logo component with fallback
 */
interface TenantLogoProps {
  tenant: TenantInfo
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function TenantLogo({ tenant, size = 'md', className }: TenantLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  if (tenant.logoUrl) {
    return (
      <img
        src={tenant.logoUrl}
        alt={tenant.name}
        className={cn(
          'rounded-md object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  // Fallback to initials
  const initials = tenant.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}

/**
 * Tenant switcher dropdown variant props
 */
export interface TenantSwitcherProps {
  /** Visual variant */
  variant?: 'dropdown' | 'compact'
  /** Additional class names */
  className?: string
  /** Max height before scroll */
  maxHeight?: number
  /** Show search when tenant count exceeds this */
  searchThreshold?: number
}

/**
 * Tenant Switcher Component
 *
 * Dropdown for switching between tenants the user has access to.
 * Shows current tenant as trigger, with list of available tenants.
 *
 * @example
 * <TenantSwitcher />
 *
 * @example
 * <TenantSwitcher variant="compact" searchThreshold={3} />
 */
export function TenantSwitcher({
  variant = 'dropdown',
  className,
  maxHeight = 320,
  searchThreshold = 5,
}: TenantSwitcherProps) {
  const {
    currentTenant,
    availableTenants,
    isSwitching,
    hasMultipleTenants,
    switchTenant,
    setDefaultTenant,
  } = useTenant()

  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when opening
  React.useEffect(() => {
    if (isOpen && availableTenants.length >= searchThreshold) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen, availableTenants.length, searchThreshold])

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Filter tenants by search query
  const filteredTenants = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTenants
    }
    const query = searchQuery.toLowerCase()
    return availableTenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query)
    )
  }, [availableTenants, searchQuery])

  const handleSwitch = async (tenant: TenantInfo) => {
    if (tenant.id === currentTenant?.id) {
      setIsOpen(false)
      return
    }

    try {
      await switchTenant(tenant.slug)
      setIsOpen(false)
      setSearchQuery('')
      // Reload to apply new context
      window.location.reload()
    } catch {
      // Error is handled in context
    }
  }

  const handleSetDefault = async (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation()
    try {
      await setDefaultTenant(tenantId)
    } catch {
      // Error is handled in context
    }
  }

  // Don't render if user only has one tenant
  if (!hasMultipleTenants || !currentTenant) {
    return null
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'compact' && 'px-2 py-1.5'
        )}
        aria-label="Switch tenant"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <TenantLogo tenant={currentTenant} size={variant === 'compact' ? 'sm' : 'md'} />
        <div className={cn('flex flex-col', variant === 'compact' && 'hidden sm:flex')}>
          <span className="text-sm font-medium leading-tight">{currentTenant.name}</span>
          {variant !== 'compact' && (
            <span className="text-xs text-muted-foreground">{currentTenant.slug}</span>
          )}
        </div>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="listbox"
          aria-label="Available tenants"
        >
          {/* Search */}
          {availableTenants.length >= searchThreshold && (
            <div className="border-b p-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-ring'
                  )}
                />
              </div>
            </div>
          )}

          {/* Tenant list */}
          <div
            className="overflow-y-auto p-1"
            style={{ maxHeight }}
          >
            {filteredTenants.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No tenants found
              </div>
            ) : (
              filteredTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSwitch(tenant)}
                  disabled={isSwitching}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                    'hover:bg-accent focus:bg-accent focus:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    tenant.id === currentTenant?.id && 'bg-accent'
                  )}
                  role="option"
                  aria-selected={tenant.id === currentTenant?.id}
                >
                  <TenantLogo tenant={tenant} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{tenant.name}</span>
                      {tenant.isDefault && (
                        <StarIcon className="h-3.5 w-3.5 flex-shrink-0 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={tenant.role as 'owner' | 'admin' | 'member' | 'creator'}>
                        {tenant.role}
                      </RoleBadge>
                    </div>
                  </div>
                  {tenant.id === currentTenant?.id && (
                    <CheckIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with set default option */}
          {currentTenant && !currentTenant.isDefault && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={(e) => handleSetDefault(e, currentTenant.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'focus:bg-accent focus:outline-none'
                )}
              >
                <StarIcon className="h-4 w-4" />
                Set as default
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Icons (inline to avoid dependencies)

function ChevronDownIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
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
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export { RoleBadge, TenantLogo, roleBadgeVariants }
