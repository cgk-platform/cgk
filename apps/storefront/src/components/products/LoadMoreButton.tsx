/**
 * Load More Button
 *
 * Client-side cursor-based pagination for collection pages.
 * Fetches next page and appends products to the grid.
 */

'use client'

import type { Product } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import { useCallback, useState } from 'react'

import { loadMoreCollectionProducts } from '@/lib/collections/actions'
import { ProductGrid } from '@/components/products'

interface LoadMoreButtonProps {
  handle: string
  initialEndCursor?: string
  sortKey?: string
  reverse?: boolean
}

export function LoadMoreButton({
  handle,
  initialEndCursor,
  sortKey = 'BEST_SELLING',
  reverse = false,
}: LoadMoreButtonProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cursor, setCursor] = useState(initialEndCursor)
  const [hasMore, setHasMore] = useState(!!initialEndCursor)
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !cursor) return
    setIsLoading(true)

    try {
      const result = await loadMoreCollectionProducts({
        handle,
        cursor,
        sortKey,
        reverse,
      })

      setProducts((prev) => [...prev, ...result.products])
      setCursor(result.endCursor ?? undefined)
      setHasMore(result.hasNextPage)
    } catch (err) {
      console.error('[LoadMore] Failed to load products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, cursor, handle, sortKey, reverse])

  return (
    <>
      {products.length > 0 && (
        <div className="mt-6">
          <ProductGrid
            products={products}
            columns={{ sm: 2, dawn: 3, lg: 3 }}
            priorityCount={0}
          />
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className={cn(
              'rounded-btn border border-cgk-navy px-8 py-3 text-sm font-semibold text-cgk-navy transition-colors',
              'hover:bg-cgk-navy hover:text-white',
              'disabled:cursor-wait disabled:opacity-60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgk-navy focus-visible:ring-offset-2'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load More Products'
            )}
          </button>
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="pt-8 text-center text-sm text-gray-400">
          No more products to show
        </p>
      )}
    </>
  )
}
