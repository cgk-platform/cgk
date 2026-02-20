/**
 * Collections Index Page
 *
 * Displays all product collections for the tenant.
 * Reads from local PostgreSQL database for fast performance.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { getTenantConfig, getTenantSlug } from '@/lib/tenant'
import { sql, withTenant } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()

  return {
    title: `Collections | ${tenant?.name ?? 'Store'}`,
    description: `Browse our collections`,
  }
}

interface CollectionRow {
  id: string
  handle: string
  title: string
  description: string | null
  image_url: string | null
  product_count: number
  updated_at: string
}

async function getCollections(tenantSlug: string): Promise<CollectionRow[]> {
  const result = await withTenant(tenantSlug, async () => {
    return sql<CollectionRow>`
      SELECT
        id,
        handle,
        title,
        description,
        image_url,
        product_count,
        updated_at
      FROM collections
      WHERE is_active = true
      ORDER BY sort_order ASC, title ASC
      LIMIT 100
    `
  })
  return result.rows
}

export default async function CollectionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our curated collections
        </p>
      </div>

      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsGrid />
      </Suspense>
    </div>
  )
}

async function CollectionsGrid() {
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Store not configured</h2>
        <p className="mt-2 text-muted-foreground">
          Please configure your store settings.
        </p>
      </div>
    )
  }

  let collections: CollectionRow[] = []

  try {
    collections = await getCollections(tenantSlug)
  } catch {
    // Collections table may not exist yet; fall back to empty state
  }

  if (collections.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">No collections found</h2>
        <p className="mt-2 text-muted-foreground">
          Collections will appear here once they are synced from your store.
        </p>
        <Link
          href="/products"
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          View All Products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

function CollectionCard({ collection }: { collection: CollectionRow }) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group block overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Collection Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {collection.image_url ? (
          <img
            src={collection.image_url}
            alt={collection.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-12 text-muted-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Collection Info */}
      <div className="p-4">
        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
          {collection.title}
        </h3>
        {collection.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {collection.description}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {collection.product_count ?? 0} products
        </p>
      </div>
    </Link>
  )
}

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
