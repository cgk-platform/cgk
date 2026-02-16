'use client'

import { Button, cn } from '@cgk-platform/ui'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

import { BrandCard, BrandCardSkeleton } from './brand-card'
import type { BrandSummary, PaginatedBrands } from '../../types/platform'

interface BrandsGridProps {
  /** Paginated brands data */
  data: PaginatedBrands
  /** Current page */
  page: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Whether data is loading */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Brands Grid component with pagination
 *
 * Layout:
 * - Desktop: 4 columns
 * - Tablet: 2 columns
 * - Mobile: 1 column
 */
export function BrandsGrid({
  data,
  page,
  onPageChange,
  isLoading,
  className,
}: BrandsGridProps) {
  if (isLoading) {
    return <BrandsGridSkeleton />
  }

  if (data.brands.length === 0) {
    return <EmptyBrandsState />
  }

  const startIndex = (page - 1) * data.pageSize + 1
  const endIndex = Math.min(page * data.pageSize, data.total)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {data.total} brands
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            <div className="flex items-center gap-1">
              {generatePageNumbers(page, data.totalPages).map((pageNum, idx) => {
                if (pageNum === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onPageChange(pageNum as number)}
                    className="min-w-[36px]"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Generate page numbers for pagination
 * Shows first, last, current and surrounding pages with ellipsis
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = []

  // Always show first page
  pages.push(1)

  // Show ellipsis or pages near start
  if (current > 4) {
    pages.push('...')
  } else {
    pages.push(2, 3)
  }

  // Show current and surrounding pages
  if (current > 3 && current < total - 2) {
    if (current > 4) pages.push(current - 1)
    pages.push(current)
    if (current < total - 3) pages.push(current + 1)
  }

  // Show ellipsis or pages near end
  if (current < total - 3) {
    pages.push('...')
  } else {
    if (!pages.includes(total - 2)) pages.push(total - 2)
    if (!pages.includes(total - 1)) pages.push(total - 1)
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total)
  }

  return pages
}

/**
 * Loading skeleton for brands grid
 */
function BrandsGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <BrandCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Empty state when no brands exist
 */
function EmptyBrandsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
      <div className="mx-auto max-w-md text-center">
        <h3 className="text-lg font-semibold">No brands yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating your first brand.
        </p>
        <Link href="/brands/new">
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Brand
          </Button>
        </Link>
      </div>
    </div>
  )
}

/**
 * Compact brands list for sidebar or widget
 */
export function BrandsListCompact({
  brands,
  className,
}: {
  brands: BrandSummary[]
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {brands.slice(0, 5).map((brand) => (
        <Link
          key={brand.id}
          href={`/brands/${brand.id}`}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
            {brand.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate font-medium">{brand.name}</span>
          <span
            className={cn(
              'ml-auto h-2 w-2 rounded-full',
              brand.health === 'healthy'
                ? 'bg-success'
                : brand.health === 'degraded'
                  ? 'bg-warning'
                  : 'bg-destructive'
            )}
          />
        </Link>
      ))}
      {brands.length > 5 && (
        <Link
          href="/brands"
          className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          View all {brands.length} brands
        </Link>
      )}
    </div>
  )
}
