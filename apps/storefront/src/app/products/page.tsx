/**
 * Product Listing Page
 *
 * Displays all products with pagination and filtering.
 * Reads from local PostgreSQL database for fast performance.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProductSkeleton } from './components'

import { ProductGrid, ProductFilters } from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getProductTypes, getVendors } from '@/lib/products-db'
import { getTenantConfig, getTenantSlug } from '@/lib/tenant'


export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()

  return {
    title: `Products | ${tenant?.name ?? 'Store'}`,
    description: `Browse our collection of products`,
  }
}

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string
    sort?: string
    type?: string
    vendor?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">All Products</h1>
        <p className="mt-2 text-muted-foreground">
          Explore our full collection
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted" />}>
            <FiltersWrapper
              currentSort={params.sort}
              currentType={params.type}
              currentVendor={params.vendor}
            />
          </Suspense>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          <Suspense fallback={<ProductSkeleton count={12} />}>
            <ProductList
              page={params.page ? parseInt(params.page, 10) : 1}
              sort={params.sort}
              productType={params.type}
              vendor={params.vendor}
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

interface ProductListProps {
  page: number
  sort?: string
  productType?: string
  vendor?: string
}

/**
 * Filters wrapper that fetches available product types and vendors
 */
interface FiltersWrapperProps {
  currentSort?: string
  currentType?: string
  currentVendor?: string
}

async function FiltersWrapper({
  currentSort,
  currentType,
  currentVendor,
}: FiltersWrapperProps) {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return <ProductFilters currentSort={currentSort} />
  }

  const [productTypes, vendors] = await Promise.all([
    getProductTypes(tenantSlug),
    getVendors(tenantSlug),
  ])

  return (
    <ProductFilters
      currentSort={currentSort}
      currentType={currentType}
      currentVendor={currentVendor}
      productTypes={productTypes}
      vendors={vendors}
    />
  )
}

async function ProductList({ page, sort, productType, vendor }: ProductListProps) {
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
  const cursor = page > 1 ? `page_${page}` : undefined

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

  // Build query for filtering
  let query: string | undefined
  if (productType) {
    query = `product_type:${productType}`
  }
  if (vendor) {
    query = query ? `${query} vendor:${vendor}` : `vendor:${vendor}`
  }

  const result = await commerce.products.list({
    first: pageSize,
    after: cursor,
    query,
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
          Try adjusting your filters or check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {result.items.length} products
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
            href={`/products?page=${page + 1}${sort ? `&sort=${sort}` : ''}${productType ? `&type=${productType}` : ''}${vendor ? `&vendor=${vendor}` : ''}`}
            className="rounded-lg border px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            Load More
          </a>
        </div>
      )}
    </div>
  )
}
