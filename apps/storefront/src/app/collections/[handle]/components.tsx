/**
 * Collection Filter Wrapper (Client Component)
 *
 * Manages filter state from URL search params, renders the
 * ProductFilterSidebar alongside the product grid, and handles
 * mobile drawer for filters.
 */

'use client'

import type {
  CollectionFilterGroup,
  Product,
} from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { ProductFilterSidebar } from '@/components/products/filters'
import { ProductGrid } from '@/components/products'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionFilterWrapperProps {
  products: Product[]
  filters: CollectionFilterGroup[]
  totalCount: number
  hasNextPage: boolean
  handle: string
  currentSort: string
}

// ---------------------------------------------------------------------------
// URL Parameter Helpers
// ---------------------------------------------------------------------------

/**
 * Parse URL search params into the activeFilters map that
 * ProductFilterSidebar expects: Record<groupId, valueId[]>
 *
 * URL scheme:
 *   filter.v.option.<name>=<value>   -> variant option
 *   filter.v.price.min=N             -> price min
 *   filter.v.price.max=N             -> price max
 *   filter.v.availability=1          -> in-stock only
 *   filter.v.tag=<tag>               -> product tag
 *   filter.v.product_type=<type>     -> product type
 */
function parseActiveFilters(
  searchParams: URLSearchParams,
  filterGroups: CollectionFilterGroup[]
): Record<string, string[]> {
  const active: Record<string, string[]> = {}

  for (const group of filterGroups) {
    const groupActive: string[] = []

    for (const value of group.values) {
      const input = safeParseJSON(value.input)
      if (!input) continue

      if (input.variantOption) {
        const paramKey = `filter.v.option.${input.variantOption.name.toLowerCase()}`
        const paramValues = searchParams.getAll(paramKey)
        if (paramValues.includes(input.variantOption.value)) {
          groupActive.push(value.id)
        }
      } else if (input.available !== undefined) {
        const paramValue = searchParams.get('filter.v.availability')
        if (paramValue === '1' && input.available === true) {
          groupActive.push(value.id)
        }
        if (paramValue === '0' && input.available === false) {
          groupActive.push(value.id)
        }
      } else if (input.price) {
        const minParam = searchParams.get('filter.v.price.min')
        const maxParam = searchParams.get('filter.v.price.max')
        const inputMin = input.price.min?.toString()
        const inputMax = input.price.max?.toString()

        if (
          (minParam !== null && minParam === inputMin) ||
          (maxParam !== null && maxParam === inputMax)
        ) {
          // Check both min and max match if both are set
          const minMatch = inputMin === undefined || minParam === inputMin
          const maxMatch = inputMax === undefined || maxParam === inputMax
          if (minMatch && maxMatch) {
            groupActive.push(value.id)
          }
        }
      } else if (input.tag) {
        const tagValues = searchParams.getAll('filter.v.tag')
        if (tagValues.includes(input.tag)) {
          groupActive.push(value.id)
        }
      } else if (input.productType) {
        const typeValues = searchParams.getAll('filter.v.product_type')
        if (typeValues.includes(input.productType)) {
          groupActive.push(value.id)
        }
      }
    }

    if (groupActive.length > 0) {
      active[group.id] = groupActive
    }
  }

  return active
}

/**
 * Build a new URLSearchParams with the given filter value toggled.
 */
function buildFilterParams(
  currentParams: URLSearchParams,
  filterGroups: CollectionFilterGroup[],
  groupId: string,
  valueId: string,
  checked: boolean
): URLSearchParams {
  const params = new URLSearchParams(currentParams.toString())

  // Find the filter value to get its input JSON
  const group = filterGroups.find((g) => g.id === groupId)
  const value = group?.values.find((v) => v.id === valueId)
  if (!value) return params

  const input = safeParseJSON(value.input)
  if (!input) return params

  if (input.variantOption) {
    const paramKey = `filter.v.option.${input.variantOption.name.toLowerCase()}`
    const existing = params.getAll(paramKey)

    // Remove all and re-add with toggle
    params.delete(paramKey)
    if (checked) {
      for (const v of existing) params.append(paramKey, v)
      params.append(paramKey, input.variantOption.value)
    } else {
      for (const v of existing) {
        if (v !== input.variantOption.value) {
          params.append(paramKey, v)
        }
      }
    }
  } else if (input.available !== undefined) {
    if (checked) {
      params.set('filter.v.availability', input.available ? '1' : '0')
    } else {
      params.delete('filter.v.availability')
    }
  } else if (input.price) {
    if (checked) {
      if (input.price.min !== undefined) {
        params.set('filter.v.price.min', input.price.min.toString())
      }
      if (input.price.max !== undefined) {
        params.set('filter.v.price.max', input.price.max.toString())
      }
    } else {
      params.delete('filter.v.price.min')
      params.delete('filter.v.price.max')
    }
  } else if (input.tag) {
    const paramKey = 'filter.v.tag'
    const existing = params.getAll(paramKey)
    params.delete(paramKey)
    if (checked) {
      for (const v of existing) params.append(paramKey, v)
      params.append(paramKey, input.tag)
    } else {
      for (const v of existing) {
        if (v !== input.tag) params.append(paramKey, v)
      }
    }
  } else if (input.productType) {
    const paramKey = 'filter.v.product_type'
    const existing = params.getAll(paramKey)
    params.delete(paramKey)
    if (checked) {
      for (const v of existing) params.append(paramKey, v)
      params.append(paramKey, input.productType)
    } else {
      for (const v of existing) {
        if (v !== input.productType) params.append(paramKey, v)
      }
    }
  }

  // Reset page on filter change
  params.delete('page')

  return params
}

