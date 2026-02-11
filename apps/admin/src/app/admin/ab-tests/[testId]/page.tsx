import { Suspense } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getABTest, getVariants, getTestResults, getGuardrails } from '@/lib/ab-tests/db'
import {
  TestHeader,
  TestHeaderSkeleton,
} from '@/components/ab-tests/ResultsDashboard/TestHeader'
import {
  SignificanceBanner,
  SignificanceBannerSkeleton,
} from '@/components/ab-tests/ResultsDashboard/SignificanceBanner'
import {
  VariantTable,
  VariantTableSkeleton,
} from '@/components/ab-tests/ResultsDashboard/VariantTable'
import { ConversionChart } from '@/components/ab-tests/ResultsDashboard/ConversionChart'
import { FunnelChart } from '@/components/ab-tests/ResultsDashboard/FunnelChart'
import { TestConfigCard } from '@/components/ab-tests/ResultsDashboard/TestConfigCard'
import { DataQualityCard } from '@/components/ab-tests/ResultsDashboard/DataQualityCard'
import { GuardrailStatus } from '@/components/ab-tests/ResultsDashboard/GuardrailStatus'
import { TestActions } from '@/components/ab-tests/TestActions'
import { SegmentAnalysisTabs } from '@/components/ab-tests/ResultsDashboard/SegmentAnalysisTabs'

interface PageProps {
  params: Promise<{ testId: string }>
}

export default async function TestDetailPage({ params }: PageProps) {
  const { testId } = await params

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/ab-tests"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to tests
      </Link>

      {/* Header */}
      <Suspense fallback={<TestHeaderSkeleton />}>
        <TestHeaderLoader testId={testId} />
      </Suspense>

      {/* Significance Banner */}
      <Suspense fallback={<SignificanceBannerSkeleton />}>
        <SignificanceBannerLoader testId={testId} />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Results */}
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<VariantTableSkeleton />}>
            <VariantTableLoader testId={testId} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <ConversionChartLoader testId={testId} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <FunnelChartLoader testId={testId} />
          </Suspense>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <Suspense fallback={<CardSkeleton />}>
            <TestConfigLoader testId={testId} />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <DataQualityLoader testId={testId} />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <GuardrailLoader testId={testId} />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <TestActionsLoader testId={testId} />
          </Suspense>
        </div>
      </div>

      {/* Segment Analysis */}
      <Suspense fallback={<ChartSkeleton />}>
        <SegmentAnalysisLoader testId={testId} />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function TestHeaderLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <TestHeaderSkeleton />

  const test = await getABTest(tenantSlug, testId)
  if (!test) notFound()

  const variants = await getVariants(tenantSlug, testId)
  return <TestHeader test={test} variants={variants} />
}

async function SignificanceBannerLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <SignificanceBannerSkeleton />

  const results = await getTestResults(tenantSlug, testId)
  if (!results) return null

  return <SignificanceBanner results={results} />
}

async function VariantTableLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <VariantTableSkeleton />

  const results = await getTestResults(tenantSlug, testId)
  if (!results) return null

  return <VariantTable results={results} />
}

async function ConversionChartLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <ChartSkeleton />

  return <ConversionChart testId={testId} />
}

async function FunnelChartLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <ChartSkeleton />

  return <FunnelChart testId={testId} />
}

async function TestConfigLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <CardSkeleton />

  const test = await getABTest(tenantSlug, testId)
  if (!test) return null

  return <TestConfigCard test={test} />
}

async function DataQualityLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <CardSkeleton />

  return <DataQualityCard testId={testId} />
}

async function GuardrailLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <CardSkeleton />

  const guardrails = await getGuardrails(tenantSlug, testId)
  return <GuardrailStatus guardrails={guardrails} />
}

async function TestActionsLoader({ testId }: { testId: string }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return <CardSkeleton />

  const test = await getABTest(tenantSlug, testId)
  if (!test) return null

  return <TestActions test={test} />
}

async function SegmentAnalysisLoader({ testId }: { testId: string }) {
  return <SegmentAnalysisTabs testId={testId} />
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-64 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-20 rounded bg-slate-100" />
      </div>
    </div>
  )
}
