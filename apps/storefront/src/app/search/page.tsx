/**
 * Search Results Page
 *
 * Full-text search against local PostgreSQL database.
 * Provides fast, relevant product search results.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProductGrid } from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''

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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-square rounded-lg bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <SearchResults
            query={query}
            page={params.page ? parseInt(params.page, 10) : 1}
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

interface SearchResultsProps {
  query: string
  page: number
}

async function SearchResults({ query, page }: SearchResultsProps) {
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

  // Use full-text search on local DB
  const result = await commerce.products.search(query, {
    first: pageSize,
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

  return (
    <div className="space-y-8">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {result.items.length} products
        </p>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={result.items}
        columns={{ sm: 2, md: 3, lg: 4 }}
        showVendor
      />

      {/* Pagination */}
      {result.pageInfo.hasNextPage && (
        <div className="flex justify-center pt-8">
          <a
            href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
            className="rounded-lg border px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            Load More Results
          </a>
        </div>
      )}
    </div>
  )
}
