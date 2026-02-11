import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { PayoutsClient } from './payouts-client'

import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatMoney } from '@/lib/format'
import { getWithdrawals, getPayoutSummary } from '@/lib/payouts/db'
import { WITHDRAWAL_STATUSES, PAYOUT_METHODS } from '@/lib/payouts/types'
import { parseWithdrawalFilters, buildFilterUrl } from '@/lib/search-params'


export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseWithdrawalFilters(params as Record<string, string | undefined>)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payouts</h1>

      <Suspense fallback={<SummarySkeleton />}>
        <PayoutSummaryLoader />
      </Suspense>

      <PayoutFilterBar filters={filters} />

      <Suspense fallback={<PayoutsListSkeleton />}>
        <PayoutsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function PayoutSummaryLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const summary = await getPayoutSummary(tenantSlug)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.pending_count}</div>
          <div className="text-sm text-muted-foreground">Pending Requests</div>
          <div className="mt-1 text-sm font-medium">
            {formatMoney(Number(summary.pending_amount_cents))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.processing_count}</div>
          <div className="text-sm text-muted-foreground">Processing</div>
          <div className="mt-1 text-sm font-medium">
            {formatMoney(Number(summary.processing_amount_cents))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">
            {formatMoney(Number(summary.completed_this_month_cents))}
          </div>
          <div className="text-sm text-muted-foreground">Paid This Month</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {formatMoney(Number(summary.completed_total_cents))}
          </div>
          <div className="text-sm text-muted-foreground">Total Paid (All Time)</div>
        </CardContent>
      </Card>
    </div>
  )
}

function PayoutFilterBar({ filters }: { filters: ReturnType<typeof parseWithdrawalFilters> }) {
  const base = '/admin/payouts'
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    method: filters.method || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search by creator..." />
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
          {WITHDRAWAL_STATUSES.map((status) => (
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
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Method:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, method: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.method ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {PAYOUT_METHODS.map((method) => (
            <Link
              key={method}
              href={buildFilterUrl(base, { ...filterParams, method, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs capitalize ${filters.method === method ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {method}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

async function PayoutsLoader({ filters }: { filters: ReturnType<typeof parseWithdrawalFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getWithdrawals(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/payouts'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    method: filters.method || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }

  return (
    <div className="space-y-4">
      <PayoutsClient withdrawals={rows} />
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

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PayoutsListSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
