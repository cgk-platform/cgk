'use client'

import { Suspense, useEffect, useState } from 'react'

import {
  useAttribution,
  ModelSelector,
  TimeRangePicker,
  AttributionKpiCards,
  AttributionKpiCardsSkeleton,
  ChannelBreakdownChart,
  ChannelBreakdownSkeleton,
  PlatformComparisonWidget,
  PlatformComparisonSkeleton,
} from '@/components/attribution'
import type { AttributionOverview } from '@/lib/attribution'

function AttributionDashboardContent() {
  const { model, window, startDate, endDate, isRealtime, setIsRealtime } = useAttribution()
  const [overview, setOverview] = useState<AttributionOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          model,
          window,
          startDate,
          endDate,
        })
        const response = await fetch(`/api/admin/attribution/overview?${params}`)
        const data = await response.json()
        setOverview(data.overview)
      } catch (error) {
        console.error('Failed to fetch attribution overview:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverview()
  }, [model, window, startDate, endDate])

  // Set up real-time polling if enabled
  useEffect(() => {
    if (!isRealtime) return

    const interval = setInterval(async () => {
      const params = new URLSearchParams({
        model,
        window,
        startDate,
        endDate,
      })
      const response = await fetch(`/api/admin/attribution/overview?${params}`)
      const data = await response.json()
      setOverview(data.overview)
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [isRealtime, model, window, startDate, endDate])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ModelSelector />
          <TimeRangePicker />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRealtime}
              onChange={(e) => setIsRealtime(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground">Real-time updates</span>
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading || !overview ? (
        <AttributionKpiCardsSkeleton />
      ) : (
        <AttributionKpiCards data={overview.kpis} />
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isLoading || !overview ? (
          <>
            <ChannelBreakdownSkeleton />
            <PlatformComparisonSkeleton />
          </>
        ) : (
          <>
            <ChannelBreakdownChart data={overview.channelBreakdown} />
            <PlatformComparisonWidget data={overview.platformComparison} />
          </>
        )}
      </div>
    </div>
  )
}

export default function AttributionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-9 w-40 animate-pulse rounded bg-muted" />
            <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          </div>
          <AttributionKpiCardsSkeleton />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChannelBreakdownSkeleton />
            <PlatformComparisonSkeleton />
          </div>
        </div>
      }
    >
      <AttributionDashboardContent />
    </Suspense>
  )
}
