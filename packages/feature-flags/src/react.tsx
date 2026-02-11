/**
 * Feature Flags React SDK
 *
 * React hooks and context for consuming feature flags in client components.
 */

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { BulkEvaluationResult, EvaluationContext, EvaluationResult } from './types.js'

/**
 * Flag context value
 */
interface FlagContextValue {
  /** All evaluated flags */
  flags: Record<string, EvaluationResult>
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refresh flags from server */
  refresh: () => Promise<void>
  /** Check if a flag is enabled */
  isEnabled: (key: string) => boolean
  /** Get variant for a flag */
  getVariant: (key: string) => string | undefined
  /** Get full evaluation result */
  getFlag: (key: string) => EvaluationResult | undefined
}

const FlagContext = createContext<FlagContextValue | null>(null)

/**
 * Flag provider props
 */
export interface FlagProviderProps {
  children: ReactNode
  /** Evaluation context (tenant, user) */
  context?: EvaluationContext
  /** Initial flags (from SSR) */
  initialFlags?: Record<string, EvaluationResult>
  /** API endpoint for fetching flags */
  apiEndpoint?: string
  /** Auto-refresh interval in ms (default: none) */
  refreshInterval?: number
  /** Callback when flags are loaded */
  onLoad?: (flags: Record<string, EvaluationResult>) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

/**
 * Feature Flag Provider
 *
 * Wrap your app with this to enable feature flag hooks.
 *
 * @example
 * ```tsx
 * // In layout.tsx or app root
 * export default function Layout({ children }) {
 *   const flags = await evaluateAllFlags({ tenantId: 'rawdog' })
 *
 *   return (
 *     <FlagProvider initialFlags={flags.results} context={{ tenantId: 'rawdog' }}>
 *       {children}
 *     </FlagProvider>
 *   )
 * }
 * ```
 */
export function FlagProvider({
  children,
  context,
  initialFlags = {},
  apiEndpoint = '/api/platform/flags/evaluate',
  refreshInterval,
  onLoad,
  onError,
}: FlagProviderProps) {
  const [flags, setFlags] = useState<Record<string, EvaluationResult>>(initialFlags)
  const [isLoading, setIsLoading] = useState(Object.keys(initialFlags).length === 0)
  const [error, setError] = useState<Error | null>(null)

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.statusText}`)
      }

      const data = (await response.json()) as BulkEvaluationResult
      setFlags(data.results)
      onLoad?.(data.results)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [apiEndpoint, context, onLoad, onError])

  // Initial fetch if no initial flags
  useEffect(() => {
    if (Object.keys(initialFlags).length === 0) {
      fetchFlags()
    }
  }, [fetchFlags, initialFlags])

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(fetchFlags, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchFlags, refreshInterval])

  const isEnabled = useCallback(
    (key: string): boolean => {
      return flags[key]?.enabled ?? false
    },
    [flags]
  )

  const getVariant = useCallback(
    (key: string): string | undefined => {
      return flags[key]?.variant
    },
    [flags]
  )

  const getFlag = useCallback(
    (key: string): EvaluationResult | undefined => {
      return flags[key]
    },
    [flags]
  )

  const value = useMemo<FlagContextValue>(
    () => ({
      flags,
      isLoading,
      error,
      refresh: fetchFlags,
      isEnabled,
      getVariant,
      getFlag,
    }),
    [flags, isLoading, error, fetchFlags, isEnabled, getVariant, getFlag]
  )

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>
}

/**
 * Hook to access flag context
 */
export function useFlags(): FlagContextValue {
  const context = useContext(FlagContext)
  if (!context) {
    throw new Error('useFlags must be used within a FlagProvider')
  }
  return context
}

/**
 * Hook to check if a flag is enabled
 *
 * @example
 * ```tsx
 * function CheckoutButton() {
 *   const isNewCheckout = useFlag('checkout.new_flow')
 *
 *   if (isNewCheckout) {
 *     return <NewCheckoutButton />
 *   }
 *   return <LegacyCheckoutButton />
 * }
 * ```
 */
export function useFlag(key: string): boolean {
  const { isEnabled } = useFlags()
  return isEnabled(key)
}

/**
 * Hook to get a flag with loading state
 *
 * @example
 * ```tsx
 * function FeatureComponent() {
 *   const { enabled, loading } = useFlagWithLoading('new_feature')
 *
 *   if (loading) {
 *     return <Skeleton />
 *   }
 *
 *   if (!enabled) {
 *     return null
 *   }
 *
 *   return <NewFeature />
 * }
 * ```
 */
export function useFlagWithLoading(key: string): { enabled: boolean; loading: boolean } {
  const { isEnabled, isLoading } = useFlags()
  return {
    enabled: isEnabled(key),
    loading: isLoading,
  }
}

/**
 * Hook to get a variant
 *
 * @example
 * ```tsx
 * function CheckoutFlow() {
 *   const variant = useVariant('checkout.ab_test')
 *
 *   switch (variant) {
 *     case 'v2':
 *       return <CheckoutV2 />
 *     case 'v3':
 *       return <CheckoutV3 />
 *     default:
 *       return <CheckoutControl />
 *   }
 * }
 * ```
 */
export function useVariant(key: string): string | undefined {
  const { getVariant } = useFlags()
  return getVariant(key)
}

/**
 * Hook to get full evaluation result
 *
 * @example
 * ```tsx
 * function DebugFlag({ flagKey }) {
 *   const result = useFlagResult(flagKey)
 *
 *   return (
 *     <div>
 *       <p>Enabled: {result?.enabled ? 'Yes' : 'No'}</p>
 *       <p>Reason: {result?.reason}</p>
 *       <p>Variant: {result?.variant}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFlagResult(key: string): EvaluationResult | undefined {
  const { getFlag } = useFlags()
  return getFlag(key)
}

/**
 * Hook to get multiple flags
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const flags = useMultipleFlags(['ai_insights', 'realtime_updates'])
 *
 *   return (
 *     <div>
 *       {flags.ai_insights && <AIInsights />}
 *       {flags.realtime_updates && <RealtimeUpdates />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMultipleFlags(keys: string[]): Record<string, boolean> {
  const { isEnabled } = useFlags()

  return useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const key of keys) {
      result[key] = isEnabled(key)
    }
    return result
  }, [keys, isEnabled])
}

/**
 * Component that conditionally renders based on flag
 *
 * @example
 * ```tsx
 * <FeatureFlag flag="new_dashboard">
 *   <NewDashboard />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
}: {
  flag: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const enabled = useFlag(flag)

  if (!enabled) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component that renders based on variant
 *
 * @example
 * ```tsx
 * <VariantGate flag="checkout_flow" variant="v2">
 *   <CheckoutV2 />
 * </VariantGate>
 * ```
 */
export function VariantGate({
  flag,
  variant,
  children,
  fallback = null,
}: {
  flag: string
  variant: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const currentVariant = useVariant(flag)

  if (currentVariant !== variant) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook for flag loading state
 */
export function useFlagsLoading(): boolean {
  const { isLoading } = useFlags()
  return isLoading
}

/**
 * Hook for flag error state
 */
export function useFlagsError(): Error | null {
  const { error } = useFlags()
  return error
}

/**
 * Hook to refresh flags
 */
export function useRefreshFlags(): () => Promise<void> {
  const { refresh } = useFlags()
  return refresh
}