/**
 * Parsed filter input from Shopify's filter value JSON.
 * Each filter value has exactly one of these fields set.
 */
interface ParsedFilterInput {
  variantOption?: { name: string; value: string }
  price?: { min?: number; max?: number }
  available?: boolean
  tag?: string
  productType?: string
}

function safeParseJSON(str: string): ParsedFilterInput | null {
  try {
    return JSON.parse(str) as ParsedFilterInput
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Sort Controls
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title-asc', label: 'Name: A-Z' },
  { value: 'title-desc', label: 'Name: Z-A' },
] as const

function SortSelect({
  currentSort,
  pathname,
  searchParams,
}: {
  currentSort: string
  pathname: string
  searchParams: ReturnType<typeof useSearchParams>
}) {
  const router = useRouter()

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('sort', e.target.value)
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-gray-500">
        Sort by:
      </label>
      <select
        id="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="rounded-btn border border-gray-300 bg-white px-3 py-1.5 text-sm text-cgk-navy focus:border-cgk-navy focus:outline-none focus:ring-1 focus:ring-cgk-navy/20"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile Filter Drawer
// ---------------------------------------------------------------------------

function MobileFilterDrawer({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cgk-navy">
              Filters
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-cgk-navy"
              aria-label="Close filters"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Wrapper
// ---------------------------------------------------------------------------

export function CollectionFilterWrapper({
  products,
  filters,
  totalCount,
  hasNextPage,
  handle,
  currentSort,
}: CollectionFilterWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Compute active filters from URL
  const activeFilters = useMemo(
    () => parseActiveFilters(searchParams, filters),
    [searchParams, filters]
  )

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0),
    [activeFilters]
  )

  // Handle filter toggle
  const handleFilterChange = useCallback(
    (groupId: string, valueId: string, checked: boolean) => {
      const params = buildFilterParams(
        searchParams,
        filters,
        groupId,
        valueId,
        checked
      )
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, filters]
  )

  // Handle clear all filters
  const handleClearAll = useCallback(() => {
    const params = new URLSearchParams()
    // Keep sort if set
    const sort = searchParams.get('sort')
    if (sort) params.set('sort', sort)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [router, pathname, searchParams])

  const hasFilters = filters.length > 0

  // Build pagination URL preserving all current params
  const paginationUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    const currentPage = parseInt(params.get('page') || '1', 10)
    params.set('page', (currentPage + 1).toString())
    return `/collections/${handle}?${params.toString()}`
  }, [searchParams, handle])

  const sidebarContent = hasFilters ? (
    <ProductFilterSidebar
      filters={filters}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
      onClearAll={handleClearAll}
    />
  ) : null

  return (
    <div className="space-y-6">
      {/* Toolbar: Mobile filters button + sort + count */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          {/* Mobile filters toggle */}
          {hasFilters && (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-cgk-navy lg:hidden"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cgk-navy text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <p className="text-sm text-gray-500">
            {totalCount} product{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <SortSelect
          currentSort={currentSort}
          pathname={pathname}
          searchParams={searchParams}
        />
      </div>

      {/* Mobile Drawer */}
      {hasFilters && (
        <MobileFilterDrawer
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        >
          {sidebarContent}
        </MobileFilterDrawer>
      )}

      {/* Desktop: sidebar + grid layout */}
      <div className={cn('flex gap-8', hasFilters && 'lg:flex-row')}>
        {/* Desktop Sidebar */}
        {hasFilters && (
          <div className="hidden w-60 shrink-0 lg:block">
            {sidebarContent}
          </div>
        )}

        {/* Product Grid */}
        <div className="min-w-0 flex-1">
          {products.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <svg
                className="mb-4 h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h2 className="text-lg font-semibold text-cgk-navy">
                No products found
              </h2>
              <p className="mt-2 text-gray-500">
                Try adjusting your filters or browse all products.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-4 rounded-btn bg-cgk-navy px-6 py-2 text-sm font-medium text-white hover:bg-cgk-navy/90"
                >
                  Clear All Filters
                </button>
              )}
              <Link
                href="/collections"
                className="mt-3 text-sm font-medium text-cgk-navy underline hover:text-cgk-navy/80"
              >
                Browse Collections
              </Link>
            </div>
          ) : (
            <>
              <ProductGrid
                products={products}
                columns={{ sm: 2, dawn: 3, lg: 3 }}
                priorityCount={6}
              />

              {/* Pagination */}
              {hasNextPage && (
                <div className="flex justify-center pt-8">
                  <Link
                    href={paginationUrl}
                    className="rounded-btn border border-cgk-navy px-8 py-3 text-sm font-semibold text-cgk-navy transition-colors hover:bg-cgk-navy hover:text-white"
                  >
                    Load More Products
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
