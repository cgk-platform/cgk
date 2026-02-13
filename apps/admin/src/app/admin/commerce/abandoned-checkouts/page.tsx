import { withTenant } from '@cgk-platform/db'
import { Card, CardContent } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  ShoppingCart,
  CheckCircle,
  Percent,
  AlertTriangle,
} from 'lucide-react'

import { Pagination } from '@/components/commerce/pagination'
import { SearchInput } from '@/components/commerce/search-input'
import { formatMoney } from '@/lib/format'
import { parseAbandonedCheckoutFilters, buildFilterUrl } from '@/lib/search-params'
import {
  listAbandonedCheckouts,
  getRecoveryStats,
  getRecoverySettings,
} from '@/lib/abandoned-checkouts/db'
import type { AbandonedCheckout, RecoveryStatsResponse } from '@/lib/abandoned-checkouts/types'

import { RecoverySettingsButton } from './recovery-settings-button'
import { ExpandableRow } from './expandable-row'

const CHECKOUT_STATUSES = ['abandoned', 'processing', 'recovered', 'expired']

export default async function AbandonedCheckoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseAbandonedCheckoutFilters(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abandoned Checkouts</h1>
          <p className="text-sm text-muted-foreground">
            Track and recover abandoned shopping carts
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-32 animate-pulse rounded-md bg-muted" />}>
          <RecoverySettingsLoader />
        </Suspense>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsLoader />
      </Suspense>

      <CheckoutFilterBar filters={filters} />

      <Suspense fallback={<CheckoutsTableSkeleton />}>
        <CheckoutsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function RecoverySettingsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const settings = await withTenant(tenantSlug, async () => {
    return getRecoverySettings()
  })

  return <RecoverySettingsButton settings={settings} />
}

async function StatsLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const stats = await withTenant(tenantSlug, async () => {
    return getRecoveryStats()
  })

  return <StatsCards stats={stats} />
}

function StatsCards({ stats }: { stats: RecoveryStatsResponse }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
              <ShoppingCart className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Abandoned</p>
              <p className="text-2xl font-bold">{stats.totalAbandoned}</p>
              <p className="text-xs text-muted-foreground">
                {stats.todayAbandoned} today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Value at Risk</p>
              <p className="text-2xl font-bold">{formatMoney(stats.valueAtRisk, 'USD')}</p>
              <p className="text-xs text-muted-foreground">
                Avg {formatMoney(stats.averageCartValue, 'USD')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recovered</p>
              <p className="text-2xl font-bold">{stats.totalRecovered}</p>
              <p className="text-xs text-muted-foreground">
                {stats.todayRecovered} today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
              <Percent className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recovery Rate</p>
              <p className="text-2xl font-bold">
                {(stats.recoveryRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {formatMoney(stats.totalRecoveredValue, 'USD')} recovered
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CheckoutFilterBar({ filters }: { filters: ReturnType<typeof parseAbandonedCheckoutFilters> }) {
  const base = '/admin/commerce/abandoned-checkouts'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search by email..." />
      </div>
      <StatusFilter filters={filters} basePath={base} />
    </div>
  )
}

function StatusFilter({
  filters,
  basePath,
}: {
  filters: ReturnType<typeof parseAbandonedCheckoutFilters>
  basePath: string
}) {
  const filterParams: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minValue: filters.minValue || undefined,
    maxValue: filters.maxValue || undefined,
    sort: filters.sort !== 'abandoned_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Status:</span>
      <div className="flex gap-1">
        <Link
          href={buildFilterUrl(basePath, { ...filterParams, status: undefined })}
          className={`rounded-md px-2 py-1 text-xs ${!filters.status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </Link>
        {CHECKOUT_STATUSES.map((status) => (
          <Link
            key={status}
            href={buildFilterUrl(basePath, { ...filterParams, status, page: undefined })}
            className={`rounded-md px-2 py-1 text-xs capitalize ${filters.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {status}
          </Link>
        ))}
      </div>
    </div>
  )
}

async function CheckoutsLoader({ filters }: { filters: ReturnType<typeof parseAbandonedCheckoutFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const result = await withTenant(tenantSlug, async () => {
    return listAbandonedCheckouts({
      status: filters.status as AbandonedCheckout['status'] | undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      minValue: filters.minValue ? Number(filters.minValue) * 100 : undefined,
      maxValue: filters.maxValue ? Number(filters.maxValue) * 100 : undefined,
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort,
      dir: filters.dir,
    })
  })

  const totalPages = Math.ceil(result.total / filters.limit)
  const basePath = '/admin/commerce/abandoned-checkouts'
  const currentFilters: Record<string, string | number | undefined> = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minValue: filters.minValue || undefined,
    maxValue: filters.maxValue || undefined,
    sort: filters.sort !== 'abandoned_at' ? filters.sort : undefined,
    dir: filters.dir !== 'desc' ? filters.dir : undefined,
  }

  return (
    <div className="space-y-4">
      <CheckoutsTable checkouts={result.checkouts} />
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        totalCount={result.total}
        limit={filters.limit}
        basePath={basePath}
        currentFilters={currentFilters}
      />
    </div>
  )
}

function CheckoutsTable({
  checkouts,
}: {
  checkouts: AbandonedCheckout[]
}) {
  if (checkouts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No abandoned checkouts</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When customers abandon their carts, they will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cart Total</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Abandoned</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Emails</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {checkouts.map((checkout) => (
            <ExpandableRow key={checkout.id} checkout={checkout} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CheckoutsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
