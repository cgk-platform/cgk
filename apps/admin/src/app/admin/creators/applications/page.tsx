import { Card, CardContent, Badge } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { SearchInput } from '@/components/commerce/search-input'
import { Pagination } from '@/components/commerce/pagination'
import {
  getApplications,
  getApplicationStatusCounts,
  parseApplicationFilters,
} from '@/lib/creators-admin-ops'
import { buildFilterUrl } from '@/lib/search-params'

import { ApplicationCard } from './application-card'

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseApplicationFilters(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Creator Applications</h1>
      </div>

      <Suspense fallback={<StatusTabsSkeleton />}>
        <StatusTabs currentStatus={filters.status} />
      </Suspense>

      <ApplicationFilterBar filters={filters} />

      <Suspense fallback={<ApplicationsListSkeleton />}>
        <ApplicationsLoader filters={filters} />
      </Suspense>
    </div>
  )
}

async function StatusTabs({ currentStatus }: { currentStatus: string }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const counts = await getApplicationStatusCounts(tenantSlug)
  const newCount = counts['new'] || 0

  const tabs = [
    { status: '', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { status: 'new', label: 'New', count: newCount, highlight: newCount > 0 },
    { status: 'in_review', label: 'In Review', count: counts['in_review'] || 0 },
    { status: 'approved', label: 'Approved', count: counts['approved'] || 0 },
    { status: 'waitlisted', label: 'Waitlisted', count: counts['waitlisted'] || 0 },
    { status: 'rejected', label: 'Rejected', count: counts['rejected'] || 0 },
  ]

  return (
    <div className="flex gap-2 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.status}
          href={buildFilterUrl('/admin/creators/applications', {
            status: tab.status || undefined,
          })}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            currentStatus === tab.status
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <Badge
              variant={tab.highlight && currentStatus !== tab.status ? 'default' : 'secondary'}
              className="text-xs"
            >
              {tab.count}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  )
}

function StatusTabsSkeleton() {
  return (
    <div className="flex gap-2 border-b pb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 w-24 animate-pulse rounded bg-muted" />
      ))}
    </div>
  )
}

function ApplicationFilterBar({}: {
  filters: ReturnType<typeof parseApplicationFilters>
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput placeholder="Search by name or email..." />
      </div>
    </div>
  )
}

function getFilterParams(
  filters: ReturnType<typeof parseApplicationFilters>
): Record<string, string | number | undefined> {
  return {
    search: filters.search || undefined,
    status: filters.status || undefined,
    source: filters.source || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }
}

async function ApplicationsLoader({
  filters,
}: {
  filters: ReturnType<typeof parseApplicationFilters>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const { rows, totalCount } = await getApplications(tenantSlug, filters)
  const totalPages = Math.ceil(totalCount / filters.limit)
  const basePath = '/admin/creators/applications'
  const currentFilters = getFilterParams(filters)

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">No applications found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.status
              ? `No ${filters.status.replace('_', ' ')} applications`
              : 'Applications will appear here when creators apply'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {rows.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
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

function ApplicationsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-60 animate-pulse rounded bg-muted" />
                <div className="h-4 w-80 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
