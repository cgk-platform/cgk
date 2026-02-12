import { Badge, Card, CardContent } from '@cgk/ui'
import { BanknoteIcon, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { EmptyState } from '@/components/commerce/empty-state'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { ContractorActions, ContractorFilters, ContractorStatusBadge } from '@/components/contractors'
import { formatDate, formatMoney } from '@/lib/format'
import { getAllContractorTags, getContractorDirectory } from '@/lib/contractors/db'
import type { ContractorDirectoryItem, ContractorStatus } from '@/lib/contractors/types'
import { parseContractorFilters } from '@/lib/search-params'

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseContractorFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contractors</h1>
          <p className="text-sm text-muted-foreground">
            Manage contractors, projects, and payment requests
          </p>
        </div>
        <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded bg-muted" />}>
          <ContractorActionsLoader />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-full sm:w-64">
          <SearchInput placeholder="Search by name or email..." />
        </div>
        <Suspense fallback={null}>
          <ContractorFiltersLoader />
        </Suspense>
      </div>

      <Suspense fallback={<ContractorsTableSkeleton />}>
        <ContractorsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function ContractorActionsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const result = await getContractorDirectory(tenantSlug, { limit: 1 })
  return <ContractorActions totalCount={result.totalCount} />
}

async function ContractorFiltersLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const tags = await getAllContractorTags(tenantSlug)
  return <ContractorFilters availableTags={tags} />
}

async function ContractorsLoader({
  filters,
}: {
  filters: ReturnType<typeof parseContractorFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const result = await getContractorDirectory(tenantSlug, {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? (filters.status as ContractorStatus[]) : undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    hasPaymentMethod: filters.hasPaymentMethod ?? undefined,
    hasW9: filters.hasW9 ?? undefined,
    sortBy: filters.sort as 'name' | 'createdAt' | 'balance' | 'projectCount',
    sortDir: filters.dir,
    page: filters.page,
    limit: filters.limit,
  })

  if (result.totalCount === 0 && !filters.search && filters.status.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contractors yet"
        description="Invite your first contractor to get started with project-based work."
        action={{
          label: 'Invite Contractor',
          href: '/admin/contractors/invite',
        }}
      />
    )
  }

  const basePath = '/admin/contractors'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status.join(',') : undefined,
    tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
    hasPaymentMethod:
      filters.hasPaymentMethod !== null ? String(filters.hasPaymentMethod) : undefined,
    hasW9: filters.hasW9 !== null ? String(filters.hasW9) : undefined,
    sort: filters.sort !== 'createdAt' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<ContractorDirectoryItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/contractors/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.name}
          </Link>
          <ContractorStatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <div className="text-right">
          <div className="font-mono font-medium">
            {formatMoney(row.balanceAvailableCents)}
          </div>
          {row.balancePendingCents > 0 && (
            <div className="text-xs text-muted-foreground">
              +{formatMoney(row.balancePendingCents)} pending
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'projectCount',
      header: 'Projects',
      sortable: true,
      className: 'text-center',
      render: (row) => (
        <span className="font-mono">{row.activeProjectCount}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      className: 'text-center',
      render: (row) =>
        row.hasPaymentMethod ? (
          <span className="text-green-600" title="Payment method set">
            <BanknoteIcon className="mx-auto h-4 w-4" />
          </span>
        ) : (
          <span className="text-muted-foreground" title="No payment method">
            <span className="text-xs">--</span>
          </span>
        ),
    },
    {
      key: 'w9',
      header: 'W-9',
      className: 'text-center',
      render: (row) =>
        row.hasW9 ? (
          <span className="text-green-600" title="W-9 submitted">
            <CheckCircle className="mx-auto h-4 w-4" />
          </span>
        ) : (
          <span className="text-yellow-600" title="W-9 missing">
            <AlertTriangle className="mx-auto h-4 w-4" />
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {result.totalCount} contractor{result.totalCount !== 1 ? 's' : ''}
        </span>
        {filters.tags.length > 0 && (
          <div className="flex gap-1">
            {filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={result.contractors}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        limit={result.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function ContractorsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
