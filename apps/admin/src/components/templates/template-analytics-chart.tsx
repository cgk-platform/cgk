'use client'

import { cn } from '@cgk/ui'
import { useMemo } from 'react'

export interface TrendData {
  date: string
  sends: number
  opens: number
  clicks: number
}

export interface TemplateAnalyticsChartProps {
  data: TrendData[]
  metric: 'sends' | 'opens' | 'clicks'
  period: '7d' | '30d' | '90d'
}

export function TemplateAnalyticsChart({
  data,
  metric,
  period: _period,
}: TemplateAnalyticsChartProps) {
  const { maxValue, chartData } = useMemo(() => {
    const values = data.map((d) => d[metric])
    const max = Math.max(...values, 1)
    return {
      maxValue: max,
      chartData: data.map((d) => ({
        ...d,
        value: d[metric],
        height: (d[metric] / max) * 100,
      })),
    }
  }, [data, metric])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data available for this period
      </div>
    )
  }

  const metricLabels = {
    sends: 'Sends',
    opens: 'Opens',
    clicks: 'Clicks',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{metricLabels[metric]} over time</span>
        <span className="text-muted-foreground">
          Max: {maxValue.toLocaleString()}
        </span>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-32">
        {chartData.map((point, index) => (
          <div
            key={point.date || index}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div
              className={cn(
                'w-full rounded-t transition-all',
                metric === 'sends' && 'bg-primary',
                metric === 'opens' && 'bg-green-500',
                metric === 'clicks' && 'bg-blue-500',
                'group-hover:opacity-80'
              )}
              style={{ height: `${Math.max(point.height, 2)}%` }}
              title={`${point.date}: ${point.value.toLocaleString()} ${metric}`}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels (show every nth label based on data length) */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {chartData.length > 0 && chartData[0] && (
          <>
            <span>{formatDate(chartData[0].date)}</span>
            {chartData.length > 1 && (
              <span>{formatDate(chartData[chartData.length - 1]?.date ?? '')}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Summary stat card for analytics
 */
export interface AnalyticsSummaryCardProps {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
}

export function AnalyticsSummaryCard({
  label,
  value,
  change,
  trend,
}: AnalyticsSummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              'text-xs',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Skeleton for analytics chart
 */
export function TemplateAnalyticsChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="flex items-end gap-1 h-32">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-t"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}
