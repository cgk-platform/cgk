'use client'

import * as React from 'react'

/**
 * Tenant context for React components
 *
 * Provides tenant switching functionality and current tenant state.
 * Fetches tenant list from server and manages switching.
 */

export interface TenantInfo {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  role: string
  isDefault: boolean
  lastActiveAt: Date | null
}

export interface TenantContextValue {
  /** Currently active tenant */
  currentTenant: TenantInfo | null
  /** All tenants the user has access to */
  availableTenants: TenantInfo[]
  /** Whether tenant data is loading */
  isLoading: boolean
  /** Whether a switch is in progress */
  isSwitching: boolean
  /** Error from last operation */
  error: string | null
  /** Switch to a different tenant */
  switchTenant: (slug: string) => Promise<void>
  /** Set a tenant as default */
  setDefaultTenant: (tenantId: string) => Promise<void>
  /** Refresh tenant list from server */
  refresh: () => Promise<void>
  /** Whether user has multiple tenants */
  hasMultipleTenants: boolean
}

const TenantContext = React.createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  /** Initial current tenant (from server) */
  initialTenant?: TenantInfo | null
  /** Initial tenant list (from server) */
  initialTenants?: TenantInfo[]
  /** API endpoint to fetch tenants */
  tenantsUrl?: string
  /** API endpoint to switch tenant */
  switchUrl?: string
  /** API endpoint to set default */
  defaultUrl?: string
  /** Callback after successful switch */
  onSwitch?: (tenant: TenantInfo) => void
  /** Children */
  children: React.ReactNode
}

/**
 * Tenant context provider
 *
 * @example
 * // In layout
 * <TenantProvider
 *   initialTenant={currentTenant}
 *   initialTenants={userTenants}
 *   onSwitch={(tenant) => router.refresh()}
 * >
 *   <App />
 * </TenantProvider>
 */
export function TenantProvider({
  initialTenant = null,
  initialTenants = [],
  tenantsUrl = '/api/auth/context/tenants',
  switchUrl = '/api/auth/context/switch',
  defaultUrl = '/api/auth/context/default',
  onSwitch,
  children,
}: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = React.useState<TenantInfo | null>(initialTenant)
  const [availableTenants, setAvailableTenants] = React.useState<TenantInfo[]>(initialTenants)
  const [isLoading, setIsLoading] = React.useState(initialTenants.length === 0)
  const [isSwitching, setIsSwitching] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(tenantsUrl)
      if (response.ok) {
        const data = await response.json()
        setAvailableTenants(data.tenants || [])
        if (data.current) {
          setCurrentTenant(data.current)
        }
      } else {
        setError('Failed to fetch tenants')
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err)
      setError('Failed to fetch tenants')
    } finally {
      setIsLoading(false)
    }
  }, [tenantsUrl])

  // Fetch tenants on mount if not provided
  React.useEffect(() => {
    if (initialTenants.length === 0) {
      refresh()
    }
  }, [initialTenants.length, refresh])

  const switchTenant = React.useCallback(
    async (slug: string) => {
      setIsSwitching(true)
      setError(null)
      try {
        const response = await fetch(switchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetTenantSlug: slug }),
        })

        if (response.ok) {
          const data = await response.json()
          const newTenant = availableTenants.find((t) => t.slug === slug)
          if (newTenant) {
            setCurrentTenant(newTenant)
            onSwitch?.(newTenant)
          } else if (data.tenant) {
            setCurrentTenant(data.tenant)
            onSwitch?.(data.tenant)
          }
        } else {
          const data = await response.json().catch((parseError) => {
            console.warn('[tenant-context] Failed to parse switch response:', parseError)
            return {}
          })
          setError(data.error || 'Failed to switch tenant')
          throw new Error(data.error || 'Failed to switch tenant')
        }
      } catch (err) {
        console.error('Failed to switch tenant:', err)
        if (err instanceof Error && !error) {
          setError(err.message)
        }
        throw err
      } finally {
        setIsSwitching(false)
      }
    },
    [switchUrl, availableTenants, onSwitch, error]
  )

  const setDefaultTenantFn = React.useCallback(
    async (tenantId: string) => {
      setError(null)
      try {
        const response = await fetch(defaultUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        })

        if (response.ok) {
          // Update local state
          setAvailableTenants((prev) =>
            prev.map((t) => ({
              ...t,
              isDefault: t.id === tenantId,
            }))
          )
          if (currentTenant?.id === tenantId) {
            setCurrentTenant((prev) => (prev ? { ...prev, isDefault: true } : prev))
          }
        } else {
          const data = await response.json().catch((parseError) => {
            console.warn('[tenant-context] Failed to parse default response:', parseError)
            return {}
          })
          setError(data.error || 'Failed to set default tenant')
          throw new Error(data.error || 'Failed to set default tenant')
        }
      } catch (err) {
        console.error('Failed to set default tenant:', err)
        throw err
      }
    },
    [defaultUrl, currentTenant?.id]
  )

  const hasMultipleTenants = availableTenants.length > 1

  const value = React.useMemo(
    () => ({
      currentTenant,
      availableTenants,
      isLoading,
      isSwitching,
      error,
      switchTenant,
      setDefaultTenant: setDefaultTenantFn,
      refresh,
      hasMultipleTenants,
    }),
    [
      currentTenant,
      availableTenants,
      isLoading,
      isSwitching,
      error,
      switchTenant,
      setDefaultTenantFn,
      refresh,
      hasMultipleTenants,
    ]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

/**
 * Hook to access tenant context
 *
 * @throws Error if used outside TenantProvider
 */
export function useTenant(): TenantContextValue {
  const context = React.useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

/**
 * Hook to safely access tenant context without throwing
 *
 * Returns null if TenantProvider is not present in the component tree.
 * Useful for components that may be used both inside and outside a TenantProvider.
 *
 * @example
 * function Header() {
 *   const tenant = useTenantOptional()
 *   if (!tenant) {
 *     return <DefaultHeader />
 *   }
 *   return <TenantHeader tenant={tenant.currentTenant} />
 * }
 */
export function useTenantOptional(): TenantContextValue | null {
  return React.useContext(TenantContext)
}

/**
 * Hook to get current tenant (nullable)
 */
export function useCurrentTenant(): TenantInfo | null {
  const { currentTenant } = useTenant()
  return currentTenant
}

/**
 * Hook to get all available tenants
 */
export function useAvailableTenants(): TenantInfo[] {
  const { availableTenants } = useTenant()
  return availableTenants
}

/**
 * Hook to check if user has access to multiple tenants
 */
export function useHasMultipleTenants(): boolean {
  const { hasMultipleTenants } = useTenant()
  return hasMultipleTenants
}
