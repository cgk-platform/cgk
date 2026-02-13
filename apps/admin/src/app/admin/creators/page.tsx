import { Card, CardContent } from '@cgk-platform/ui'
import { Plus, Download, LayoutGrid, List } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { CreatorDirectoryClient } from './components/creator-directory-client'
import { CreatorTableView } from './components/creator-table-view'

import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { getCreatorsDirectory, getAllCreatorTags } from '@/lib/creators/db'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'
import { parseCreatorDirectoryFilters, buildFilterUrl } from '@/lib/search-params'

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseCreatorDirectoryFilters(params as Record<string, string | undefined>)
  const view = (params.view as string) || 'table'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creators</h1>
          <p className="text-sm text-muted-foreground">
            Manage your creator network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/creator-pipeline"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Pipeline View
          </Link>
          <Link
            href="/admin/creators?modal=export"
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export
          </Link>
          <Link
            href="/admin/creators?modal=create"
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Creator
          </Link>
        </div>
      </div>

      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBarLoader filters={filters} view={view} />
      </Suspense>

      <Suspense fallback={<CreatorsListSkeleton />}>
        <CreatorsLoader filters={filters} view={view} />
      </Suspense>

      <CreatorDirectoryClient />
    </div>
  )
}

async function FilterBarLoader({
  filters,
  view,
}: {
  filters: ReturnType<typeof parseCreatorDirectoryFilters>
  view: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tags = tenantSlug ? await getAllCreatorTags(tenantSlug) : []

  const base = '/admin/creators'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    tier: filters.tier || undefined,
    tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    sort: filters.sort !== 'applied_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
    view: view !== 'table' ? view : undefined,
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput placeholder="Search name, email, or code..." />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Status:</span>
          <div className="flex gap-1">
            <Link
              href={buildFilterUrl(base, { ...filterParams, status: undefined, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              All
            </Link>
            {CREATOR_STATUSES.slice(0, 5).map((status) => (
              <Link
                key={status}
                href={buildFilterUrl(base, { ...filterParams, status, page: undefined })}
                className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {status.replace(/_/g, ' ')}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Tier:</span>
          <div className="flex gap-1">
            <Link
              href={buildFilterUrl(base, { ...filterParams, tier: undefined, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${!filters.tier ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              All
            </Link>
            {CREATOR_TIERS.map((tier) => (
              <Link
                key={tier}
                href={buildFilterUrl(base, { ...filterParams, tier, page: undefined })}
                className={`rounded-md px-2 py-1 text-xs capitalize ${filters.tier === tier ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {tier}
              </Link>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, view: undefined })}
            className={`rounded p-1.5 ${view === 'table' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Link>
          <Link
            href={buildFilterUrl(base, { ...filterParams, view: 'grid' })}
            className={`rounded p-1.5 ${view === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {tags.slice(0, 10).map((tag) => {
            const isActive = filters.tags.includes(tag)
            const newTags = isActive
              ? filters.tags.filter((t) => t !== tag)
              : [...filters.tags, tag]
            return (
              <Link
                key={tag}
                href={buildFilterUrl(base, {
                  ...filterParams,
                  tags: newTags.length > 0 ? newTags.join(',') : undefined,
                  page: undefined,
                })}
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {tag}
              </Link>
            )
          })}
          {tags.length > 10 && (
            <span className="text-xs text-muted-foreground">
              +{tags.length - 10} more
            </span>
          )}
        </div>
      )}

      {(filters.search || filters.status || filters.tier || filters.tags.length > 0) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          <Link
            href={base}
            className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
          >
            Clear all filters
          </Link>
        </div>
      )}
    </div>
  )
}

async function CreatorsLoader({
  filters,
  view,
}: {
  filters: ReturnType<typeof parseCreatorDirectoryFilters>
  view: string
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getCreatorsDirectory(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/creators'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    tier: filters.tier || undefined,
    tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
    sort: filters.sort !== 'applied_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
    view: view !== 'table' ? view : undefined,
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl">🎨</div>
          <h3 className="mt-4 text-lg font-medium">No creators found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.search || filters.status || filters.tier
              ? 'Try adjusting your filters'
              : 'Get started by adding your first creator'}
          </p>
          <Link
            href="/admin/creators?modal=create"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Creator
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <CreatorTableView creators={rows} />
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-72 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

function CreatorsListSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
