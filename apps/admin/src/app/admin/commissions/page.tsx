import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatDateTime, formatMoney } from '@/lib/format'
import {
  getCommissions,
  getCommissionSummary,
  parseCommissionFilters,
  type Commission,
  COMMISSION_STATUSES,
} from '@/lib/creators-admin-ops'
import { buildFilterUrl } from '@/lib/search-params'

import { CommissionStatusBadge } from './commission-status-badge'
import { CommissionActions } from './commission-actions'

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseCommissionFilters(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/commissions/settings"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Settings
          </Link>
        </div>
      </div>

      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <CommissionFilterBar filters={filters} />

      <Suspense fallback={<CommissionsTableSkeleton />}>
        <CommissionsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function SummaryCards() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const summary = await getCommissionSummary(tenantSlug)

  const cards = [
    {
      label: 'Pending',
      value: formatMoney(summary.pending_cents, 'USD'),
      subtext: `${summary.pending_count} orders`,
      color: 'text-amber-600',
    },
    {
      label: 'Approved',
      value: formatMoney(summary.approved_cents, 'USD'),
      subtext: `${summary.approved_count} orders`,
      color: 'text-emerald-600',
    },
    {
      label: 'Paid',
      value: formatMoney(summary.paid_cents, 'USD'),
      subtext: `${summary.paid_count} orders`,
      color: 'text-sky-600',
    },
    {
      label: 'Total YTD',
      value: formatMoney(summary.total_ytd_cents, 'USD'),
      subtext: `${summary.total_ytd_count} orders`,
      color: 'text-foreground',
    },
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
            <p className="mt-0.5 text-xs text-muted-foreground">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CommissionFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parseCommissionFilters>
}) {
  const base = '/admin/commissions'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search orders, creators..." />
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
          {COMMISSION_STATUSES.map((status) => (
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
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function getFilterParams(
  filters: ReturnType<typeof parseCommissionFilters>
): Record<string, string | number | undefined> {
  return {
    search: filters.search || undefined,
    status: filters.status || undefined,
    creatorId: filters.creatorId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }
}

async function CommissionsLoader({
  filters,
}: {
  filters: ReturnType<typeof parseCommissionFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getCommissions(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/commissions'
  const currentFilters = getFilterParams(filters)

  const columns: Column<Commission>[] = [
    {
      key: 'order_number',
      header: 'Order',
      render: (row) => (
        <span className="font-medium">#{row.order_number}</span>
      ),
    },
    {
      key: 'order_date',
      header: 'Date',
      render: (row) => formatDateTime(row.order_date),
    },
    {
      key: 'creator_name',
      header: 'Creator',
      render: (row) => (
        <div>
          <p className="font-medium">{row.creator_name}</p>
          <p className="text-xs text-muted-foreground">{row.promo_code}</p>
        </div>
      ),
    },
    {
      key: 'net_sales_cents',
      header: 'Sales',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{formatMoney(row.net_sales_cents, row.currency)}</span>
      ),
    },
    {
      key: 'commission_cents',
      header: 'Commission',
      className: 'text-right',
      render: (row) => (
        <div className="text-right">
          <span className="font-medium tabular-nums">
            {formatMoney(row.commission_cents, row.currency)}
          </span>
          <p className="text-xs text-muted-foreground">{row.commission_percent}%</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <CommissionStatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-4">
      <CommissionActions commissions={rows} />
      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort="order_date"
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

function CommissionsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
