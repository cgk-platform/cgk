'use client'

import { useEffect, useState } from 'react'
import { cn } from '@cgk/ui'

import type { AnalyticsOverview, DateRange } from '@/lib/analytics'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

interface OverviewKPIsProps {
  dateRange: DateRange
}

interface KPICardProps {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  inverseColor?: boolean
}

function KPICard({ label, value, change, trend, inverseColor = false }: KPICardProps) {
  const isPositive = trend === 'up'
  const colorClass = inverseColor
    ? isPositive
      ? 'text-red-600'
      : 'text-green-600'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      <span className={cn('text-sm', trend === 'stable' ? 'text-muted-foreground' : colorClass)}>
        {trend === 'up' ? '+' : trend === 'down' ? '' : ''}
        {formatPercent(change / 100)} vs prev
      </span>
    </div>
  )
}

export function OverviewKPIs({ dateRange }: OverviewKPIsProps) {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          preset: dateRange.preset,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        })
        const res = await fetch(`/api/admin/analytics/overview?${params}`)
        const json = await res.json()
        setData(json.overview)
      } catch (error) {
        console.error('Failed to fetch overview:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="mt-2 h-8 w-24 rounded bg-muted" />
            <div className="mt-1 h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">No data available</div>
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-7">
      <KPICard
        label="Revenue"
        value={formatCurrency(data.revenue.value)}
        change={data.revenue.changePercent}
        trend={data.revenue.trend}
      />
      <KPICard
        label="Orders"
        value={formatNumber(data.orders.value)}
        change={data.orders.changePercent}
        trend={data.orders.trend}
      />
      <KPICard
        label="Customers"
        value={formatNumber(data.customers.value)}
        change={data.customers.changePercent}
        trend={data.customers.trend}
      />
      <KPICard
        label="AOV"
        value={formatCurrency(data.aov.value)}
        change={data.aov.changePercent}
        trend={data.aov.trend}
      />
      <KPICard
        label="Conversion"
        value={formatPercent(data.conversionRate.value)}
        change={data.conversionRate.changePercent}
        trend={data.conversionRate.trend}
      />
      <KPICard
        label="Ad Spend"
        value={formatCurrency(data.adSpend.value)}
        change={data.adSpend.changePercent}
        trend={data.adSpend.trend}
        inverseColor
      />
      <KPICard
        label="ROAS"
        value={`${data.roas.value.toFixed(2)}x`}
        change={data.roas.changePercent}
        trend={data.roas.trend}
      />
    </div>
  )
}
