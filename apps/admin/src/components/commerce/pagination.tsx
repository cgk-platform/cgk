import { cn } from '@cgk-platform/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { buildFilterUrl } from '@/lib/search-params'

interface PaginationProps {
  page: number
  totalPages: number
  totalCount: number
  limit: number
  basePath: string
  currentFilters: Record<string, string | number | undefined>
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  limit,
  basePath,
  currentFilters,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, totalCount)

  const pageNumbers = getPageNumbers(page, totalPages)

  function pageUrl(p: number) {
    return buildFilterUrl(basePath, { ...currentFilters, page: p > 1 ? p : undefined })
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}&ndash;{end} of {totalCount} results
      </p>
      <nav className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={pageUrl(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1 text-muted-foreground">
              &hellip;
            </span>
          ) : (
            <Link
              key={p}
              href={pageUrl(p)}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {p}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link
            href={pageUrl(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </nav>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('ellipsis')
  }

  pages.push(total)
  return pages
}
