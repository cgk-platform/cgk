import { Card, CardContent, Button } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatDateTime } from '@/lib/format'
import {
  getSampleRequests,
  getSampleStats,
  parseSampleFilters,
  type SampleRequest,
} from '@/lib/creators-admin-ops'
import { buildFilterUrl } from '@/lib/search-params'

import { SampleStatusBadge } from './sample-status-badge'
import { SampleActions } from './sample-actions'

export default async function SamplesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSampleFilters(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sample Management</h1>
        <Link href="/admin/samples/new">
          <Button>+ Request Sample</Button>
        </Link>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <SampleFilterBar filters={filters} />

      <Suspense fallback={<SamplesTableSkeleton />}>
        <SamplesLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function StatsCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const stats = await getSampleStats(tenantSlug)

  const cards = [
    { label: 'Pending Requests', value: stats.pending_count, color: 'text-amber-600' },
    { label: 'Shipped / In Transit', value: stats.shipped_count, color: 'text-sky-600' },
    { label: 'Delivered', value: stats.delivered_count, color: 'text-emerald-600' },
    { label: 'This Month', value: stats.this_month_count, color: 'text-foreground' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${card.color}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-12 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SampleFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parseSampleFilters>
}) {
  const base = '/admin/samples'
  const displayStatuses = ['requested', 'shipped', 'in_transit', 'delivered']

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search creators, tracking..." />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...getFilterParams(filters), status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${
              !filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            All
          </Link>
          {displayStatuses.map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, {
                ...getFilterParams(filters),
                status,
                page: undefined,
              })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${
                filters.status === status
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {status.replace('_', ' ')}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function getFilterParams(
  filters: ReturnType<typeof parseSampleFilters>
): Record<string, string | number | undefined> {
  return {
    search: filters.search || undefined,
    status: filters.status || undefined,
    creatorId: filters.creatorId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }
}

async function SamplesLoader({
  filters,
}: {
  filters: ReturnType<typeof parseSampleFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getSampleRequests(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/samples'
  const currentFilters = getFilterParams(filters)

  const columns: Column<SampleRequest>[] = [
    {
      key: 'creator_name',
      header: 'Creator',
      render: (row) => (
        <div>
          <p className="font-medium">{row.creator_name}</p>
          <p className="text-xs text-muted-foreground">{row.creator_email}</p>
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      render: (row) => (
        <div className="max-w-xs truncate">
          {row.products.map((p) => p.productName).join(', ')}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <SampleStatusBadge status={row.status} />,
    },
    {
      key: 'requested_at',
      header: 'Requested',
      render: (row) => formatDateTime(row.requested_at),
    },
    {
      key: 'shipped_at',
      header: 'Shipped',
      render: (row) =>
        row.shipped_at ? (
          <div>
            <p>{formatDateTime(row.shipped_at)}</p>
            {row.tracking_number && (
              <p className="text-xs text-muted-foreground">
                {row.tracking_carrier}: {row.tracking_number}
              </p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ]

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">No sample requests found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sample requests will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <SampleActions samples={rows} />
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort="requested_at"
        currentDir="desc"
      />
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

function SamplesTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
