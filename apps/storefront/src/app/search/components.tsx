/**
 * Search Page Client Components
 *
 * Sort dropdown for search results. Uses URL search params to control sort
 * order so the sort persists across navigation and is SSR-compatible.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

// ---------------------------------------------------------------------------
// Sort Options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
] as const

// ---------------------------------------------------------------------------
// SearchSortSelect
// ---------------------------------------------------------------------------

interface SearchSortSelectProps {
  currentSort: string
}

export function SearchSortSelect({ currentSort }: SearchSortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      const value = e.target.value

      if (value === 'relevance') {
        // Remove sort param when set to default (relevance)
        params.delete('sort')
      } else {
        params.set('sort', value)
      }

      // Reset page on sort change
      params.delete('page')

      const qs = params.toString()
      router.push(qs ? `/search?${qs}` : '/search')
    },
    [router, searchParams]
  )

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="search-sort" className="text-sm text-muted-foreground">
        Sort by:
      </label>
      <select
        id="search-sort"
        value={currentSort}
        onChange={handleSortChange}
        className="rounded-lg border bg-transparent px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
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
