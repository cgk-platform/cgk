/**
 * Collections Index Page
 *
 * Displays all CGK product collections.
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
    title: `Collections | ${tenant?.name ?? 'CGK Linens'}`,
    description: 'Browse our curated bedding collections — sheets, comforters, blankets and more.',
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

// Static CGK collections fallback when DB is empty
const CGK_COLLECTIONS = [
  { handle: '6-piece-sheet-sets', title: '6-Piece Sheet Sets', description: 'Our best-selling sheet sets with deep pockets that fit mattresses up to 16 inches.' },
  { handle: 'bedding', title: 'Bedding', description: 'Complete your bedroom with our full range of premium bedding.' },
  { handle: 'featured', title: 'Featured', description: 'Our top picks and best sellers, hand-selected for you.' },
  { handle: 'blankets', title: 'Blankets', description: 'Ultra-soft blankets for year-round comfort.' },
  { handle: 'comforters', title: 'Comforters', description: 'Cozy comforter sets to complete your bed.' },
]

export default async function CollectionsPage() {
  return (
    <div className="mx-auto max-w-store px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/" className="hover:text-cgk-navy">Home</a>
          </li>
          <li>/</li>
          <li className="text-cgk-navy">Collections</li>
        </ol>
      </nav>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-cgk-navy">Our Collections</h1>
        <p className="mt-2 text-gray-600">
          Browse our curated bedding collections
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

  let collections: CollectionRow[] = []

  if (tenantSlug) {
    try {
      collections = await getCollections(tenantSlug)
    } catch {
      // Collections table may not exist yet
    }
  }

  // Use static CGK collections as fallback
  if (collections.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CGK_COLLECTIONS.map((collection) => (
          <Link
            key={collection.handle}
            href={`/collections/${collection.handle}`}
            className="group relative overflow-hidden rounded-lg bg-cgk-light-blue/20"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-cgk-navy/10 to-cgk-light-blue/30 transition-all duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-xl font-bold text-cgk-navy">{collection.title}</h3>
              {collection.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{collection.description}</p>
              )}
              <span className="mt-3 text-sm font-medium text-cgk-navy underline">
                Shop Now
              </span>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      className="group block overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cgk-light-blue/20">
        {collection.image_url ? (
          <img
            src={collection.image_url}
            alt={collection.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cgk-navy/5 to-cgk-light-blue/30">
            <span className="text-4xl font-bold text-cgk-navy/20">
              {collection.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-cgk-navy transition-colors group-hover:text-cgk-navy/80">
          {collection.title}
        </h3>
        {collection.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {collection.description}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          {collection.product_count ?? 0} products
        </p>
      </div>
    </Link>
  )
}

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="aspect-[4/3] animate-pulse bg-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
