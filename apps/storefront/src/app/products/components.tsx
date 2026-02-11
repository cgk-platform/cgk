/**
 * Product page components
 *
 * Shared components for product listing pages.
 */

'use client'

import { cn } from '@cgk/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface ProductFiltersProps {
  currentSort?: string
}

export function ProductFilters({ currentSort }: ProductFiltersProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'title-asc', label: 'Name: A-Z' },
    { value: 'title-desc', label: 'Name: Z-A' },
  ]

  const createSortUrl = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', sort)
    params.delete('page') // Reset to first page on sort change
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sort By
        </h3>
        <div className="space-y-1">
          {sortOptions.map((option) => (
            <Link
              key={option.value}
              href={createSortUrl(option.value)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                currentSort === option.value || (!currentSort && option.value === 'newest')
                  ? 'bg-muted font-medium'
                  : 'hover:bg-muted/50'
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ProductSkeletonProps {
  count?: number
}

export function ProductSkeleton({ count = 8 }: ProductSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
