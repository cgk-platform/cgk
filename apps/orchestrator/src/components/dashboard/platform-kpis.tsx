'use client'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AlertsKPICard, KPICard, StatusKPICard } from './kpi-card'
import type { PlatformKPIs } from '../../types/platform'

interface PlatformKPIsProps {
  /** KPI data */
  data: PlatformKPIs
  /** Whether data is loading */
  isLoading?: boolean
}

/**
 * Platform KPIs grid displaying all 6 key metrics
 *
 * Layout:
 * - Desktop: 6 columns in single row
 * - Tablet: 3x2 grid
 * - Mobile: 2x3 grid
 */
export function PlatformKPIsGrid({ data, isLoading }: PlatformKPIsProps) {
  const router = useRouter()

  if (isLoading) {
    return <PlatformKPIsSkeleton />
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KPICard
        title="Total GMV"
        value={data.totalGMV.value}
        change={data.totalGMV.change}
        changeLabel="vs last 30d"
        isCurrency
        icon={<DollarSign className="h-4 w-4" />}
        onClick={() => router.push('/analytics')}
      />

      <KPICard
        title="Platform MRR"
        value={data.platformMRR.value}
        change={data.platformMRR.change}
        changeLabel="vs last month"
        isCurrency
        icon={<TrendingUp className="h-4 w-4" />}
        onClick={() => router.push('/analytics')}
      />

      <KPICard
        title="Total Brands"
        value={data.totalBrands}
        icon={<Building2 className="h-4 w-4" />}
        onClick={() => router.push('/brands')}
      />

      <KPICard
        title="Active Brands"
        value={data.activeBrands}
        icon={<BarChart3 className="h-4 w-4" />}
        onClick={() => router.push('/brands?status=active')}
      />

      <StatusKPICard
        title="System Status"
        status={data.systemStatus}
        details={`${data.uptimePercent.toFixed(2)}% uptime`}
        onClick={() => router.push('/ops/health')}
      />

      <AlertsKPICard
        title="Open Alerts"
        p1={data.openAlerts.p1}
        p2={data.openAlerts.p2}
        p3={data.openAlerts.p3}
        onClick={() => router.push('/ops/errors')}
      />
    </div>
  )
}

/**
 * Loading skeleton for KPIs grid
 */
function PlatformKPIsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[100px] animate-pulse rounded-xl border bg-card"
        >
          <div className="p-4">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-3 h-6 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Secondary metrics row for additional KPIs
 */
export function SecondaryMetrics({ data }: { data: PlatformKPIs }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KPICard
        title="Error Rate (24h)"
        value={`${data.errorRate24h.toFixed(2)}%`}
        icon={<AlertTriangle className="h-4 w-4" />}
        className={
          data.errorRate24h > 1
            ? 'border-red-500/50'
            : data.errorRate24h > 0.5
              ? 'border-yellow-500/50'
              : ''
        }
      />

      <KPICard
        title="Avg Latency"
        value={`${data.avgLatency.toFixed(0)}ms`}
        icon={<Activity className="h-4 w-4" />}
        className={
          data.avgLatency > 500
            ? 'border-red-500/50'
            : data.avgLatency > 200
              ? 'border-yellow-500/50'
              : ''
        }
      />

      <KPICard
        title="Pending Jobs"
        value={data.pendingJobs}
        icon={<Activity className="h-4 w-4" />}
      />

      <KPICard
        title="Failed Jobs (24h)"
        value={data.failedJobs24h}
        icon={<AlertTriangle className="h-4 w-4" />}
        className={data.failedJobs24h > 0 ? 'border-yellow-500/50' : ''}
      />
    </div>
  )
}
