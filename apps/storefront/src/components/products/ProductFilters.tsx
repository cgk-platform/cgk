/**
 * ProductFilters Component
 *
 * Enhanced product filtering with sort, type, vendor, and price range options.
 * Server component wrapper with client interactivity.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

interface ProductFiltersProps {
  /** Current sort value */
  currentSort?: string
  /** Current product type filter */
  currentType?: string
  /** Current vendor filter */
  currentVendor?: string
  /** Available product types */
  productTypes?: string[]
  /** Available vendors */
  vendors?: string[]
  /** Custom class name */
  className?: string
}

export function ProductFilters({
  currentSort,
  currentType,
  currentVendor,
  productTypes = [],
  vendors = [],
  className,
}: ProductFiltersProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['sort'])
  )

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'title-asc', label: 'Name: A-Z' },
    { value: 'title-desc', label: 'Name: Z-A' },
  ]

  const createFilterUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(params)) {
        if (value) {
          newParams.set(key, value)
        } else {
          newParams.delete(key)
        }
      }

      // Reset to first page on filter change
      newParams.delete('page')

      const queryString = newParams.toString()
      return queryString ? `${pathname}?${queryString}` : pathname
    },
    [pathname, searchParams]
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const hasActiveFilters = currentType || currentVendor

  return (
    <div className={cn('space-y-6', className)}>
      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between border-b pb-4">
          <span className="text-sm font-medium">Active Filters</span>
          <Link
            href={pathname}
            className="text-sm text-primary hover:underline"
          >
            Clear All
          </Link>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {currentType && (
            <FilterTag
              label={`Type: ${currentType}`}
              href={createFilterUrl({ type: undefined })}
            />
          )}
          {currentVendor && (
            <FilterTag
              label={`Vendor: ${currentVendor}`}
              href={createFilterUrl({ vendor: undefined })}
            />
          )}
        </div>
      )}

      {/* Sort */}
      <FilterSection
        title="Sort By"
        isExpanded={expandedSections.has('sort')}
        onToggle={() => toggleSection('sort')}
      >
        <div className="space-y-1">
          {sortOptions.map((option) => (
            <Link
              key={option.value}
              href={createFilterUrl({ sort: option.value })}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                currentSort === option.value ||
                  (!currentSort && option.value === 'newest')
                  ? 'bg-muted font-medium'
                  : 'hover:bg-muted/50'
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </FilterSection>

      {/* Product Type */}
      {productTypes.length > 0 && (
        <FilterSection
          title="Product Type"
          isExpanded={expandedSections.has('type')}
          onToggle={() => toggleSection('type')}
          count={currentType ? 1 : 0}
        >
          <div className="space-y-1">
            <Link
              href={createFilterUrl({ type: undefined })}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                !currentType ? 'bg-muted font-medium' : 'hover:bg-muted/50'
              )}
            >
              All Types
            </Link>
            {productTypes.map((type) => (
              <Link
                key={type}
                href={createFilterUrl({ type })}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  currentType === type
                    ? 'bg-muted font-medium'
                    : 'hover:bg-muted/50'
                )}
              >
                {type}
              </Link>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Vendor */}
      {vendors.length > 0 && (
        <FilterSection
          title="Vendor"
          isExpanded={expandedSections.has('vendor')}
          onToggle={() => toggleSection('vendor')}
          count={currentVendor ? 1 : 0}
        >
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <Link
              href={createFilterUrl({ vendor: undefined })}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                !currentVendor ? 'bg-muted font-medium' : 'hover:bg-muted/50'
              )}
            >
              All Vendors
            </Link>
            {vendors.map((vendor) => (
              <Link
                key={vendor}
                href={createFilterUrl({ vendor })}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  currentVendor === vendor
                    ? 'bg-muted font-medium'
                    : 'hover:bg-muted/50'
                )}
              >
                {vendor}
              </Link>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  )
}

/**
 * Collapsible Filter Section
 */
interface FilterSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  count?: number
  children: React.ReactNode
}

function FilterSection({
  title,
  isExpanded,
  onToggle,
  count,
  children,
}: FilterSectionProps) {
  return (
    <div className="border-b pb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-left"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          {count !== undefined && count > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {count}
            </span>
          )}
        </span>
        <svg
          className={cn(
            'h-4 w-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  )
}

/**
 * Active Filter Tag
 */
interface FilterTagProps {
  label: string
  href: string
}

function FilterTag({ label, href }: FilterTagProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
    >
      {label}
      <svg
        className="h-3 w-3"
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
    </Link>
  )
}

/**
 * Mobile Filters Drawer Trigger
 */
interface MobileFiltersButtonProps {
  activeCount: number
  onClick: () => void
}

export function MobileFiltersButton({
  activeCount,
  onClick,
}: MobileFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium lg:hidden"
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
      {activeCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {activeCount}
        </span>
      )}
    </button>
  )
}

export default ProductFilters
