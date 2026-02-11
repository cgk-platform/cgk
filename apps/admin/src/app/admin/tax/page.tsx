import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { TaxActionsClient } from './tax-actions-client'

import { Pagination } from '@/components/commerce/pagination'
import { formatMoney } from '@/lib/format'
import { parseTaxFilters, buildFilterUrl } from '@/lib/search-params'
import { getCreatorTaxInfo, getTaxYearSummary } from '@/lib/tax/db'
import { W9_STATUSES } from '@/lib/tax/types'


export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseTaxFilters(params as Record<string, string | undefined>)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tax Management</h1>

      <Suspense fallback={<SummarySkeleton />}>
        <TaxSummaryLoader taxYear={filters.tax_year} />
      </Suspense>

      <TaxFilterBar filters={filters} />

      <Suspense fallback={<TaxListSkeleton />}>
        <TaxLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function TaxSummaryLoader({ taxYear }: { taxYear: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const summary = await getTaxYearSummary(tenantSlug, taxYear)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.total_creators}</div>
          <div className="text-sm text-muted-foreground">Total Creators</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">{summary.w9_approved_count}</span>
            <span className="text-sm text-yellow-600">/ {summary.w9_pending_count} pending</span>
          </div>
          <div className="text-sm text-muted-foreground">W-9 Approved</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{summary.requires_1099_count}</span>
            <span className="text-sm text-green-600">
              {summary.forms_sent_count} sent
            </span>
          </div>
          <div className="text-sm text-muted-foreground">Require 1099-NEC</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {formatMoney(Number(summary.total_reportable_cents))}
          </div>
          <div className="text-sm text-muted-foreground">Total Reportable ({taxYear})</div>
        </CardContent>
      </Card>
    </div>
  )
}

function TaxFilterBar({ filters }: { filters: ReturnType<typeof parseTaxFilters> }) {
  const base = '/admin/tax'
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  const filterParams: Record<string, string | number | undefined> = {
    tax_year: filters.tax_year !== currentYear ? filters.tax_year : undefined,
    w9_status: filters.w9_status || undefined,
    form_1099_status: filters.form_1099_status || undefined,
    requires_1099: filters.requires_1099 || undefined,
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Year:</span>
        <div className="flex gap-1">
          {years.map((year) => (
            <Link
              key={year}
              href={buildFilterUrl(base, {
                ...filterParams,
                tax_year: year !== currentYear ? year : undefined,
              })}
              className={`rounded-md px-2 py-1 text-xs ${filters.tax_year === year ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">W-9:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, w9_status: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.w9_status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          {W9_STATUSES.slice(0, 3).map((status) => (
            <Link
              key={status}
              href={buildFilterUrl(base, { ...filterParams, w9_status: status, page: undefined })}
              className={`rounded-md px-2 py-1 text-xs ${filters.w9_status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {status.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">1099:</span>
        <div className="flex gap-1">
          <Link
            href={buildFilterUrl(base, { ...filterParams, requires_1099: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${!filters.requires_1099 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            All
          </Link>
          <Link
            href={buildFilterUrl(base, { ...filterParams, requires_1099: 'true', page: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${filters.requires_1099 === 'true' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            Required
          </Link>
          <Link
            href={buildFilterUrl(base, { ...filterParams, requires_1099: 'false', page: undefined })}
            className={`rounded-md px-2 py-1 text-xs ${filters.requires_1099 === 'false' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            Not Required
          </Link>
        </div>
      </div>
    </div>
  )
}

async function TaxLoader({ filters }: { filters: ReturnType<typeof parseTaxFilters> }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getCreatorTaxInfo(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/tax'
  const currentFilters: Record<string, string | number | undefined> = {
    tax_year: filters.tax_year !== new Date().getFullYear() ? filters.tax_year : undefined,
    w9_status: filters.w9_status || undefined,
    form_1099_status: filters.form_1099_status || undefined,
    requires_1099: filters.requires_1099 || undefined,
  }

  return (
    <div className="space-y-4">
      <TaxActionsClient creators={rows} taxYear={filters.tax_year} />
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

function TaxListSkeleton() {
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
