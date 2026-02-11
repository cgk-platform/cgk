import { withTenant } from '@cgk/db'
import { Button, Card, CardContent } from '@cgk/ui'
import { Layout, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { EmptyState } from '@/components/commerce/empty-state'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { PageStatusBadge } from '@/components/content/status-badge'
import { formatDateTime } from '@/lib/format'
import { getPages } from '@/lib/landing-pages/db'
import type { LandingPageRow } from '@/lib/landing-pages/types'
import { parsePageFilters, buildFilterUrl } from '@/lib/search-params'

const PAGE_STATUSES = ['draft', 'published', 'scheduled', 'archived']

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parsePageFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Landing Pages</h1>
        <Button asChild>
          <Link href="/admin/landing-pages/new">
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Link>
        </Button>
      </div>

      <PageFilterBar filters={filters} />

      <Suspense fallback={<PagesTableSkeleton />}>
        <PagesLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function PageFilterBar({ filters }: { filters: ReturnType<typeof parsePageFilters> }) {
  const base = '/admin/landing-pages'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    sort: filters.sort !== 'updated_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search pages..." />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {PAGE_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, { ...filterParams, status, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function PagesLoader({ filters }: { filters: ReturnType<typeof parsePageFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, () => getPages(filters))

  if (rows.length === 0 && !filters.search && !filters.status) {
    return (
      <EmptyState
        icon={Layout}
        title="No landing pages yet"
        description="Create your first landing page to start building custom pages for your store."
        action={{ label: 'Create Page', href: '/admin/landing-pages/new' }}
      />
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/landing-pages'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    sort: filters.sort !== 'updated_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<LandingPageRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/landing-pages/${row.id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'slug',
      header: 'URL',
      sortable: true,
      render: (row) => <span className="text-muted-foreground">/{row.slug}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <PageStatusBadge status={row.status} />,
    },
    {
      key: 'block_count',
      header: 'Blocks',
      render: (row) => <span className="tabular-nums">{row.block_count}</span>,
    },
    {
      key: 'published_at',
      header: 'Published',
      sortable: true,
      render: (row) => row.published_at ? formatDateTime(row.published_at) : '—',
    },
    {
      key: 'updated_at',
      header: 'Updated',
      sortable: true,
      render: (row) => formatDateTime(row.updated_at),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
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

function PagesTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
