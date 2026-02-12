import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cgk/ui'

import {
  getApplicationFunnel,
  getCreatorHealth,
  getCreatorOverviewKPIs,
  getEarningsAnalytics,
  getPerformanceLeaderboard,
} from '@/lib/creators/analytics'
import type { AnalyticsPeriod } from '@/lib/creators/analytics-types'

import {
  AnalyticsKPICards,
  AnalyticsKPICardsSkeleton,
} from './components/analytics-kpi-cards'
import { EarningsChart, EarningsChartSkeleton } from './components/earnings-chart'
import { FunnelChart, FunnelChartSkeleton } from './components/funnel-chart'
import { HealthDashboard, HealthDashboardSkeleton } from './components/health-dashboard'
import { Leaderboard, LeaderboardSkeleton } from './components/leaderboard'
import { PeriodSelector } from './components/period-selector'

const VALID_PERIODS = ['7d', '30d', '90d', '12m', 'all'] as const

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

export default async function CreatorAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const periodParam = (params.period as string) || '30d'
  const period: AnalyticsPeriod = VALID_PERIODS.includes(periodParam as AnalyticsPeriod)
    ? (periodParam as AnalyticsPeriod)
    : '30d'

  const tab = (params.tab as string) || 'overview'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track performance, health, and trends across your creator program
          </p>
        </div>
      </div>

      {/* Period selector */}
      <PeriodSelector currentPeriod={period} />

      {/* KPI Cards */}
      <Suspense fallback={<AnalyticsKPICardsSkeleton />}>
        <KPICardsLoader period={period} />
      </Suspense>

      {/* Tabbed content */}
      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<FunnelChartSkeleton />}>
              <FunnelLoader period={period} />
            </Suspense>
            <Suspense fallback={<LeaderboardSkeleton />}>
              <LeaderboardLoader period={period} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="funnel">
          <Suspense fallback={<FunnelChartSkeleton />}>
            <FunnelLoader period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="earnings">
          <Suspense fallback={<EarningsChartSkeleton />}>
            <EarningsLoader period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="health">
          <Suspense fallback={<HealthDashboardSkeleton />}>
            <HealthLoader />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function KPICardsLoader({ period }: { period: AnalyticsPeriod }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const kpis = await getCreatorOverviewKPIs(tenantSlug, period)
  return <AnalyticsKPICards kpis={kpis} />
}

async function FunnelLoader({ period }: { period: AnalyticsPeriod }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const funnel = await getApplicationFunnel(tenantSlug, period)
  return <FunnelChart funnel={funnel} />
}

async function LeaderboardLoader({ period }: { period: AnalyticsPeriod }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const leaderboard = await getPerformanceLeaderboard(tenantSlug, 'earnings', period, 10)
  return <Leaderboard leaderboard={leaderboard} title="Top Earners" />
}

async function EarningsLoader({ period }: { period: AnalyticsPeriod }) {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const earnings = await getEarningsAnalytics(tenantSlug, period)
  return <EarningsChart earnings={earnings} />
}

async function HealthLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <p className="text-sm text-muted-foreground">No tenant configured.</p>
  }

  const health = await getCreatorHealth(tenantSlug)
  return <HealthDashboard health={health} />
}
