import { withTenant } from '@cgk-platform/db'
import { Button, Card, CardContent } from '@cgk-platform/ui'
import { FileText, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { EmptyState } from '@/components/commerce/empty-state'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { DocumentCategoryBadge } from '@/components/content/status-badge'
import { getDocuments } from '@/lib/brand-context/db'
import { DOCUMENT_CATEGORIES, type BrandContextDocumentRow } from '@/lib/brand-context/types'
import { formatDateTime } from '@/lib/format'
import { parseDocumentFilters, buildFilterUrl } from '@/lib/search-params'

export default async function BrandContextPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseDocumentFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brand Context</h1>
          <p className="text-muted-foreground">
            Documents that inform AI responses and maintain brand consistency.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/brand-context/new">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

      <DocumentFilterBar filters={filters} />

      <Suspense fallback={<DocumentsTableSkeleton />}>
        <DocumentsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

function DocumentFilterBar({ filters }: { filters: ReturnType<typeof parseDocumentFilters> }) {
  const base = '/admin/brand-context'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    category: filters.category || undefined,
    sort: filters.sort !== 'updated_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search documents..." />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Category:</span>
        <div className="flex flex-wrap gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, category: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={buildFilterUrl(base, { ...filterParams, category: cat.id, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${filters.category === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function DocumentsLoader({ filters }: { filters: ReturnType<typeof parseDocumentFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await withTenant(tenantSlug, () => getDocuments(filters))

  if (rows.length === 0 && !filters.search && !filters.category) {
    return (
      <EmptyState
        icon={FileText}
        title="No brand context documents"
        description="Create documents to help AI understand your brand voice, products, and policies."
        action={{ label: 'Create Document', href: '/admin/brand-context/new' }}
      />
    )
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/brand-context'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    category: filters.category || undefined,
    sort: filters.sort !== 'updated_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<BrandContextDocumentRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link href={`/admin/brand-context/${row.id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (row) => <DocumentCategoryBadge category={row.category} />,
    },
    {
      key: 'version',
      header: 'Version',
      render: (row) => <span className="tabular-nums">v{row.version}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <span className={row.is_active ? 'text-green-600' : 'text-muted-foreground'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      sortable: true,
      render: (row) => (
        <span title={row.updated_by_name ? `by ${row.updated_by_name}` : undefined}>
          {formatDateTime(row.updated_at)}
        </span>
      ),
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

function DocumentsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
