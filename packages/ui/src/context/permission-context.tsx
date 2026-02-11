'use client'

import * as React from 'react'

/**
 * Permission context for React components
 *
 * Provides permission checking hooks and components for the UI layer.
 * Permissions are fetched from the server and cached in context.
 */

interface PermissionContextValue {
  /** User's effective permissions */
  permissions: string[]
  /** Whether permissions are still loading */
  isLoading: boolean
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean
  /** Refresh permissions from server */
  refresh: () => Promise<void>
}

const PermissionContext = React.createContext<PermissionContextValue | null>(null)

/**
 * Check if user has a specific permission
 * Implements wildcard matching on the client side
 */
function checkPermission(userPermissions: string[], required: string): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false
  }

  // Exact match
  if (userPermissions.includes(required)) {
    return true
  }

  // Full wildcard
  if (userPermissions.includes('*')) {
    return true
  }

  // Parse required permission
  const parts = required.split('.')
  if (parts.length < 2) {
    return false
  }

  const category = parts[0]
  const action = parts.slice(1).join('.')

  // Category wildcard: "orders.*"
  if (userPermissions.includes(`${category}.*`)) {
    return true
  }

  // Action wildcard: "*.view"
  if (parts.length === 2 && userPermissions.includes(`*.${action}`)) {
    return true
  }

  // Nested category wildcard: "creators.*" matches "creators.payments.approve"
  if (parts.length > 2) {
    const topCategory = parts[0]
    if (userPermissions.includes(`${topCategory}.*`)) {
      return true
    }
  }

  return false
}

interface PermissionProviderProps {
  /** Initial permissions (from server) */
  initialPermissions?: string[]
  /** API endpoint to fetch permissions */
  fetchUrl?: string
  /** Children */
  children: React.ReactNode
}

/**
 * Permission context provider
 *
 * @example
 * // In layout
 * <PermissionProvider initialPermissions={userPermissions}>
 *   <App />
 * </PermissionProvider>
 */
export function PermissionProvider({
  initialPermissions = [],
  fetchUrl = '/api/auth/permissions',
  children,
}: PermissionProviderProps) {
  const [permissions, setPermissions] = React.useState<string[]>(initialPermissions)
  const [isLoading, setIsLoading] = React.useState(initialPermissions.length === 0)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(fetchUrl)
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchUrl])

  // Fetch permissions on mount if not provided
  React.useEffect(() => {
    if (initialPermissions.length === 0) {
      refresh()
    }
  }, [initialPermissions.length, refresh])

  const hasPermission = React.useCallback(
    (permission: string) => checkPermission(permissions, permission),
    [permissions]
  )

  const hasAnyPermission = React.useCallback(
    (requiredPermissions: string[]) =>
      requiredPermissions.some((p) => checkPermission(permissions, p)),
    [permissions]
  )

  const hasAllPermissions = React.useCallback(
    (requiredPermissions: string[]) =>
      requiredPermissions.every((p) => checkPermission(permissions, p)),
    [permissions]
  )

  const value = React.useMemo(
    () => ({
      permissions,
      isLoading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refresh,
    }),
    [permissions, isLoading, hasPermission, hasAnyPermission, hasAllPermissions, refresh]
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

/**
 * Hook to access permission context
 *
 * @throws Error if used outside PermissionProvider
 */
export function usePermissions(): PermissionContextValue {
  const context = React.useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

/**
 * Hook to check a single permission
 *
 * @example
 * const canEditOrders = useHasPermission('orders.manage')
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission, isLoading } = usePermissions()

  if (isLoading) {
    return false
  }

  return hasPermission(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission, isLoading } = usePermissions()

  if (isLoading) {
    return false
  }

  return hasAnyPermission(permissions)
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions, isLoading } = usePermissions()

  if (isLoading) {
    return false
  }

  return hasAllPermissions(permissions)
}

interface PermissionGateProps {
  /** Permission(s) required - if array, user needs ANY of them */
  permission: string | string[]
  /** Whether to require ALL permissions when array is provided */
  requireAll?: boolean
  /** Fallback to render when permission is denied */
  fallback?: React.ReactNode
  /** Children to render when permission is granted */
  children: React.ReactNode
}

/**
 * Component to conditionally render based on permissions
 *
 * @example
 * <PermissionGate permission="orders.manage">
 *   <EditOrderButton />
 * </PermissionGate>
 *
 * @example
 * <PermissionGate permission={['orders.view', 'orders.manage']}>
 *   <OrderList />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  const permissions = Array.isArray(permission) ? permission : [permission]
  let hasAccess: boolean

  if (permissions.length === 1 && permissions[0] !== undefined) {
    hasAccess = hasPermission(permissions[0])
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissions)
  } else {
    hasAccess = hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Higher-order component to wrap a component with permission check
 *
 * @example
 * const ProtectedButton = withPermission('orders.manage')(EditOrderButton)
 */
export function withPermission<P extends object>(
  permission: string | string[],
  Fallback?: React.ComponentType
) {
  return function withPermissionHOC(
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    function PermissionWrappedComponent(props: P) {
      return (
        <PermissionGate
          permission={permission}
          fallback={Fallback ? <Fallback /> : null}
        >
          <Component {...props} />
        </PermissionGate>
      )
    }

    PermissionWrappedComponent.displayName = `withPermission(${
      Component.displayName || Component.name || 'Component'
    })`

    return PermissionWrappedComponent
  }
}
