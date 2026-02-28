'use client'

import * as React from 'react'

import { cn } from '../utils/cn'

/**
 * Tenant info for super admin selection
 */
export interface SuperAdminTenant {
  id: string
  slug: string
  name: string
  status: string
}

/**
 * Super Admin Tenant Selector Props
 */
export interface SuperAdminTenantSelectorProps {
  /** Current tenant slug from JWT (null if no context) */
  currentTenantSlug: string | null
  /** Additional class names */
  className?: string
  /** Max height before scroll */
  maxHeight?: number
}

/**
 * Super Admin Tenant Selector Component
 *
 * Allows super admins to select which tenant context to work in.
 * Fetches all active organizations and calls the switchTenantContext API.
 *
 * @example
 * <SuperAdminTenantSelector currentTenantSlug={tenantSlug} />
 */
export function SuperAdminTenantSelector({
  currentTenantSlug,
  className,
  maxHeight = 320,
}: SuperAdminTenantSelectorProps) {
  const [tenants, setTenants] = React.useState<SuperAdminTenant[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSwitching, setIsSwitching] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch all tenants on mount
  React.useEffect(() => {
    async function fetchTenants() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/platform/tenants')

        if (!response.ok) {
          throw new Error('Failed to fetch tenants')
        }

        const data = (await response.json()) as { tenants: SuperAdminTenant[] }
        setTenants(data.tenants || [])
        setError(null)
      } catch (err) {
        console.error('Failed to fetch tenants:', err)
        setError('Failed to load tenants')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchTenants()
  }, [])

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
    if (isOpen && tenants.length >= 5) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen, tenants.length])

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
      return tenants
    }
    const query = searchQuery.toLowerCase()
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
    )
  }, [tenants, searchQuery])

  // Get current tenant name
  const currentTenant = React.useMemo(() => {
    return tenants.find((t) => t.slug === currentTenantSlug)
  }, [tenants, currentTenantSlug])

  const handleSwitch = async (tenant: SuperAdminTenant) => {
    if (tenant.slug === currentTenantSlug) {
      setIsOpen(false)
      return
    }

    try {
      setIsSwitching(true)

      const response = await fetch('/api/auth/context/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTenantSlug: tenant.slug }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Failed to switch tenant')
      }

      // Success - reload to apply new JWT
      window.location.reload()
    } catch (err) {
      console.error('Failed to switch tenant:', err)
      alert(err instanceof Error ? err.message : 'Failed to switch tenant')
      setIsSwitching(false)
    }
  }

  const handleClearContext = async () => {
    if (!currentTenantSlug) {
      setIsOpen(false)
      return
    }

    try {
      setIsSwitching(true)

      const response = await fetch('/api/auth/context/clear', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clear tenant context')
      }

      // Success - reload to apply changes
      window.location.reload()
    } catch (err) {
      console.error('Failed to clear context:', err)
      alert('Failed to clear tenant context')
      setIsSwitching(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('text-muted-foreground flex items-center gap-2 text-sm', className)}>
        <LoadingIcon className="h-4 w-4 animate-spin" />
        Loading tenants...
      </div>
    )
  }

  if (error) {
    return <div className={cn('text-destructive text-sm', className)}>{error}</div>
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'bg-background flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
          'hover:bg-accent focus:ring-ring focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Select tenant context"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <BuildingIcon className="text-muted-foreground h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Tenant Context</span>
          <span className="text-sm font-medium leading-tight">
            {currentTenant ? currentTenant.name : 'No tenant selected'}
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            'text-muted-foreground ml-auto h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'bg-popover absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="listbox"
          aria-label="Available tenants"
        >
          {/* Search */}
          {tenants.length >= 5 && (
            <div className="border-b p-2">
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'bg-background w-full rounded-md border py-2 pl-8 pr-3 text-sm',
                    'placeholder:text-muted-foreground',
                    'focus:ring-ring focus:outline-none focus:ring-1'
                  )}
                />
              </div>
            </div>
          )}

          {/* Tenant list */}
          <div className="overflow-y-auto p-1" style={{ maxHeight }}>
            {filteredTenants.length === 0 ? (
              <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                No tenants found
              </div>
            ) : (
              filteredTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => void handleSwitch(tenant)}
                  disabled={isSwitching}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                    'hover:bg-accent focus:bg-accent focus:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    tenant.slug === currentTenantSlug && 'bg-accent'
                  )}
                  role="option"
                  aria-selected={tenant.slug === currentTenantSlug}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{tenant.name}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">{tenant.slug}</div>
                  </div>
                  {tenant.slug === currentTenantSlug && (
                    <CheckIcon className="text-primary h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer - Clear context option */}
          {currentTenantSlug && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => void handleClearContext()}
                disabled={isSwitching}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'focus:bg-accent focus:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <XIcon className="h-4 w-4" />
                Clear tenant context
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

function XIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function LoadingIcon({ className }: { className?: string }) {
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
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}
