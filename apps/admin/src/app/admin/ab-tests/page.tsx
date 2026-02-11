import { Suspense } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@cgk/ui'

import { getABTests, getQuickStats } from '@/lib/ab-tests/db'
import { ABTestQuickStats, QuickStatsSkeleton } from '@/components/ab-tests/QuickStats'
import { ABTestFilters } from '@/components/ab-tests/TestFilters'
import { ABTestList, TestListSkeleton } from '@/components/ab-tests/TestList'

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ABTestsPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">A/B Tests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Experiment with landing pages, checkout flows, and email templates
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ab-tests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Test
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<QuickStatsSkeleton />}>
        <QuickStatsLoader />
      </Suspense>

      {/* Filters */}
      <ABTestFilters
        status={params.status}
        testType={params.testType}
        search={params.search}
      />

      {/* Test List */}
      <Suspense fallback={<TestListSkeleton />}>
        <TestListLoader
          status={params.status}
          testType={params.testType}
          search={params.search}
          page={params.page ? parseInt(params.page, 10) : 1}
          sort={params.sort}
          dir={params.dir as 'asc' | 'desc' | undefined}
        />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function QuickStatsLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <QuickStatsSkeleton />
  }

  const stats = await getQuickStats(tenantSlug)
  return <ABTestQuickStats stats={stats} />
}

async function TestListLoader({
  status,
  testType,
  search,
  page,
  sort,
  dir,
}: {
  status?: string
  testType?: string
  search?: string
  page: number
  sort?: string
  dir?: 'asc' | 'desc'
}) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <TestListSkeleton />
  }

  const { tests, total } = await getABTests(tenantSlug, {
    status: status as 'draft' | 'running' | 'paused' | 'completed' | undefined,
    testType: testType as
      | 'landing_page'
      | 'shipping'
      | 'email'
      | 'checkout'
      | 'pricing'
      | undefined,
    search,
    page,
    limit: 20,
    sort,
    dir,
  })

  return (
    <ABTestList
      tests={tests}
      total={total}
      page={page}
      limit={20}
      currentFilters={{ status, testType, search }}
      currentSort={sort}
      currentDir={dir}
    />
  )
}
