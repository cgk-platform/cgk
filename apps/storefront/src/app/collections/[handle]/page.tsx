/**
 * Collection Page
 *
 * Displays products filtered by collection with CGK branding.
 * Uses commerce.collections.getProducts() for Shopify filter support.
 * 3 columns desktop, 2 mobile. 16 products per page.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import type { CollectionFilter } from '@cgk-platform/commerce'

import { CollectionJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getCommerceProvider } from '@/lib/commerce'
import { getTenantConfig } from '@/lib/tenant'

import { CollectionFilterWrapper } from './components'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionPageProps {
  params: Promise<{
    handle: string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
    [key: string]: string | string[] | undefined
  }>
}

// ---------------------------------------------------------------------------
// Sort Key Mapping
// ---------------------------------------------------------------------------

const SORT_MAPPING: Record<string, { sortKey: string; reverse: boolean }> = {
  'best-selling': { sortKey: 'BEST_SELLING', reverse: false },
  newest: { sortKey: 'CREATED', reverse: true },
  'price-asc': { sortKey: 'PRICE', reverse: false },
  'price-desc': { sortKey: 'PRICE', reverse: true },
  'title-asc': { sortKey: 'TITLE', reverse: false },
  'title-desc': { sortKey: 'TITLE', reverse: true },
}

const DEFAULT_SORT = 'best-selling'

// ---------------------------------------------------------------------------
// URL Param to CollectionFilter[] Parsing
// ---------------------------------------------------------------------------

/**
 * Parse URL search params into CollectionFilter[] for the API call.
 *
 * URL scheme:
 *   filter.v.option.<name>=<value>   -> variantOption filter
 *   filter.v.price.min=N             -> price filter (min)
 *   filter.v.price.max=N             -> price filter (max)
 *   filter.v.availability=1|0        -> available filter
 *   filter.v.tag=<tag>               -> tag filter
 *   filter.v.product_type=<type>     -> productType filter
 */
function parseFiltersFromSearchParams(
  searchParams: URLSearchParams
): CollectionFilter[] {
  const filters: CollectionFilter[] = []

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith('filter.v.')) continue

    const rest = key.slice('filter.v.'.length)

    if (rest.startsWith('option.')) {
      const optionName = rest.slice('option.'.length)
      filters.push({
        variantOption: {
          name: capitalizeWords(optionName),
          value,
        },
      })
    } else if (rest === 'availability') {
      filters.push({ available: value === '1' })
    } else if (rest === 'tag') {
      filters.push({ tag: value })
    } else if (rest === 'product_type') {
      filters.push({ productType: value })
    }
  }

  // Handle price filter (min/max combined into one filter)
  const priceMin = searchParams.get('filter.v.price.min')
  const priceMax = searchParams.get('filter.v.price.max')
  if (priceMin !== null || priceMax !== null) {
    const priceFilter: CollectionFilter = { price: {} }
    if (priceMin !== null) priceFilter.price!.min = parseFloat(priceMin)
    if (priceMax !== null) priceFilter.price!.max = parseFloat(priceMax)
    filters.push(priceFilter)
  }

  return filters
}

