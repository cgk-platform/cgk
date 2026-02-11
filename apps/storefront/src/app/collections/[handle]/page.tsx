/**
 * Collection Page
 *
 * Displays products filtered by collection/category.
 * Reads from local PostgreSQL database for fast performance.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProductGrid } from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CollectionPageProps {
  params: Promise<{
    handle: string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
  }>
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params
  const tenant = await getTenantConfig()

  // Convert handle to display name
  const collectionName = handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${collectionName} | ${tenant?.name ?? 'Store'}`,
    description: `Browse our ${collectionName} collection`,
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { handle } = await params
  const search = await searchParams

  // Convert handle to display name
  const collectionName = handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <a href="/" className="hover:text-foreground">
              Home
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/collections" className="hover:text-foreground">
              Collections
            </a>
          </li>
          <li>/</li>
          <li className="text-foreground">{collectionName}</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{collectionName}</h1>
        <p className="mt-2 text-muted-foreground">
          Explore our {collectionName.toLowerCase()} collection
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-square rounded-lg bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        }
      >
        <CollectionProducts
          handle={handle}
          collectionName={collectionName}
          page={search.page ? parseInt(search.page, 10) : 1}
          sort={search.sort}
        />
      </Suspense>
    </div>
  )
}

interface CollectionProductsProps {
  handle: string
  collectionName: string
  page: number
  sort?: string
}

async function CollectionProducts({
  handle,
  collectionName,
  page,
  sort,
}: CollectionProductsProps) {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Store not configured</h2>
        <p className="mt-2 text-muted-foreground">
          Please configure your store settings to display products.
        </p>
      </div>
    )
  }

  const pageSize = 20

  // Map sort param to API format
  const sortMapping: Record<string, { sortKey: string; reverse: boolean }> = {
    newest: { sortKey: 'created_at', reverse: true },
    oldest: { sortKey: 'created_at', reverse: false },
    'price-asc': { sortKey: 'price_cents', reverse: false },
    'price-desc': { sortKey: 'price_cents', reverse: true },
    'title-asc': { sortKey: 'title', reverse: false },
    'title-desc': { sortKey: 'title', reverse: true },
  }

  const sortConfig = sort ? sortMapping[sort] : sortMapping.newest

  // Query products by product type (collection handle maps to product type)
  // In a full implementation, you might have a separate collections table
  const result = await commerce.products.list({
    first: pageSize,
    query: `product_type:${collectionName}`,
    sortKey: sortConfig?.sortKey,
    reverse: sortConfig?.reverse,
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <h2 className="text-lg font-semibold">No products found</h2>
        <p className="mt-2 text-muted-foreground">
          This collection is empty. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {result.items.length} products
        </p>
        <select
          defaultValue={sort || 'newest'}
          onChange={(e) => {
            window.location.href = `/collections/${handle}?sort=${e.target.value}`
          }}
          className="rounded-md border bg-transparent px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="title-asc">Name: A-Z</option>
          <option value="title-desc">Name: Z-A</option>
        </select>
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
            href={`/collections/${handle}?page=${page + 1}${sort ? `&sort=${sort}` : ''}`}
            className="rounded-lg border px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            Load More
          </a>
        </div>
      )}
    </div>
  )
}
