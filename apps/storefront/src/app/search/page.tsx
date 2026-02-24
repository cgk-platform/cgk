/**
 * Search Results Page
 *
 * Full-text search against local PostgreSQL database.
 * Provides fast, relevant product search results with sort options.
 *
 * Sort is controlled via URL search params:
 *   ?q=sheets&sort=price-asc
 *
 * Supported sort values:
 *   - relevance (default) - Full-text search rank
 *   - price-asc           - Price: Low to High
 *   - price-desc          - Price: High to Low
 *   - newest              - Most recently created
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import type { Product } from '@cgk-platform/commerce'

import { ProductGrid } from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getTenantConfig } from '@/lib/tenant'

import { SearchSortSelect } from './components'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// Sort Configuration
// ---------------------------------------------------------------------------

const SORT_MAPPING: Record<string, { sortKey?: string; reverse?: boolean }> = {
  relevance: {}, // Default: search rank ordering from DB
  'price-asc': { sortKey: 'PRICE', reverse: false },
  'price-desc': { sortKey: 'PRICE', reverse: true },
  newest: { sortKey: 'CREATED_AT', reverse: true },
}

const DEFAULT_SORT = 'relevance'

/**
 * Client-side sort for search results when the DB returns relevance-ordered
 * results but the user wants a different sort. This handles cases where the
 * local DB search doesn't natively support sort keys other than rank.
 */
function sortProducts(products: Product[], sort: string): Product[] {
  if (sort === 'relevance' || !sort) return products

  const sorted = [...products]

  switch (sort) {
    case 'price-asc':
      sorted.sort(
        (a, b) =>
          parseFloat(a.priceRange.minVariantPrice.amount) -
          parseFloat(b.priceRange.minVariantPrice.amount)
      )
      break
    case 'price-desc':
      sorted.sort(
        (a, b) =>
          parseFloat(b.priceRange.minVariantPrice.amount) -
          parseFloat(a.priceRange.minVariantPrice.amount)
      )
      break
    case 'newest':
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      break
  }

  return sorted
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    sort?: string
  }>
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams
  const tenant = await getTenantConfig()

  return {
    title: q
      ? `Search: "${q}" | ${tenant?.name ?? 'Store'}`
      : `Search | ${tenant?.name ?? 'Store'}`,
    description: q
      ? `Search results for "${q}"`
      : 'Search our product catalog',
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const sort = params.sort || DEFAULT_SORT

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {query ? (
            <>
              Search results for &quot;<span className="text-primary">{query}</span>&quot;
            </>
          ) : (
            'Search Products'
          )}
        </h1>
      </div>

      {/* Search Form */}
      <form action="/search" method="GET" className="mb-8">
        <div className="relative max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search products..."
            className="w-full rounded-lg border bg-transparent py-3 pl-12 pr-4 text-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          {/* Preserve sort param when submitting a new search */}
          {sort !== DEFAULT_SORT && (
            <input type="hidden" name="sort" value={sort} />
          )}
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </form>

      {/* Search Results */}
      {query ? (
        <Suspense
          fallback={
            <div className="space-y-6">
              {/* Skeleton toolbar */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
              </div>
              {/* Skeleton grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-square rounded-lg bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <SearchResults
            query={query}
            page={params.page ? parseInt(params.page, 10) : 1}
            sort={sort}
          />
        </Suspense>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <svg
            className="mb-4 h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold">Start searching</h2>
          <p className="mt-2 text-muted-foreground">
            Enter a search term to find products
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search Results (Server Component)
// ---------------------------------------------------------------------------

interface SearchResultsProps {
  query: string
  page: number
  sort: string
}

async function SearchResults({ query, page, sort }: SearchResultsProps) {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Store not configured</h2>
        <p className="mt-2 text-muted-foreground">
          Please configure your store settings to search products.
        </p>
      </div>
    )
  }

  const pageSize = 20

  // Map sort param to API-compatible sort config
  const sortConfig = SORT_MAPPING[sort] ?? SORT_MAPPING[DEFAULT_SORT]!

  // Use full-text search on local DB
  const result = await commerce.products.search(query, {
    first: pageSize,
    sortKey: sortConfig.sortKey,
    reverse: sortConfig.reverse,
  })

  if (result.items.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-lg font-semibold">No results found</h2>
        <p className="mt-2 text-muted-foreground">
          Try different keywords or browse our{' '}
          <a href="/products" className="text-primary hover:underline">
            product catalog
          </a>
        </p>

        {/* Search Suggestions */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Popular searches</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {['New Arrivals', 'Best Sellers', 'Sale'].map((suggestion) => (
              <a
                key={suggestion}
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
              >
                {suggestion}
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Apply client-side sort when the local DB search returns relevance-ordered
  // results but a non-relevance sort is requested. The Shopify fallback
  // handles sort natively via its API, but local DB search always returns
  // results ordered by ts_rank. We re-sort the page of results here.
  const sortedItems =
    sort !== 'relevance' ? sortProducts(result.items, sort) : result.items

  // Build pagination URL preserving query and sort params
  const paginationParams = new URLSearchParams()
  paginationParams.set('q', query)
  if (sort !== DEFAULT_SORT) paginationParams.set('sort', sort)
  paginationParams.set('page', String(page + 1))

  return (
    <div className="space-y-6">
      {/* Toolbar: Results count + Sort */}
      <div className="flex items-center justify-between border-b pb-4">
        <p className="text-sm text-muted-foreground">
          Found {result.items.length} product{result.items.length !== 1 ? 's' : ''}
        </p>
        <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded bg-muted" />}>
          <SearchSortSelect currentSort={sort} />
        </Suspense>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={sortedItems}
        columns={{ sm: 2, md: 3, lg: 4 }}
        showVendor
      />

      {/* Pagination */}
      {result.pageInfo.hasNextPage && (
        <div className="flex justify-center pt-8">
          <a
            href={`/search?${paginationParams.toString()}`}
            className="rounded-lg border px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            Load More Results
          </a>
        </div>
      )}
    </div>
  )
}
