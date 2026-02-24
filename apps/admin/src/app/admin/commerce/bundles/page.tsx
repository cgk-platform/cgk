import { Card, CardContent, StatusBadge } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { formatDateTime } from '@/lib/format'
import { getBundles } from '@/lib/bundles/db'
import type { Bundle } from '@/lib/bundles/types'
import { parseBundleFilters } from '@/lib/search-params'
import { BundleStatusFilter } from './bundle-status-filter'

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseBundleFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bundles</h1>
        <p className="text-sm text-muted-foreground">
          Bundle discounts are configured in the Shopify embedded app.
        </p>
      </div>

      <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded bg-muted" />}>
        <div className="flex flex-wrap items-center gap-3">
          <BundleStatusFilter currentStatus={filters.status} />
        </div>
      </Suspense>

      <Suspense fallback={<BundlesTableSkeleton />}>
        <BundlesLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function BundlesLoader({
  filters,
}: {
  filters: ReturnType<typeof parseBundleFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug)
    return <p className="text-muted-foreground">No tenant configured.</p>

  const { bundles, totalCount } = await getBundles(tenantSlug, {
    status: filters.status || undefined,
    limit: filters.limit,
    offset: filters.offset,
  })

  if (bundles.length === 0 && !filters.status) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            No bundles configured. Bundle discounts are managed in the Shopify
            embedded app.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commerce/bundles'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<Bundle>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <Link
          href={`/admin/commerce/bundles/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'discountType',
      header: 'Discount Type',
      render: (row) => (
        <StatusBadge
          status={row.discountType}
          variant="outline"
          label={row.discountType === 'percentage' ? 'Percentage' : 'Fixed'}
        />
      ),
    },
    {
      key: 'tiers',
      header: 'Tiers',
      render: (row) => {
        const count = row.tiers?.length ?? 0
        return (
          <span className="text-muted-foreground">
            {count} {count === 1 ? 'tier' : 'tiers'}
          </span>
        )
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={bundles}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
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

function BundlesTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 animate-fade-up"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
