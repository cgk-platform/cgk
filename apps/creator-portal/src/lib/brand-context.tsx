/**
 * Brand Context for Creator Portal
 *
 * Manages the currently selected brand for filtering dashboard data.
 * Creators can work with multiple brands, and this context allows them
 * to focus on one brand at a time or view all brands combined.
 */
'use client'

import * as React from 'react'

import type { BrandMembership, MembershipStatus } from './types'

// Cookie name for persisting selected brand
const SELECTED_BRAND_COOKIE = 'cgk_creator_selected_brand'

/**
 * Simplified brand info for context
 */
export interface BrandInfo {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  status: MembershipStatus
  balanceCents: number
}

/**
 * Brand context value
 */
export interface BrandContextValue {
  /** Currently selected brand (null = "All Brands") */
  selectedBrand: BrandInfo | null
  /** All available brands */
  availableBrands: BrandInfo[]
  /** Whether brands are loading */
  isLoading: boolean
  /** Whether we're switching brands */
  isSwitching: boolean
  /** Error message */
  error: string | null
  /** Select a specific brand */
  selectBrand: (brandSlug: string | null) => void
  /** Refresh brand list */
  refresh: () => Promise<void>
  /** Whether user has multiple brands */
  hasMultipleBrands: boolean
  /** Get the currently selected brand slug (for API calls) */
  getSelectedBrandSlug: () => string | null
  /** Get the currently selected brand ID (for API calls) */
  getSelectedBrandId: () => string | null
}

const BrandContext = React.createContext<BrandContextValue | null>(null)

interface BrandProviderProps {
  /** Initial brands from server */
  initialBrands?: BrandInfo[]
  /** Initial selected brand slug from cookie */
  initialSelectedSlug?: string | null
  children: React.ReactNode
}

/**
 * Get the selected brand slug from cookie
 */
function getSelectedBrandFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SELECTED_BRAND_COOKIE && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Set the selected brand slug in cookie
 */
function setSelectedBrandCookie(slug: string | null): void {
  if (typeof document === 'undefined') return

  if (slug === null) {
    // Clear the cookie
    document.cookie = `${SELECTED_BRAND_COOKIE}=; path=/; max-age=0; samesite=lax`
  } else {
    // Set cookie for 30 days
    const maxAge = 30 * 24 * 60 * 60
    document.cookie = `${SELECTED_BRAND_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${maxAge}; samesite=lax`
  }
}

/**
 * Convert BrandMembership to BrandInfo
 */
export function membershipToBrandInfo(membership: BrandMembership): BrandInfo {
  return {
    id: membership.brandId,
    slug: membership.brandSlug,
    name: membership.brandName,
    logoUrl: membership.brandLogo ?? null,
    status: membership.status,
    balanceCents: membership.balanceCents,
  }
}

/**
 * Brand context provider
 */
export function BrandProvider({
  initialBrands = [],
  initialSelectedSlug,
  children,
}: BrandProviderProps) {
  const [availableBrands, setAvailableBrands] = React.useState<BrandInfo[]>(initialBrands)
  const [isLoading, setIsLoading] = React.useState(initialBrands.length === 0)
  const [isSwitching, setIsSwitching] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Determine initial selected brand
  const [selectedBrand, setSelectedBrand] = React.useState<BrandInfo | null>(() => {
    if (!initialSelectedSlug) return null
    return initialBrands.find((b) => b.slug === initialSelectedSlug) || null
  })

  // On mount, check cookie and sync state
  React.useEffect(() => {
    const cookieSlug = getSelectedBrandFromCookie()
    if (cookieSlug && availableBrands.length > 0) {
      const brand = availableBrands.find((b) => b.slug === cookieSlug)
      if (brand) {
        setSelectedBrand(brand)
      } else {
        // Cookie references invalid brand, clear it
        setSelectedBrandCookie(null)
      }
    }
  }, [availableBrands])

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/creator/brands')
      if (response.ok) {
        const data = await response.json()
        const brands: BrandInfo[] = (data.memberships || []).map((m: BrandMembership) =>
          membershipToBrandInfo(m)
        )
        setAvailableBrands(brands)

        // Validate current selection
        if (selectedBrand) {
          const stillValid = brands.find((b) => b.id === selectedBrand.id)
          if (!stillValid) {
            setSelectedBrand(null)
            setSelectedBrandCookie(null)
          }
        }
      } else {
        setError('Failed to fetch brands')
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err)
      setError('Failed to fetch brands')
    } finally {
      setIsLoading(false)
    }
  }, [selectedBrand])

  // Fetch brands on mount if not provided
  React.useEffect(() => {
    if (initialBrands.length === 0) {
      refresh()
    }
  }, [initialBrands.length, refresh])

  const selectBrand = React.useCallback((brandSlug: string | null) => {
    setIsSwitching(true)

    if (brandSlug === null) {
      setSelectedBrand(null)
      setSelectedBrandCookie(null)
    } else {
      const brand = availableBrands.find((b) => b.slug === brandSlug)
      if (brand) {
        setSelectedBrand(brand)
        setSelectedBrandCookie(brandSlug)
      } else {
        setError('Brand not found')
      }
    }

    setIsSwitching(false)
  }, [availableBrands])

  const getSelectedBrandSlug = React.useCallback(() => {
    return selectedBrand?.slug ?? null
  }, [selectedBrand])

  const getSelectedBrandId = React.useCallback(() => {
    return selectedBrand?.id ?? null
  }, [selectedBrand])

  const hasMultipleBrands = availableBrands.length > 1

  const value = React.useMemo(
    () => ({
      selectedBrand,
      availableBrands,
      isLoading,
      isSwitching,
      error,
      selectBrand,
      refresh,
      hasMultipleBrands,
      getSelectedBrandSlug,
      getSelectedBrandId,
    }),
    [
      selectedBrand,
      availableBrands,
      isLoading,
      isSwitching,
      error,
      selectBrand,
      refresh,
      hasMultipleBrands,
      getSelectedBrandSlug,
      getSelectedBrandId,
    ]
  )

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

/**
 * Hook to access brand context
 * @throws Error if used outside BrandProvider
 */
export function useBrand(): BrandContextValue {
  const context = React.useContext(BrandContext)
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider')
  }
  return context
}

/**
 * Hook to safely access brand context without throwing
 */
export function useBrandOptional(): BrandContextValue | null {
  return React.useContext(BrandContext)
}

/**
 * Hook to get currently selected brand
 */
export function useSelectedBrand(): BrandInfo | null {
  const { selectedBrand } = useBrand()
  return selectedBrand
}

/**
 * Hook to get all available brands
 */
export function useAvailableBrands(): BrandInfo[] {
  const { availableBrands } = useBrand()
  return availableBrands
}

/**
 * Hook to check if user has multiple brands
 */
export function useHasMultipleBrands(): boolean {
  const { hasMultipleBrands } = useBrand()
  return hasMultipleBrands
}

/**
 * Utility to get brand slug from cookie (for server-side use)
 */
export function getSelectedBrandSlugFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SELECTED_BRAND_COOKIE && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

export { SELECTED_BRAND_COOKIE }
