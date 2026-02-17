import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import {
  SubscriptionStatusBadge,
  SubscriptionFrequencyBadge,
} from '@/components/commerce/status-badge'
import { formatDateTime, formatMoney } from '@/lib/format'
import { parseSubscriptionFilters, buildFilterUrl } from '@/lib/search-params'
import {
  listSubscriptions,
  getStatusCounts,
  getMRR,
} from '@/lib/subscriptions/service'

import type { SubscriptionListItem, SubscriptionStatus } from '@/lib/subscriptions/types'

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'active',
  'paused',
  'cancelled',
  'expired',
  'pending',
]

const FREQUENCIES = [
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannually',
  'annually',
]

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseSubscriptionFilters(params)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <SubscriptionStats />
      </Suspense>

      <SubscriptionFilterBar filters={filters} />

      <Suspense fallback={<SubscriptionsTableSkeleton />}>
        <SubscriptionsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function SubscriptionStats() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const [counts, mrr] = await Promise.all([
    getStatusCounts(tenantSlug),
    getMRR(tenantSlug),
  ])

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      <StatsCard label="MRR" value={formatMoney(mrr, 'USD')} highlight />
      <StatsCard label="Total" value={counts.all.toString()} />
      <StatsCard label="Active" value={counts.active.toString()} variant="success" />
      <StatsCard label="Paused" value={counts.paused.toString()} variant="warning" />
      <StatsCard label="Cancelled" value={counts.cancelled.toString()} variant="destructive" />
      <StatsCard label="Pending" value={counts.pending.toString()} variant="muted" />
    </div>
  )
}

function StatsCard({
  label,
  value,
  variant,
  highlight,
}: {
  label: string
  value: string
  variant?: 'success' | 'warning' | 'destructive' | 'muted'
  highlight?: boolean
}) {
  const variantClasses = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  }

  return (
    <Card className={highlight ? 'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent' : ''}>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${variant ? variantClasses[variant] : ''} ${highlight ? 'text-gold' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function SubscriptionFilterBar({
  filters,
}: {
  filters: ReturnType<typeof parseSubscriptionFilters>
}) {
  const base = '/admin/commerce/subscriptions'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search subscriptions..." />
      </div>
      <FilterSelect
        label="Status"
        value={filters.status}
        options={SUBSCRIPTION_STATUSES}
        paramName="status"
        filters={filters}
        basePath={base}
      />
      <FilterSelect
        label="Frequency"
        value={filters.frequency}
        options={FREQUENCIES}
        paramName="frequency"
        filters={filters}
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
  filters,
  basePath,
}: {
  label: string
  value: string
  options: string[]
  paramName: string
  filters: ReturnType<typeof parseSubscriptionFilters>
  basePath: string
}) {
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    frequency: filters.frequency || undefined,
    product: filters.product || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex flex-wrap gap-1">
        <Link
          href={buildFilterUrl(basePath, { ...filterParams, [paramName]: undefined })}
          className={`rounded-md px-2 py-1 text-xs ${!value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </Link>
        {options.map((opt) => (
          <Link
            key={opt}
            href={buildFilterUrl(basePath, {
              ...filterParams,
              [paramName]: opt,
              page: undefined,
            })}
            className={`rounded-md px-2 py-1 text-xs capitalize ${value === opt ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {opt.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function SubscriptionsLoader({
  filters,
}: {
  filters: ReturnType<typeof parseSubscriptionFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const { subscriptions, total } = await listSubscriptions(tenantSlug, filters)

  const totalPages = Math.ceil(total / filters.limit)
  const basePath = '/admin/commerce/subscriptions'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    frequency: filters.frequency || undefined,
    product: filters.product || undefined,
    sort: filters.sort !== 'created_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  const columns: Column<SubscriptionListItem>[] = [
    {
      key: 'customerEmail',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            href={`/admin/commerce/subscriptions/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.customerEmail}
          </Link>
          {row.customerName && (
            <div className="text-sm text-muted-foreground">{row.customerName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'productTitle',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium">{row.productTitle}</div>
          {row.variantTitle && (
            <div className="text-sm text-muted-foreground">{row.variantTitle}</div>
          )}
          <div className="text-sm text-muted-foreground">Qty: {row.quantity}</div>
        </div>
      ),
    },
    {
      key: 'priceCents',
      header: 'Price',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatMoney(row.priceCents, row.currency)}</span>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: (row) => <SubscriptionFrequencyBadge frequency={row.frequency} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <SubscriptionStatusBadge status={row.status} />,
    },
    {
      key: 'nextBillingDate',
      header: 'Next Billing',
      sortable: true,
      render: (row) =>
        row.nextBillingDate ? formatDateTime(row.nextBillingDate) : '—',
    },
    {
      key: 'totalOrders',
      header: 'Orders',
      className: 'text-right',
      render: (row) => row.totalOrders.toString(),
    },
    {
      key: 'totalSpentCents',
      header: 'Total Spent',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">
          {formatMoney(row.totalSpentCents, row.currency)}
        </span>
      ),
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
        rows={subscriptions}
        keyFn={(r) => r.id}
        basePath={basePath}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={total}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SubscriptionsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
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
