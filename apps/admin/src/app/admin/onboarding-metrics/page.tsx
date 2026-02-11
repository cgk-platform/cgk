import { Card, CardContent, CardHeader } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import {
  getOnboardingMetrics,
  getStepCompletionMetrics,
  getStuckCreators,
  parseOnboardingPeriod,
} from '@/lib/creators-admin-ops'
import { buildFilterUrl } from '@/lib/search-params'

import { StuckCreatorsList } from './stuck-creators-list'

export default async function OnboardingMetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const periodParam = Array.isArray(params.period) ? params.period[0] : params.period
  const period = parseOnboardingPeriod(periodParam)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Metrics</h1>
        <PeriodSelector currentPeriod={periodParam || '30d'} />
      </div>

      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards period={period} />
      </Suspense>

      <Suspense fallback={<FunnelSkeleton />}>
        <OnboardingFunnel period={period} />
      </Suspense>

      <Suspense fallback={<StepMetricsSkeleton />}>
        <StepCompletionRates />
      </Suspense>

      <Suspense fallback={<StuckCreatorsSkeleton />}>
        <StuckCreatorsSection />
      </Suspense>
    </div>
  )
}

function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
  const periods = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
  ]

  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {periods.map((p) => (
        <Link
          key={p.value}
          href={buildFilterUrl('/admin/onboarding-metrics', { period: p.value })}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            currentPeriod === p.value
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  )
}

async function MetricsCards({ period }: { period: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const metrics = await getOnboardingMetrics(tenantSlug, period)

  const cards = [
    {
      label: 'Applications Received',
      value: metrics.applications_received.toString(),
      subtext: `Last ${period} days`,
    },
    {
      label: 'Approval Rate',
      value: `${metrics.approval_rate.toFixed(0)}%`,
      subtext: 'of applications',
    },
    {
      label: 'Onboarding Completion',
      value: `${metrics.onboarding_completed_rate.toFixed(0)}%`,
      subtext: `${metrics.onboarding_completed_count} completed`,
    },
    {
      label: 'Avg Time to Complete',
      value: `${metrics.avg_completion_days.toFixed(0)} days`,
      subtext: 'for required steps',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MetricsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function OnboardingFunnel({ period }: { period: number }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const metrics = await getOnboardingMetrics(tenantSlug, period)

  const funnelSteps = [
    { label: 'Applications', value: metrics.applications_received, rate: 100 },
    {
      label: 'Approved',
      value: Math.round(metrics.applications_received * (metrics.approval_rate / 100)),
      rate: metrics.approval_rate,
    },
    {
      label: 'Started Onboarding',
      value: metrics.onboarding_started_count,
      rate: metrics.onboarding_started_rate,
    },
    {
      label: 'Completed Onboarding',
      value: metrics.onboarding_completed_count,
      rate: metrics.onboarding_completed_rate,
    },
    {
      label: 'Active (30d)',
      value: metrics.active_30d_count,
      rate: metrics.active_30d_rate,
    },
  ]

  const maxValue = Math.max(...funnelSteps.map((s) => s.value), 1)

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Onboarding Funnel</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelSteps.map((step) => (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {step.value} ({step.rate.toFixed(0)}%)
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(step.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FunnelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function StepCompletionRates() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const stepMetrics = await getStepCompletionMetrics(tenantSlug)

  if (stepMetrics.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Step Completion Rates</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Step</th>
                <th className="pb-2 text-right font-medium">Completed</th>
                <th className="pb-2 text-right font-medium">Pending</th>
                <th className="pb-2 text-right font-medium">Avg Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stepMetrics.map((step) => (
                <tr key={step.step_id}>
                  <td className="py-2">{step.step_name}</td>
                  <td className="py-2 text-right tabular-nums">{step.completed_count}</td>
                  <td className="py-2 text-right tabular-nums">
                    {step.pending_count > 0 ? (
                      <span className="text-amber-600">{step.pending_count}</span>
                    ) : (
                      step.pending_count
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {step.avg_days.toFixed(1)} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function StepMetricsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function StuckCreatorsSection() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return null

  const stuckCreators = await getStuckCreators(tenantSlug, 14)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Stuck Creators
            {stuckCreators.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {stuckCreators.length}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Onboarding incomplete {'>'} 14 days
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {stuckCreators.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No creators stuck in onboarding
          </p>
        ) : (
          <StuckCreatorsList creators={stuckCreators} />
        )}
      </CardContent>
    </Card>
  )
}

function StuckCreatorsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
