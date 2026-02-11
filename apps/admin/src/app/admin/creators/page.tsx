import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { CreatorList } from './components/creator-list'

import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { getCreators } from '@/lib/creators/db'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'
import { parseCreatorFilters, buildFilterUrl } from '@/lib/search-params'


export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseCreatorFilters(params as Record<string, string | undefined>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creators</h1>
        <Link
          href="/admin/creator-pipeline"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View Pipeline
        </Link>
      </div>

      <CreatorFilterBar filters={filters} />

      <Suspense fallback={<CreatorsListSkeleton />}>
        <CreatorsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function CreatorFilterBar({ filters }: { filters: ReturnType<typeof parseCreatorFilters> }) {
  const base = '/admin/creators'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    tier: filters.tier || undefined,
    sort: filters.sort !== 'applied_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search creators..." />
      </div>
      <FilterSelect
        label="Status"
        value={filters.status}
        options={CREATOR_STATUSES}
        paramName="status"
        filterParams={filterParams}
        basePath={base}
      />
      <FilterSelect
        label="Tier"
        value={filters.tier}
        options={CREATOR_TIERS}
        paramName="tier"
        filterParams={filterParams}
        basePath={base}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  paramName,
  filterParams,
  basePath,
}: {
  label: string
  value: string
  options: readonly string[]
  paramName: string
  filterParams: Record<string, string | number | undefined>
  basePath: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(basePath, { ...filterParams, [paramName]: undefined })}
          className={`rounded-md px-2 py-1 text-xs ${!value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </Link>
        {options.map((opt) => (
          <Link
            key={opt}
            href={buildFilterUrl(basePath, { ...filterParams, [paramName]: opt, page: undefined })}
            className={`rounded-md px-2 py-1 text-xs capitalize ${value === opt ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {opt.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function CreatorsLoader({ filters }: { filters: ReturnType<typeof parseCreatorFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getCreators(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/creators'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    tier: filters.tier || undefined,
    sort: filters.sort !== 'applied_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="space-y-4">
      <CreatorList creators={rows} />
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
