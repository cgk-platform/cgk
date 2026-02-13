import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { getAssets, getCollections, getAssetStats, type AssetFilters } from '@cgk-platform/dam'
import { AssetLibraryClient } from './asset-library-client'

export default async function DAMPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Suspense fallback={<DAMLoadingSkeleton />}>
        <DAMContent params={params} />
      </Suspense>
    </div>
  )
}

async function DAMContent({ params }: { params: Record<string, string | string[] | undefined> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No tenant configured.</p>
      </div>
    )
  }

  const userId = headerList.get('x-user-id') || 'system'

  // Parse filters from search params
  const filters: AssetFilters = {
    page: Math.max(1, parseInt(params.page as string || '1', 10)),
    limit: 50,
    offset: 0,
    search: params.search as string || undefined,
    asset_type: params.type as AssetFilters['asset_type'] || undefined,
    collection_id: params.collection as string || undefined,
    is_archived: params.filter === 'archived' ? true : undefined,
    is_favorite: params.filter === 'favorites' ? true : undefined,
    sort: params.sort as string || 'created_at',
    dir: (params.dir as 'asc' | 'desc') || 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const [assetsResult, collections, stats] = await withTenant(tenantSlug, async () => {
    return Promise.all([
      getAssets(tenantSlug, userId, filters),
      getCollections(tenantSlug),
      getAssetStats(tenantSlug),
    ])
  })

  return (
    <AssetLibraryClient
      initialAssets={assetsResult.assets}
      totalCount={assetsResult.totalCount}
      collections={collections}
      stats={stats}
      filters={filters}
    />
  )
}

function DAMLoadingSkeleton() {
  return (
    <>
      {/* Sidebar skeleton */}
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800 p-4">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="p-2 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex flex-1 flex-col bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="h-10 w-96 animate-pulse rounded-lg bg-slate-800" />
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-800" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
