import { Suspense } from 'react'
import { headers } from 'next/headers'

import { Card, CardHeader, CardContent } from '@cgk-platform/ui'

import { getDataQualityOverview, getABTests, getSRMAnalysis } from '@/lib/ab-tests/db'
import { DataQualityOverview } from '@/components/ab-tests/DataQuality/Overview'
import { QualityIssuesList } from '@/components/ab-tests/DataQuality/QualityIssuesList'
import { SRMDashboard } from '@/components/ab-tests/DataQuality/SRMDashboard'
import { NoveltyDashboard } from '@/components/ab-tests/DataQuality/NoveltyDashboard'
import { DriftDashboard } from '@/components/ab-tests/DataQuality/DriftDashboard'

export default function DataQualityPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Quality</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor experiment integrity across all tests
        </p>
      </div>

      {/* Overall Health */}
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewLoader />
      </Suspense>

      {/* Tests with Issues */}
      <Suspense fallback={<SectionSkeleton title="Tests Requiring Attention" />}>
        <IssuesLoader />
      </Suspense>

      {/* SRM Detection */}
      <Suspense fallback={<SectionSkeleton title="Sample Ratio Mismatch" />}>
        <SRMLoader />
      </Suspense>

      {/* Novelty Effects */}
      <Suspense fallback={<SectionSkeleton title="Novelty Effect Detection" />}>
        <NoveltyLoader />
      </Suspense>

      {/* Population Drift */}
      <Suspense fallback={<SectionSkeleton title="Population Drift" />}>
        <DriftLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function OverviewLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <OverviewSkeleton />

  const overview = await getDataQualityOverview(tenantSlug)
  return <DataQualityOverview overview={overview} />
}

async function IssuesLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return null

  const { tests } = await getABTests(tenantSlug, { status: 'running' })

  const testsWithIssues = []
  for (const test of tests) {
    const srm = await getSRMAnalysis(tenantSlug, test.id)
    if (srm?.hasSRM) {
      testsWithIssues.push({ test, issues: ['SRM detected'] })
    }
  }

  return <QualityIssuesList testsWithIssues={testsWithIssues} />
}

async function SRMLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return null

  const { tests } = await getABTests(tenantSlug, { status: 'running' })

  const analyses = []
  for (const test of tests) {
    const analysis = await getSRMAnalysis(tenantSlug, test.id)
    if (analysis) analyses.push(analysis)
  }

  return <SRMDashboard analyses={analyses} />
}

async function NoveltyLoader() {
  return <NoveltyDashboard tests={[]} />
}

async function DriftLoader() {
  return <DriftDashboard tests={[]} />
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-5">
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-8 w-12 rounded bg-slate-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </CardHeader>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  )
}