function capitalizeWords(str: string): string {
  return str
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params
  const tenant = await getTenantConfig()
  const commerce = await getCommerceProvider()

  // Try to get the real collection title from Shopify
  const collection = commerce
    ? await commerce.collections.getByHandle(handle)
    : null

  const collectionName =
    collection?.title ??
    handle
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const description =
    collection?.description ||
    `Shop our ${collectionName} collection — premium bedding that's soft, breathable, and built to last.`

  return {
    title: `${collectionName} | ${tenant?.name ?? 'CGK Linens'}`,
    description,
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { handle } = await params
  const search = await searchParams

  const commerce = await getCommerceProvider()

  // Get collection metadata for title and description
  const collection = commerce
    ? await commerce.collections.getByHandle(handle)
    : null

  const collectionName =
    collection?.title ??
    handle
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const collectionDescription =
    collection?.description || undefined

  // Build absolute URL for structured data
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = `${protocol}://${host}`
  const collectionUrl = `${siteUrl}/collections/${handle}`

  return (
    <div className="mx-auto max-w-store px-4 py-8">
      {/* Structured Data */}
      <CollectionJsonLd
        name={collectionName}
        description={collectionDescription}
        url={collectionUrl}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: siteUrl },
          { name: 'Collections', url: `${siteUrl}/collections` },
          { name: collectionName, url: collectionUrl },
        ]}
      />

      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/" className="hover:text-cgk-navy">
              Home
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/collections" className="hover:text-cgk-navy">
              Collections
            </a>
          </li>
          <li>/</li>
          <li className="text-cgk-navy">{collectionName}</li>
        </ol>
      </nav>

      {/* Collection Banner */}
      <div className="mb-8 rounded-lg bg-cgk-light-blue/30 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold text-cgk-navy">{collectionName}</h1>
        {collectionDescription ? (
          <p className="mx-auto mt-2 max-w-xl text-gray-600">
            {collectionDescription}
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-xl text-gray-600">
            Premium bedding that&apos;s soft, breathable, and built to last.
          </p>
        )}
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            {/* Skeleton toolbar */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-36 animate-pulse rounded bg-gray-200" />
            </div>
            {/* Skeleton grid */}
            <div className="flex gap-8">
              <div className="hidden w-60 shrink-0 space-y-4 lg:block">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4 sm:gap-6 dawn:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-3">
                      <div className="aspect-[3/4] rounded-lg bg-gray-200" />
                      <div className="h-4 w-3/4 rounded bg-gray-200" />
                      <div className="h-4 w-1/2 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        }
      >
        <CollectionProducts
          handle={handle}
          sort={search.sort}
          searchParams={search}
        />
      </Suspense>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Server Data Fetching Component
// ---------------------------------------------------------------------------

interface CollectionProductsProps {
  handle: string
  sort?: string
  searchParams: Record<string, string | string[] | undefined>
}

async function CollectionProducts({
  handle,
  sort,
  searchParams,
}: CollectionProductsProps) {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Configure your Shopify store connection to display products here.
      </div>
    )
  }

  const pageSize = 16
  const currentSort = sort || DEFAULT_SORT
  const sortConfig = SORT_MAPPING[currentSort] ?? SORT_MAPPING[DEFAULT_SORT]!
  const resolvedSortKey = sortConfig?.sortKey ?? 'BEST_SELLING'
  const resolvedReverse = sortConfig?.reverse ?? false

  // Parse filter params from URL
  const urlParams = new URLSearchParams()
  for (const [key, val] of Object.entries(searchParams)) {
    if (val === undefined) continue
    if (Array.isArray(val)) {
      for (const v of val) urlParams.append(key, v)
    } else {
      urlParams.append(key, val)
    }
  }

  const filters = parseFiltersFromSearchParams(urlParams)

  // Fetch products using collection API with filters
  const result = await commerce.collections.getProducts(handle, {
    first: pageSize,
    filters: filters.length > 0 ? filters : undefined,
    sortKey: resolvedSortKey,
    reverse: resolvedReverse,
  })

  if (!result) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <svg
          className="mb-4 h-12 w-12 text-gray-400"
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
        <h2 className="text-lg font-semibold text-cgk-navy">
          Collection not found
        </h2>
        <p className="mt-2 text-gray-500">
          This collection doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/collections"
          className="mt-4 rounded-btn bg-cgk-navy px-6 py-2 text-sm font-medium text-white hover:bg-cgk-navy/90"
        >
          Browse Collections
        </a>
      </div>
    )
  }

  return (
    <CollectionFilterWrapper
      products={result.items}
      filters={result.filters}
      totalCount={result.items.length}
      hasNextPage={result.pageInfo.hasNextPage}
      handle={handle}
      currentSort={currentSort}
    />
  )
}
